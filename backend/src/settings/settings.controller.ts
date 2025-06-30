// ==========================================================
// File: src/settings/settings.controller.ts
// This is the complete and corrected version of the file.
// ==========================================================
import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    async getSettings() {
        const settings = await this.settingsService.getPublicSettings();
        
        // FIX: The API response should use consistent camelCase keys for the frontend.
        // We map from the backend's snake_case to the frontend's expected camelCase.
        return {
            expenseTypes: settings.expense_types,
            inactivityTimeoutMinutes: settings.inactivity_timeout_minutes,
        };
    }
}
