// backend/src/expense/expense.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseStatus } from './entities/expense.entity';
import { User } from 'src/user/entities/user.entity';
import { BlobService } from 'src/blob/blob.service';
import { AdminService } from 'src/admin/admin.service';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly blobService: BlobService,
    private readonly adminService: AdminService,
  ) {}

  async create(
    createExpenseDto: CreateExpenseDto,
    user: User,
  ): Promise<Expense> {
    const newExpense = this.expenseRepository.create({
      ...createExpenseDto,
      user: user,
    });

    if (newExpense.vat_applied) {
      if (createExpenseDto.vat_amount !== undefined) {
        newExpense.vat_amount = createExpenseDto.vat_amount;
      } else {
        const settings = await this.adminService.getSettings();
        newExpense.vat_amount = Math.round(newExpense.amount * Number(settings.vat_rate));
      }
    } else {
      newExpense.vat_amount = 0;
    }

    return this.expenseRepository.save(newExpense);
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
    user: User,
  ): Promise<Expense> {
    const expense = await this.findOne(id, user);

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new ForbiddenException(
        `Cannot update expense in '${expense.status}' status.`,
      );
    }

    Object.assign(expense, updateExpenseDto);

    if (updateExpenseDto.amount !== undefined || updateExpenseDto.vat_applied !== undefined) {
      if (expense.vat_applied) {
        if (updateExpenseDto.vat_amount !== undefined) {
            expense.vat_amount = updateExpenseDto.vat_amount;
        } else {
            const settings = await this.adminService.getSettings();
            expense.vat_amount = Math.round(expense.amount * Number(settings.vat_rate));
        }
      } else {
        expense.vat_amount = 0;
      }
    }

    return this.expenseRepository.save(expense);
  }

  async findOne(id: string, user: User): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" not found.`);
    }

    return expense;
  }

  async remove(id: string, user: User): Promise<void> {
    const expense = await this.findOne(id, user);

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new ForbiddenException(
        `Cannot delete expense in '${expense.status}' status.`,
      );
    }

    if (expense.receipt_blob_id) {
        await this.blobService.deleteBlob(expense.receipt_blob_id);
    }

    await this.expenseRepository.remove(expense);
  }

  findAllForUser(user: User): Promise<Expense[]> {
    return this.expenseRepository.find({
        where: { user: { id: user.id } },
        order: { expense_date: 'DESC' },
    });
  }
}
