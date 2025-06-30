// src/blob/blob.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blob } from './blob.entity';
import { BlobService } from './blob.service';
import { BlobController } from './blob.controller';

@Module({
  // Use the named connection 'blob_db' we created in app.module.ts
  imports: [TypeOrmModule.forFeature([Blob], 'blob_db')],
  providers: [BlobService],
  // Export BlobService so other modules can use it
  exports: [BlobService],
  controllers: [BlobController],
})
export class BlobModule {}