import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

type Tx = Prisma.TransactionClient;

/** Records marketplace admin actions in the audit trail (AuditEvent). */
@Injectable()
export class MarketplaceAuditService {
  private readonly logger = new Logger(MarketplaceAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    actor: string,
    action: string,
    entity: string,
    entityId: string,
    meta?: Record<string, unknown>,
    tx?: Tx,
  ) {
    const client = tx ?? this.prisma;
    try {
      await client.auditEvent.create({
        data: {
          actor,
          action,
          entity,
          entityId,
          meta: meta ? JSON.stringify(meta) : null,
        },
      });
    } catch (error) {
      // Inside a transaction the failure must propagate; outside, the action
      // already happened and must not be reported as failed.
      if (tx) throw error;
      this.logger.error(`Audit ${action} ${entity}/${entityId} not recorded: ${(error as Error).message}`);
    }
  }
}

/** Emails a vendor about a decision on their account or products. Never throws. */
@Injectable()
export class VendorMailService {
  constructor(private readonly mail: MailService) {}

  send(
    to: string | null | undefined,
    subject: string,
    paragraphs: string[],
    cta?: { label: string; path: string },
  ) {
    if (!to) return;
    const { html, text } = this.mail.layout(
      subject,
      paragraphs,
      cta ? { label: cta.label, url: this.mail.appUrl(cta.path) } : undefined,
    );
    void this.mail.send({ to, subject, html, text }).catch(() => undefined);
  }
}

export const toNumber = (value: Prisma.Decimal | number | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value);

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const pageMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});
