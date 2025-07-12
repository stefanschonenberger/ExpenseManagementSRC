// backend/src/ocr/ocr.module.ts

import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
