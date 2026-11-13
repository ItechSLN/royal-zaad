import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/** Shared so any module that stores media can upload without re-providing it. */
@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
