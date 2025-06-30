// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ExpenseReport } from 'src/expense-report/entities/expense-report.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const tenantId = this.configService.get('O365_TENANT_ID');
    const senderEmail = this.configService.get('O365_SENDER_EMAIL');

    this.transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false, // TLS requires secure:false for port 587
      auth: {
        type: 'OAuth2',
        user: senderEmail,
        clientId: this.configService.get('O365_CLIENT_ID'),
        clientSecret: this.configService.get('O365_CLIENT_SECRET'),
        refreshToken: this.configService.get('O365_REFRESH_TOKEN'),
        // --- Added Tenant-Specific Token URL ---
        // This directs the OAuth2 request to your specific organization's
        // authentication endpoint, which is often required.
        accessUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        // ----------------------------------------
      },
      // --- Tracing Options ---
      logger: true, 
      debug: true, 
    });

    this.logger.log('EmailService initialized with Nodemailer transporter for Office 365.');
  }

  private async sendMail(to: string, subject: string, html: string) {
    const mailOptions = {
        from: this.configService.get('O365_SENDER_EMAIL'),
        to,
        subject,
        html,
    };

    try {
      this.logger.log(`Attempting to send email to ${to} with subject "${subject}"`);
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log('Email sent successfully!');
      this.logger.debug('Nodemailer transport response: ' + info.response);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}. See debug logs above for details.`, error.stack);
      // throw error; 
    }
  }

  async sendSubmissionNotification(report: ExpenseReport, manager: User) {
    const subject = `Expense Report Submitted for Your Approval: ${report.title}`;
    const html = `<p>Hello ${manager.full_name},</p>
                  <p>${report.user.full_name} has submitted an expense report titled "<b>${report.title}</b>" for your approval.</p>
                  <p>Please log in to the ExpenseBeast system to review it.</p>`;
    await this.sendMail(manager.email, subject, html);
  }

  async sendApprovalNotification(report: ExpenseReport, employee: User) {
    const subject = `Expense Report Approved: ${report.title}`;
    const html = `<p>Hello ${employee.full_name},</p>
                  <p>Your expense report titled "<b>${report.title}</b>" has been approved by ${report.approver.full_name}.</p>
                  <p>Payment will be processed by the finance department.</p>`;
    await this.sendMail(employee.email, subject, html);
  }

  async sendRejectionNotification(report: ExpenseReport, employee: User) {
    const subject = `Expense Report Action Required: ${report.title}`;
    const html = `<p>Hello ${employee.full_name},</p>
                  <p>Your expense report titled "<b>${report.title}</b>" was returned by ${report.approver.full_name}.</p>
                  <p><b>Reason:</b> ${report.rejection_reason}</p>
                  <p>Please log in to the ExpenseBeast system to make the necessary changes and resubmit.</p>`;
    await this.sendMail(employee.email, subject, html);
  }
}