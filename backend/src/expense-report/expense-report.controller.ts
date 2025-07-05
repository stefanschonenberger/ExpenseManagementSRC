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
  Res,
} from '@nestjs/common';
import { ExpenseReportService } from './expense-report.service';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Request, Response } from 'express';
import { User } from 'src/user/entities/user.entity';
import { SubmitReportDto } from './dto/submit-report.dto';
import { RejectReportDto } from './dto/reject-report.dto';

@UseGuards(JwtAuthGuard)
@Controller('expense-report')
export class ExpenseReportController {
  constructor(private readonly expenseReportService: ExpenseReportService) {}

  @Post()
  create(@Body(new ValidationPipe()) createDto: CreateExpenseReportDto, @Req() req: Request) {
    return this.expenseReportService.create(createDto, req.user as User);
  }

  @Get()
  findAllForUser(@Req() req: Request) {
    return this.expenseReportService.findAllForUser(req.user as User);
  }
  
  @Get('approvals/pending')
  getPendingApprovals(@Req() req: Request) {
    return this.expenseReportService.findAllPendingForManager(req.user as User);
  }
  
  @Get('analytics/approved')
  getApprovedForAnalytics(@Req() req: Request) {
    return this.expenseReportService.findAllApprovedForUser(req.user as User);
  }

  @Get('approval/:id')
  findOneForManager(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.expenseReportService.findOneForManagerApproval(id, req.user as User);
  }
  
  @Get(':id/pdf')
  async downloadReportPdf(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as User;
    const pdfBuffer = await this.expenseReportService.generateReportPdf(id, user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Opiatech-Report-${id}.pdf"`);
    res.send(pdfBuffer);
  }

  @Get(':id')
  findOneForUser(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.expenseReportService.findOneForUser(id, req.user as User);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body(new ValidationPipe()) updateDto: UpdateExpenseReportDto, @Req() req: Request) {
    return this.expenseReportService.update(id, updateDto, req.user as User);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.expenseReportService.remove(id, req.user as User);
  }

  @Post(':id/submit')
  submit(@Param('id', new ParseUUIDPipe()) id: string, @Body(new ValidationPipe()) submitDto: SubmitReportDto, @Req() req: Request) {
    return this.expenseReportService.submit(id, req.user as User, submitDto);
  }

  @Post(':id/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.expenseReportService.approve(id, req.user as User);
  }

  @Post(':id/reject')
  reject(@Param('id', new ParseUUIDPipe()) id: string, @Body(new ValidationPipe()) rejectDto: RejectReportDto, @Req() req: Request) {
    return this.expenseReportService.reject(id, req.user as User, rejectDto);
  }
}
