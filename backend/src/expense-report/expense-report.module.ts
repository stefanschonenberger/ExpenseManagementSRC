// backend/src/expense-report/expense-report.module.ts

import { Module } from '@nestjs/common';
import { ExpenseReportService } from './expense-report.service';
import { ExpenseReportController } from './expense-report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseReport } from './entities/expense-report.entity';
import { Expense } from 'src/expense/entities/expense.entity';
import { User } from 'src/user/entities/user.entity';
import { ManagementRelationship } from 'src/user/entities/management-relationship.entity';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    // TypeOrm entities used within this module
    TypeOrmModule.forFeature([
      ExpenseReport,
      Expense,
      User,
      ManagementRelationship,
    ]),
    // Import the EmailModule to make EmailService available for injection
    EmailModule, 
  ],
  controllers: [ExpenseReportController],
  providers: [ExpenseReportService],
})
export class ExpenseReportModule {}
