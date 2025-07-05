import { Module } from '@nestjs/common';
import { ExpenseReportService } from './expense-report.service';
import { ExpenseReportController } from './expense-report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseReport } from './entities/expense-report.entity';
import { Expense } from 'src/expense/entities/expense.entity';
import { User } from 'src/user/entities/user.entity';
import { ManagementRelationship } from 'src/user/entities/management-relationship.entity';
import { EmailModule } from 'src/email/email.module';
import { PdfModule } from 'src/pdf/pdf.module';
import { BlobModule } from 'src/blob/blob.module';
import { AdminModule } from 'src/admin/admin.module'; // Import AdminModule

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpenseReport,
      Expense,
      User,
      ManagementRelationship,
    ]),
    EmailModule,
    PdfModule,
    BlobModule,
    AdminModule, // Add AdminModule here to make its exported providers available
  ],
  controllers: [ExpenseReportController],
  providers: [ExpenseReportService],
})
export class ExpenseReportModule {}
