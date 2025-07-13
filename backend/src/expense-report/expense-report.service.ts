// backend/src/expense-report/expense-report.service.ts

import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Expense, ExpenseStatus } from 'src/expense/entities/expense.entity';
import { User } from 'src/user/entities/user.entity';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';
import { ExpenseReport, ReportStatus } from './entities/expense-report.entity';
import { SubmitReportDto } from './dto/submit-report.dto';
import { ManagementRelationship } from 'src/user/entities/management-relationship.entity';
import { RejectReportDto } from './dto/reject-report.dto';
import { EmailService } from 'src/email/email.service';
import { PdfService } from 'src/pdf/pdf.service';
import { AdminService } from 'src/admin/admin.service';

@Injectable()
export class ExpenseReportService {
  private readonly logger = new Logger(ExpenseReportService.name);

  constructor(
    @InjectRepository(ExpenseReport)
    private readonly reportRepository: Repository<ExpenseReport>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ManagementRelationship)
    private readonly managementRepository: Repository<ManagementRelationship>,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
    private readonly adminService: AdminService,
  ) {}

  private cleanReportResponse(report: ExpenseReport): any {
    const cleanUser = (user: User | null) => {
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            roles: user.roles,
        };
    }

    const cleanExpenses = (expenses: Expense[] | undefined) => {
        if (!expenses) return [];
        return expenses.map(exp => ({
            id: exp.id,
            title: exp.title,
            description: exp.description,
            supplier: exp.supplier,
            expense_date: exp.expense_date,
            amount: exp.amount,
            currency_code: exp.currency_code,
            expense_type: exp.expense_type,
            book: exp.book,
            vat_applied: exp.vat_applied,
            vat_amount: exp.vat_amount,
            receipt_blob_id: exp.receipt_blob_id,
            status: exp.status,
            created_at: exp.created_at,
            updated_at: exp.updated_at
        }));
    }

    return {
        ...report,
        user: cleanUser(report.user),
        approver: cleanUser(report.approver),
        expenses: cleanExpenses(report.expenses),
    };
  }

  async create(createDto: CreateExpenseReportDto, user: User): Promise<any> {
    const expenses = await this.expenseRepository.find({
      where: { id: In(createDto.expense_ids), user: { id: user.id } },
    });

    if (expenses.length !== createDto.expense_ids.length) {
      throw new BadRequestException('One or more expenses not found or do not belong to you.');
    }

    expenses.forEach((expense) => {
      if (expense.status !== ExpenseStatus.DRAFT) {
        throw new BadRequestException(`Expense "${expense.title}" is not in DRAFT status.`);
      }
    });

    const newReport = this.reportRepository.create({
      title: createDto.title,
      user: user,
      expenses: expenses,
      total_amount: expenses.reduce((sum, e) => sum + e.amount, 0),
      total_vat_amount: expenses.reduce((sum, e) => sum + e.vat_amount, 0),
    });

    const savedReport = await this.reportRepository.save(newReport);
    await this.expenseRepository.update({ id: In(createDto.expense_ids) }, { report: savedReport });

    return this.findOneForUser(savedReport.id, user);
  }

  async findAllForUser(user: User): Promise<any[]> {
    const reports = await this.reportRepository.find({
      where: { user: { id: user.id } },
      relations: ['user', 'approver'],
      order: { created_at: 'DESC' },
    });
    return reports.map(report => this.cleanReportResponse(report));
  }

  async findOneForUser(id: string, user: User): Promise<any> {
    const report = await this.reportRepository.findOne({
      where: { id, user: { id: user.id } },
      relations: ['expenses', 'user', 'approver'],
    });
    if (!report) {
      throw new NotFoundException(`Report with ID "${id}" not found.`);
    }
    return this.cleanReportResponse(report);
  }

  async update(id: string, updateDto: UpdateExpenseReportDto, user: User): Promise<any> {
    const report = await this.reportRepository.findOneBy({ id, user: { id: user.id } });
    if (!report) throw new NotFoundException();
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException('Can only update reports in DRAFT status.');
    }
    Object.assign(report, updateDto);
    await this.reportRepository.save(report);
    return this.findOneForUser(report.id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const report = await this.reportRepository.findOne({ where: { id, user: { id: user.id } }, relations: ['expenses'] });
    if (!report) throw new NotFoundException();
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException('Can only delete reports in DRAFT status.');
    }
    if (report.expenses && report.expenses.length > 0) {
      await this.expenseRepository.update({ id: In(report.expenses.map(e => e.id)) }, { report: null });
    }
    await this.reportRepository.remove(report);
  }

  async submit(reportId: string, currentUser: User, submitDto: SubmitReportDto): Promise<any> {
    const report = await this.reportRepository.findOne({ where: { id: reportId, user: { id: currentUser.id } }, relations: ['user', 'expenses'] });
    if (!report) throw new NotFoundException();
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException(`Report is already in '${report.status}' status.`);
    }
    const manager = await this.userRepository.findOne({ where: { id: submitDto.manager_id } });
    if (!manager) {
      throw new BadRequestException(`Selected manager with ID "${submitDto.manager_id}" not found.`);
    }
    const relationship = await this.managementRepository.findOne({
      where: { employee_id: currentUser.id, manager_id: manager.id },
    });
    if (!relationship) {
      throw new ForbiddenException(`You are not authorized to submit reports to "${manager.full_name}".`);
    }

    report.status = ReportStatus.SUBMITTED;
    report.approver = manager;
    report.submitted_at = new Date();
    const updatedReport = await this.reportRepository.save(report);

    await this.emailService.sendSubmissionNotification(updatedReport, manager);

    if (report.expenses.length > 0) {
      await this.expenseRepository.update({ id: In(report.expenses.map((e) => e.id)) }, { status: ExpenseStatus.SUBMITTED });
    }

    return this.findOneForUser(updatedReport.id, currentUser);
  }

  async findAllPendingForManager(manager: User): Promise<any[]> {
    const reports = await this.reportRepository.find({
      where: { approver: { id: manager.id }, status: ReportStatus.SUBMITTED },
      relations: ['user'],
      order: { submitted_at: 'ASC' },
    });
    return reports.map(report => this.cleanReportResponse(report));
  }

  async findOneForManagerApproval(reportId: string, manager: User): Promise<any> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, approver: { id: manager.id } },
      relations: ['user', 'expenses', 'approver'],
    });
    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found or you are not the designated approver.`);
    }
    return this.cleanReportResponse(report);
  }

  private async findReportAsManager(reportId: string, manager: User): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, approver: { id: manager.id } },
      relations: ['expenses', 'user', 'approver'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found or you are not the designated approver.`);
    }

    if (report.status !== ReportStatus.SUBMITTED) {
      throw new ForbiddenException(`Can only approve/reject reports in 'SUBMITTED' status. This report is '${report.status}'.`);
    }
    return report;
  }

  private async updateExpenseStatus(expenses: Expense[], status: ExpenseStatus): Promise<void> {
    if (expenses && expenses.length > 0) {
      const expenseIds = expenses.map(e => e.id);
      await this.expenseRepository.update({ id: In(expenseIds) }, { status });
    }
  }

  async approve(reportId: string, manager: User): Promise<any> {
    const report = await this.findReportAsManager(reportId, manager);
    report.status = ReportStatus.APPROVED;
    report.decision_at = new Date();
    
    const savedReport = await this.reportRepository.save(report);
    await this.updateExpenseStatus(report.expenses, ExpenseStatus.COMPLETED);

    try {
      this.logger.log(`Generating PDF for approved report ${report.id}`);
      const pdfBuffer = await this.pdfService.generatePdf(report);
      
      this.logger.log(`Fetching settings to get finance email.`);
      const settings = await this.adminService.getSettings();
      
      this.logger.log(`Sending approval email with PDF to ${report.user.email} and finance (${settings.finance_email || 'not set'}).`);
      await this.emailService.sendApprovalEmailWithPdf(savedReport, savedReport.user, settings.finance_email, pdfBuffer);

    } catch (error) {
      this.logger.error(`Failed to generate or email PDF for report ${report.id}`, error);
    }
    
    return this.findOneForUser(savedReport.id, savedReport.user);
  }

  async reject(reportId: string, manager: User, rejectDto: RejectReportDto): Promise<any> {
    const report = await this.findReportAsManager(reportId, manager);
    report.status = ReportStatus.DRAFT;
    report.rejection_reason = rejectDto.reason;
    
    const savedReport = await this.reportRepository.save(report);
    await this.updateExpenseStatus(report.expenses, ExpenseStatus.DRAFT);
    
    await this.emailService.sendRejectionNotification(savedReport, savedReport.user);
    this.logger.log(`Report ${reportId} rejected. Email notification sent.`);
    
    return this.findOneForUser(savedReport.id, savedReport.user);
  }
  
  async findAllApprovedForUser(user: User): Promise<any[]> {
    const reports = await this.reportRepository.find({
      where: { 
        user: { id: user.id },
        status: ReportStatus.APPROVED,
      },
      relations: ['user', 'approver'],
      order: { decision_at: 'ASC' },
    });
    return reports.map(report => this.cleanReportResponse(report));
  }

  async generateReportPdf(reportId: string, user: User): Promise<Buffer> {
    this.logger.log(`PDF generation requested for report ${reportId} by user ${user.email}`);
    const report = await this.reportRepository.findOne({
        where: { id: reportId, user: { id: user.id } },
        relations: ['expenses', 'user', 'approver'],
    });

    if (!report) {
        throw new NotFoundException(`Report with ID "${reportId}" not found.`);
    }

    if (report.status !== ReportStatus.APPROVED) {
      throw new ForbiddenException('PDFs can only be generated for approved reports.');
    }
    
    return this.pdfService.generatePdf(report);
  }
}
