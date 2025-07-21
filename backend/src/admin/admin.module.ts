// backend/src/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementRelationship } from 'src/user/entities/management-relationship.entity';
import { AdminSettings } from './entities/admin-settings.entity';
import { BlobModule } from 'src/blob/blob.module'; // Import BlobModule
import { Expense } from 'src/expense/entities/expense.entity'; // Import Expense entity

@Module({
  imports: [
    UserModule,
    BlobModule, // Add BlobModule to the imports array
    TypeOrmModule.forFeature([
        ManagementRelationship, 
        AdminSettings,
        Expense // Add the Expense entity here
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}