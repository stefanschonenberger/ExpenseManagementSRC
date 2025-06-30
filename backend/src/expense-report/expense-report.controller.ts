// ==========================================================
// File: src/expense-report/expense-report.controller.ts
// This is the complete controller file with the new endpoint.
// ==========================================================
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
import { ExpenseReportService } from './expense-report.service';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Request } from 'express';
import { User } from 'src/user/entities/user.entity';
import { SubmitReportDto } from './dto/submit-report.dto';
import { RejectReportDto } from './dto/reject-report.dto';

@UseGuards(JwtAuthGuard)
@Controller('expense-report')
export class ExpenseReportController {
  constructor(private readonly expenseReportService: ExpenseReportService) {}

  @Post()
  create(@Body(new ValidationPipe()) createDto: CreateExpenseReportDto, @Req() req: Request) {
    const user = req.user as User;
    return this.expenseReportService.create(createDto, user);
  }

  @Get()
  findAllForUser(@Req() req: Request) {
    const user = req.user as User;
    return this.expenseReportService.findAllForUser(user);
  }
  
  @Get('approvals/pending')
  getPendingApprovals(@Req() req: Request) {
    const manager = req.user as User;
    return this.expenseReportService.findAllPendingForManager(manager);
  }
  
  @Get('analytics/approved')
  getApprovedForAnalytics(@Req() req: Request) {
    const user = req.user as User;
    return this.expenseReportService.findAllApprovedForUser(user);
  }

  @Get('approval/:id')
  findOneForManager(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const manager = req.user as User;
    return this.expenseReportService.findOneForManagerApproval(id, manager);
  }
  
  @Get(':id')
  findOneForUser(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const user = req.user as User;
    return this.expenseReportService.findOneForUser(id, user);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body(new ValidationPipe()) updateDto: UpdateExpenseReportDto, @Req() req: Request) {
    const user = req.user as User;
    return this.expenseReportService.update(id, updateDto, user);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const user = req.user as User;
    return this.expenseReportService.remove(id, user);
  }

  @Post(':id/submit')
  submit(@Param('id', new ParseUUIDPipe()) id: string, @Body(new ValidationPipe()) submitDto: SubmitReportDto, @Req() req: Request) {
    const user = req.user as User;
    return this.expenseReportService.submit(id, user, submitDto);
  }

  @Post(':id/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const manager = req.user as User;
    return this.expenseReportService.approve(id, manager);
  }

  @Post(':id/reject')
  reject(@Param('id', new ParseUUIDPipe()) id: string, @Body(new ValidationPipe()) rejectDto: RejectReportDto, @Req() req: Request) {
    const manager = req.user as User;
    return this.expenseReportService.reject(id, manager, rejectDto);
  }
}