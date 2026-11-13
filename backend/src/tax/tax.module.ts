import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxRepository } from './tax.repository';
import { TaxService } from './tax.service';

@Module({
  controllers: [TaxController],
  providers: [TaxService, TaxRepository],
  exports: [TaxService, TaxRepository],
})
export class TaxModule {}
