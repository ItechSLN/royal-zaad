import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { CmsRepository } from './cms.repository';
import { CmsService } from './cms.service';

@Module({
  controllers: [CmsController],
  providers: [CmsService, CmsRepository],
  exports: [CmsService, CmsRepository],
})
export class CmsModule {}
