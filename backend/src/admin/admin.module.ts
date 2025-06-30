// ==========================================================
// File: src/admin/admin.module.ts
// This is the most important fix. We add the 'exports' array.
// ==========================================================
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementRelationship } from 'src/user/entities/management-relationship.entity';
import { AdminSettings } from './entities/admin-settings.entity';

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([ManagementRelationship, AdminSettings])],
  controllers: [AdminController],
  providers: [AdminService],
  // FIX: Export AdminService so other modules (like ExpenseModule) can use it.
  exports: [AdminService],
})
export class AdminModule {}