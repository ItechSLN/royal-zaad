import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** The subset of Prisma's error metadata this filter reads. */
type PrismaErrorMeta = {
  target?: string[] | string;
  cause?: string;
  driverAdapterError?: {
    cause?: {
      originalMessage?: string;
      constraint?: { fields?: string[]; field?: string };
    };
  };
};

/**
 * Translates Prisma's error codes into the same response shape the validation
 * pipe produces, so a unique-constraint clash reads as a field error instead of
 * an opaque 500.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  /**
   * Locates the offending column. The driver adapter nests it under
   * `driverAdapterError`; the engine reports it as `meta.target`; some errors
   * only carry the constraint name (`Warehouse_code_key`).
   */
  private offendingField(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    const meta = (exception.meta ?? {}) as PrismaErrorMeta;
    const constraint = meta.driverAdapterError?.cause?.constraint;
    const adapterFields = constraint?.fields ?? constraint?.field;

    // Compound keys list their scope first — (shopId, sku), (customerId,
    // idempotencyKey) — so the field the user actually typed is the last one.
    const unquote = (field: unknown) => String(field).replace(/^"|"$/g, '');
    if (Array.isArray(adapterFields) && adapterFields.length) {
      return unquote(adapterFields[adapterFields.length - 1]);
    }
    if (typeof adapterFields === 'string') return unquote(adapterFields);

    const target = meta.target ?? [];
    const raw = Array.isArray(target) ? unquote(target[target.length - 1] ?? '') : String(target);
    if (!raw) {
      const original = meta.driverAdapterError?.cause?.originalMessage ?? '';
      const match = /"[A-Za-z]+_(.+)_key"/.exec(original);
      if (match) return match[1];
    }

    return /_.+_key$/.test(raw)
      ? raw.replace(/^[^_]+_/, '').replace(/_key$/, '')
      : raw;
  }

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const field = this.offendingField(exception);

    switch (exception.code) {
      // Unique constraint failed.
      case 'P2002':
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          errors: {
            [field || 'value']:
              `A record with this ${field || 'value'} already exists`,
          },
        });

      // Foreign key constraint failed.
      case 'P2003':
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          errors: {
            [field || 'reference']:
              'The referenced record does not exist, or is still in use',
          },
        });

      // Record required by the operation was not found.
      case 'P2025':
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message:
            (exception.meta as PrismaErrorMeta | undefined)?.cause ??
            'The record was not found.',
        });

      // Required field missing.
      case 'P2011':
      case 'P2012':
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          errors: { [field || 'value']: 'This field is required' },
        });

      default:
        this.logger.error(
          `Unhandled Prisma error ${exception.code}: ${exception.message}`,
        );
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        });
    }
  }
}
