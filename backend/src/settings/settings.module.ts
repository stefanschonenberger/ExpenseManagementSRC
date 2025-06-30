// ==========================================================
// File: src/settings/settings.module.ts
// ==========================================================
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettings } from 'src/admin/entities/admin-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSettings])],
  controllers: [SettingsController],
  providers: [SettingsService]
})
export class SettingsModule {}