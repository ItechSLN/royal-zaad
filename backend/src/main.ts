import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import {
  BadRequestException,
  Logger,
  ValidationPipe,
  VersioningType,
  type ValidationError,
} from '@nestjs/common';

/** Refuse to start a production server that would run with unsafe defaults. */
function assertProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 32 || secret === 'default_secret_key') {
    throw new Error('JWT_SECRET must be set to a random string of 32+ characters in production');
  }
}

const requestLogger = new Logger('HTTP');

async function bootstrap() {
  assertProductionConfig();

  // rawBody: Stripe webhook signatures are computed over the exact bytes sent.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // One structured line per request (JSON in production, for log shippers),
  // tagged with a request id the client can quote; health probes are skipped.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/health')) return next();
    const started = process.hrtime.bigint();
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      const entry = {
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        msg: 'request',
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ms: Number((process.hrtime.bigint() - started) / 1_000_000n),
      };
      if (process.env.NODE_ENV === 'production') {
        process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
      } else if (entry.level !== 'info') {
        requestLogger.warn(`${entry.method} ${entry.path} → ${entry.status} (${entry.ms} ms) [${requestId}]`);
      }
    });
    next();
  });

  // Behind a load balancer / reverse proxy, rate limiting must see the real
  // client IP. Set TRUST_PROXY to the number of proxy hops (usually 1).
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  }
  app.useGlobalPipes(
    new ValidationPipe({ 
      whitelist: true, 
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const formattedErrors: Record<string, string> = {};

        // Nested DTOs (e.g. an order's `items`) report under `children`;
        // flatten them to dotted keys such as `items.0.quantity`.
        const collect = (list: ValidationError[], prefix = '') => {
          for (const error of list) {
            const key = prefix ? `${prefix}.${error.property}` : error.property;
            if (error.constraints) {
              formattedErrors[key] = Object.values(error.constraints)[0];
            }
            if (error.children?.length) collect(error.children, key);
          }
        };
        collect(errors);

        return new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Production only accepts the storefront's own origin(s); development stays open.
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim());
  if (process.env.NODE_ENV === 'production' && !corsOrigins?.length) {
    throw new Error('CORS_ORIGINS must be set in production');
  }

  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization, Stripe-Signature',
  });

  const config = new DocumentBuilder()
    .setTitle('Ecom Market API')
    .setDescription('API documentation for Ecom Market')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
