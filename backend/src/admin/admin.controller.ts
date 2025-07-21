// ==========================================================
// File: src/admin/admin.controller.ts
// This is the complete and correct controller file.
// ==========================================================
import { Controller, Get, Post, Delete, UseGuards, Body, Param, ParseUUIDPipe, Put, Patch, ValidationPipe } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { UserRole } from 'src/user/entities/user.entity';
import { AdminService } from './admin.service';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { AdminSettings } from './entities/admin-settings.entity';
import { AdminResetPasswordDto } from 'src/user/dto/admin-reset-password.dto';

class CreateRelationshipDto { @IsUUID() @IsNotEmpty() employeeId: string; @IsUUID() @IsNotEmpty() managerId: string; }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    // User endpoints
    @Get('users')
    getAllUsers() { return this.adminService.findAllUsers(); }
    @Post('users')
    createUser(@Body(new ValidationPipe()) createUserDto: CreateUserDto) { return this.adminService.createUser(createUserDto); }
    @Patch('users/:id')
    updateUser(@Param('id', new ParseUUIDPipe()) id: string, @Body(new ValidationPipe()) updateUserDto: UpdateUserDto) { return this.adminService.updateUser(id, updateUserDto); }
    @Delete('users/:id')
    deleteUser(@Param('id', new ParseUUIDPipe()) id: string) { return this.adminService.deleteUser(id); }
	@Post('users/:id/reset-password')
    resetUserPassword(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body(new ValidationPipe()) resetPasswordDto: AdminResetPasswordDto
    ) {
        return this.adminService.adminResetPassword(id, resetPasswordDto);
    }

    // Relationship endpoints
    @Get('relationships')
    getAllRelationships() { 
        return this.adminService.findAllRelationships(); 
    }
    @Post('relationships')
    createRelationship(@Body(new ValidationPipe()) body: CreateRelationshipDto) { return this.adminService.createRelationship(body.employeeId, body.managerId); }
    @Delete('relationships/:employeeId/:managerId')
    deleteRelationship(@Param('employeeId', new ParseUUIDPipe()) employeeId: string, @Param('managerId', new ParseUUIDPipe()) managerId: string) { return this.adminService.deleteRelationship(employeeId, managerId); }

    // Settings endpoints
    @Get('settings')
    getSettings() { return this.adminService.getSettings(); }
    @Put('settings')
    updateSettings(@Body() settingsDto: Partial<AdminSettings>) { return this.adminService.updateSettings(settingsDto); }
	
	@Post('blobs/cleanup')
    cleanupOrphanedBlobs() {
        return this.adminService.cleanupOrphanedBlobs();
    }
}