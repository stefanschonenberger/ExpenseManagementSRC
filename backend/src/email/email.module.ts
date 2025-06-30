// src/email/email.module.ts
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    HttpModule // <-- Add HttpModule to make HttpService available
  ],
  providers: [EmailService],
  exports: [EmailService], // Export the service so other modules can use it
})
export class EmailModule {}
