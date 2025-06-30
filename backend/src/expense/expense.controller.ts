// backend/src/expense/expense.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Request } from 'express';
import { User } from 'src/user/entities/user.entity';

// Protect the entire controller with the JWT Guard
@UseGuards(JwtAuthGuard)
@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(
    @Body(new ValidationPipe()) createExpenseDto: CreateExpenseDto,
    @Req() req: Request,
  ) {
    // Extract the user object that the JwtAuthGuard attached to the request
    const user = req.user as User;
    return this.expenseService.create(createExpenseDto, user);
  }

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as User;
    // FIX: The method is named findAllForUser, not findAll
    return this.expenseService.findAllForUser(user);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string, // Use ParseUUIDPipe to validate the ID format
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.expenseService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) updateExpenseDto: UpdateExpenseDto,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.expenseService.update(id, updateExpenseDto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.expenseService.remove(id, user);
  }
}
