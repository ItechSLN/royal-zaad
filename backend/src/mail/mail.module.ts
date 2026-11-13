import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { OrderEmailsService } from './order-emails.service';

@Global()
@Module({
  providers: [MailService, OrderEmailsService],
  exports: [MailService, OrderEmailsService],
})
export class MailModule {}
