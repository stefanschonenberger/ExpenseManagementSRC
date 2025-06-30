// ==========================================================
// File: src/expense-report/expense-report.service.ts
// This is the complete service file with EmailService integration.
// ==========================================================
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
import { EmailService } from 'src/email/email.service'; // Import the EmailService

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
    private readonly emailService: EmailService, // Inject the EmailService
  ) {}

  /**
   * Cleans the report object to prevent sensitive user data from being exposed.
   * Only returns essential fields for user and approver.
   * @param report The full ExpenseReport entity.
   * @returns A cleaned ExpenseReport object.
   */
  private cleanReportResponse(report: ExpenseReport): ExpenseReport {
    const cleanUser = (user: User | null) => {
        if (!user) return null;
        // This creates a new object with only the allowed fields
        return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
        } as User;
    }
    // Create a clean report object, ensuring relations are also cleaned
    const cleanReport = {
        ...report,
        user: cleanUser(report.user),
        approver: cleanUser(report.approver),
        // Ensure expenses within the report don't contain circular references
        expenses: report.expenses ? report.expenses.map(expense => {
            const { report, user, ...cleanExpense } = expense;
            return cleanExpense;
        }) : []
    };
    return cleanReport as ExpenseReport;
  }

  async create(createDto: CreateExpenseReportDto, user: User): Promise<ExpenseReport> {
    // Find all expenses that belong to the user and are included in the DTO
    const expenses = await this.expenseRepository.find({
      where: { id: In(createDto.expense_ids), user: { id: user.id } },
    });

    // Validate that all specified expenses were found
    if (expenses.length !== createDto.expense_ids.length) {
      throw new BadRequestException('One or more expenses not found or do not belong to you.');
    }

    // Ensure all expenses are in 'DRAFT' status before adding to a report
    expenses.forEach((expense) => {
      if (expense.status !== ExpenseStatus.DRAFT) {
        throw new BadRequestException(`Expense "${expense.title}" is not in DRAFT status.`);
      }
    });

    // Create a new report entity
    const newReport = this.reportRepository.create({
      title: createDto.title,
      user: user,
      expenses: expenses,
      total_amount: expenses.reduce((sum, e) => sum + e.amount, 0),
      total_vat_amount: expenses.reduce((sum, e) => sum + e.vat_amount, 0),
    });

    // Save the new report
    const savedReport = await this.reportRepository.save(newReport);
    // Link the expenses to the newly created report
    await this.expenseRepository.update({ id: In(createDto.expense_ids) }, { report: savedReport });

    // Return the newly created report
    return this.findOneForUser(savedReport.id, user);
  }

  async findAllForUser(user: User): Promise<ExpenseReport[]> {
    const reports = await this.reportRepository.find({
      where: { user: { id: user.id } },
      relations: ['expenses', 'user', 'approver'],
      order: { created_at: 'DESC' },
    });
    return reports.map(report => this.cleanReportResponse(report));
  }

  async findOneForUser(id: string, user: User): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id, user: { id: user.id } },
      relations: ['expenses', 'user', 'approver'],
    });
    if (!report) {
      throw new NotFoundException(`Report with ID "${id}" not found.`);
    }
    return this.cleanReportResponse(report);
  }

  async update(id: string, updateDto: UpdateExpenseReportDto, user: User): Promise<ExpenseReport> {
    const report = await this.findOneForUser(id, user);
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException('Can only update reports in DRAFT status.');
    }
    Object.assign(report, updateDto);
    const savedReport = await this.reportRepository.save(report);
    return this.findOneForUser(savedReport.id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const report = await this.findOneForUser(id, user);
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException('Can only delete reports in DRAFT status.');
    }
    // Unlink expenses from the report before deleting it
    if (report.expenses && report.expenses.length > 0) {
      for (const expense of report.expenses) {
        expense.report = null;
        await this.expenseRepository.save(expense);
      }
    }
    await this.reportRepository.remove(report);
  }

  async submit(reportId: string, currentUser: User, submitDto: SubmitReportDto): Promise<ExpenseReport> {
    const report = await this.findOneForUser(reportId, currentUser);
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException(`Report is already in '${report.status}' status and cannot be submitted.`);
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

    // After successfully updating, trigger the email notification
    await this.emailService.sendSubmissionNotification(updatedReport, manager);

    const expenseIds = report.expenses.map((e) => e.id);
    if (expenseIds.length > 0) {
      await this.expenseRepository.update({ id: In(expenseIds) }, { status: ExpenseStatus.SUBMITTED });
    }

    // Important: We need to find the report again to return the fully populated object
    return this.findOneForUser(updatedReport.id, currentUser);
  }

  async findAllPendingForManager(manager: User): Promise<ExpenseReport[]> {
    const reports = await this.reportRepository.find({
      where: { approver: { id: manager.id }, status: ReportStatus.SUBMITTED },
      relations: ['user', 'expenses'],
      order: { submitted_at: 'ASC' },
    });
    return reports.map(report => this.cleanReportResponse(report));
  }

  async findOneForManagerApproval(reportId: string, manager: User): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, approver: { id: manager.id } },
      relations: ['user', 'expenses', 'approver'], // Ensure approver is loaded
    });
    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found or you are not the designated approver.`);
    }
    return this.cleanReportResponse(report);
  }

  async approve(reportId: string, manager: User): Promise<ExpenseReport> {
    // findReportAsManager already ensures the user is the approver and status is SUBMITTED
    const report = await this.findReportAsManager(reportId, manager);
    report.status = ReportStatus.APPROVED;
    report.decision_at = new Date();
    
    const savedReport = await this.reportRepository.save(report);
    await this.updateExpenseStatus(report.expenses, ExpenseStatus.COMPLETED);

    // After successfully approving, trigger the email notification
    await this.emailService.sendApprovalNotification(savedReport, savedReport.user);
    
    this.logger.log(`Report ${report.id} approved. Email notification sent.`);
    
    return this.findOneForUser(savedReport.id, savedReport.user);
  }

  async reject(reportId: string, manager: User, rejectDto: RejectReportDto): Promise<ExpenseReport> {
    const report = await this.findReportAsManager(reportId, manager);
    report.status = ReportStatus.DRAFT;
    report.decision_at = new Date();
    report.rejection_reason = rejectDto.reason;
    
    const savedReport = await this.reportRepository.save(report);
    await this.updateExpenseStatus(report.expenses, ExpenseStatus.DRAFT);
    
    // After successfully rejecting, trigger the email notification
    await this.emailService.sendRejectionNotification(savedReport, savedReport.user);
    
    this.logger.log(`Report ${report.id} rejected. Email notification sent.`);
    
    return this.findOneForUser(savedReport.id, savedReport.user);
  }
  
  /**
   * Finds a report ensuring the requester is the designated manager and the report is in SUBMITTED status.
   * Loads necessary relations for processing.
   * @param reportId The ID of the report.
   * @param manager The manager user entity.
   * @returns The fully loaded ExpenseReport entity.
   */
  private async findReportAsManager(reportId: string, manager: User): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, approver: { id: manager.id } },
      relations: ['expenses', 'user', 'approver'], // Ensure all needed relations are loaded
    });

    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found or you are not the designated approver.`);
    }

    if (report.status !== ReportStatus.SUBMITTED) {
      throw new ForbiddenException(`Can only approve/reject reports in 'SUBMITTED' status. This report is '${report.status}'.`);
    }

    return report;
  }
  
  /**
   * Helper method to update the status of multiple expenses at once.
   * @param expenses Array of Expense entities.
   * @param status The new status to set.
   */
  private async updateExpenseStatus(expenses: Expense[], status: ExpenseStatus): Promise<void> {
    if (expenses && expenses.length > 0) {
      const expenseIds = expenses.map(e => e.id);
      await this.expenseRepository.update({ id: In(expenseIds) }, { status });
    }
  }
  
  async findAllApprovedForUser(user: User): Promise<ExpenseReport[]> {
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
}
