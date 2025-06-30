// ==========================================================
// File: src/settings/settings.service.ts
// This is the complete and corrected version of the file.
// ==========================================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminSettings } from 'src/admin/entities/admin-settings.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(AdminSettings)
        private readonly settingsRepository: Repository<AdminSettings>
    ) {}

    async getPublicSettings(): Promise<Partial<AdminSettings>> {
        let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
        if (!settings) {
             settings = await this.settingsRepository.save({ 
                 id: 1, 
                 expense_types: ['General', 'Travel', 'Meals'], 
                 vat_rate: 0.15, 
                 inactivity_timeout_minutes: 30 
            });
        }
        
        // FIX: Return the properties with the correct snake_case names
        // as they exist on the AdminSettings entity.
        return { 
            expense_types: settings.expense_types,
            inactivity_timeout_minutes: settings.inactivity_timeout_minutes
        };
    }
}