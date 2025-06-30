// ==========================================================
// File: src/expense/expense.module.ts
// This file correctly imports the AdminModule.
// ==========================================================
import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { BlobModule } from 'src/blob/blob.module';
import { AdminModule } from 'src/admin/admin.module'; // Import AdminModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense]),
    BlobModule,
    AdminModule, // This import is correct and now works because AdminModule exports AdminService
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}