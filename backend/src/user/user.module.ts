// backend/src/user/user.module.ts

import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ManagementRelationship } from './entities/management-relationship.entity';
import { Expense } from 'src/expense/entities/expense.entity';
import { ExpenseReport } from 'src/expense-report/entities/expense-report.entity';
import { BlobModule } from 'src/blob/blob.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, 
      ManagementRelationship, 
      Expense, 
      ExpenseReport
    ]),
    BlobModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}