// backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ExpenseModule } from './expense/expense.module';
import { ExpenseReportModule } from './expense-report/expense-report.module';
import { AdminModule } from './admin/admin.module';
import { BlobModule } from './blob/blob.module';
import { SettingsModule } from './settings/settings.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // --- Configuration Module ---
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // --- Database Connection for Application Data ---
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      // FIX: Provide a default value to satisfy TypeScript
      port: parseInt(process.env.POSTGRES_APP_PORT || '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_APP_DB,
      autoLoadEntities: true,
      synchronize: true, // DEV only, use migrations in prod
      name: 'default',
    }),

    // --- Database Connection for Blob Storage ---
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      // FIX: Provide a default value to satisfy TypeScript
      port: parseInt(process.env.POSTGRES_BLOB_PORT || '5433', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_BLOB_DB,
      autoLoadEntities: true,
      synchronize: true, // DEV only, use migrations in prod
      name: 'blob_db',
    }),

    // --- Feature Modules ---
    AuthModule,
    UserModule,
    ExpenseModule,
    ExpenseReportModule,
    AdminModule,
    BlobModule,
    SettingsModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
