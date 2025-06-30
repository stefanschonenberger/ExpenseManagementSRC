// ==========================================================
// File: src/admin/admin.service.ts
// This is the complete and correct service file.
// ==========================================================
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ManagementRelationship } from 'src/user/entities/management-relationship.entity';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';
import { AdminSettings } from './entities/admin-settings.entity';
import { AdminResetPasswordDto } from 'src/user/dto/admin-reset-password.dto';
import { User } from 'src/user/entities/user.entity';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';

@Injectable()
export class AdminService {
    constructor(
        private readonly userService: UserService,
        @InjectRepository(ManagementRelationship)
        private readonly managementRepository: Repository<ManagementRelationship>,
        @InjectRepository(AdminSettings)
        private readonly settingsRepository: Repository<AdminSettings>
    ) {}

    // User Management Methods
    findAllUsers(): Promise<User[]> { return this.userService.findAll(); }
    createUser(dto: CreateUserDto): Promise<User> { return this.userService.create(dto); }
    updateUser(id: string, dto: UpdateUserDto): Promise<User> { return this.userService.update(id, dto); }
    deleteUser(id: string): Promise<void> { return this.userService.remove(id); }
    adminResetPassword(id: string, dto: AdminResetPasswordDto): Promise<void> {
        return this.userService.adminResetPassword(id, dto.newPassword);
    }

    // Relationship Management Methods
    findAllRelationships(): Promise<ManagementRelationship[]> {
        return this.managementRepository.find({ relations: ['employee', 'manager'] });
    }

    async createRelationship(employeeId: string, managerId: string): Promise<ManagementRelationship> {
        if (employeeId === managerId) {
            throw new ConflictException('A user cannot manage themselves.');
        }
        const existing = await this.managementRepository.findOne({
            where: { employee_id: employeeId, manager_id: managerId }
        });
        if (existing) {
            throw new ConflictException('This management relationship already exists.');
        }
        const newRelationship = this.managementRepository.create({
            employee_id: employeeId,
            manager_id: managerId
        });
        return this.managementRepository.save(newRelationship);
    }

    async deleteRelationship(employeeId: string, managerId: string): Promise<void> {
        const result = await this.managementRepository.delete({
            employee_id: employeeId,
            manager_id: managerId
        });
        if (result.affected === 0) {
            throw new NotFoundException('Management relationship not found.');
        }
    }

    // Settings Management Methods
    async getSettings(): Promise<AdminSettings> {
        let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = await this.settingsRepository.save({ id: 1, expense_types: ['General', 'Travel', 'Meals'], vat_rate: 0.15, inactivity_timeout_minutes: 30 });
        }
        return settings;
    }

    async updateSettings(dto: Partial<AdminSettings>): Promise<AdminSettings> {
        const settings = await this.getSettings();
        Object.assign(settings, dto);
        return this.settingsRepository.save(settings);
    }
}