// backend/src/blob/blob.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blob } from './blob.entity';
import { BlobService } from './blob.service';
import { BlobController } from './blob.controller';
import { OcrModule } from 'src/ocr/ocr.module'; // Import the OcrModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Blob], 'blob_db'),
    OcrModule, // Add OcrModule here so BlobModule knows about OcrService
  ],
  providers: [BlobService],
  controllers: [BlobController],
  exports: [BlobService],
})
export class BlobModule {}
