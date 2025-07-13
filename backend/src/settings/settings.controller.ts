// backend/src/settings/settings.controller.ts

import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Public } from 'src/blob/blob.controller'; // Import the Public decorator

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Public() // Mark this route as public
    @Get()
    async getSettings() {
        const settings = await this.settingsService.getPublicSettings();
        
        // The API response should use consistent camelCase keys for the frontend.
        // We map from the backend's snake_case to the frontend's expected camelCase.
        return {
            expenseTypes: settings.expense_types,
            inactivityTimeoutMinutes: settings.inactivity_timeout_minutes,
        };
    }
}
