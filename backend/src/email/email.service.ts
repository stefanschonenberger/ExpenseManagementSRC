// backend/src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExpenseReport } from 'src/expense-report/entities/expense-report.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }
    this.logger.log('Fetching new Graph API access token...');
    const tenantId = this.configService.get('O365_TENANT_ID');
    const clientId = this.configService.get('O365_CLIENT_ID');
    const clientSecret = this.configService.get('O365_CLIENT_SECRET');
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');
    try {
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      const newAccessToken = response.data.access_token;
      
      if (typeof newAccessToken !== 'string' || !newAccessToken) {
        throw new Error('Received invalid or empty access token from Microsoft Graph.');
      }

      this.accessToken = newAccessToken;
      this.tokenExpiryTime = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Graph API access token.', error.response?.data || error.message);
      throw new Error('Could not authenticate with Microsoft Graph.');
    }
  }

  private async sendMail(to: string[], subject: string, html: string, attachment?: { content: Buffer, filename: string, contentType: string }): Promise<void> {
    const senderEmail = this.configService.get('O365_SENDER_EMAIL');
    if (!senderEmail) {
      this.logger.error('O365_SENDER_EMAIL is not configured. Cannot send email.');
      return;
    }
    const url = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

    const emailPayload: any = {
      message: {
        subject: subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: to.map(address => ({ emailAddress: { address } })),
      },
      saveToSentItems: 'true',
    };

    if (attachment) {
      emailPayload.message.attachments = [
        {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachment.filename,
          contentType: attachment.contentType,
          contentBytes: attachment.content.toString('base64'),
        },
      ];
    }

    try {
      const token = await this.getAccessToken();
      this.logger.log(`Attempting to send email to ${to.join(', ')} with subject "${subject}"`);
      await firstValueFrom(
        this.httpService.post(url, emailPayload, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
      );
      this.logger.log(`Email successfully sent to ${to.join(', ')}.`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to.join(', ')}.`, error.response?.data?.error?.message || error.message);
    }
  }

  async sendSubmissionNotification(report: ExpenseReport, manager: User) {
    const subject = `Expense Report Submitted for Your Approval: ${report.title}`;
    const html = `<p>Hello ${manager.full_name},</p><p>${report.user.full_name} has submitted an expense report titled "<b>${report.title}</b>" for your approval.</p><p>Please log in to the Expense Management System to review it.</p>`;
    await this.sendMail([manager.email], subject, html);
  }

  async sendApprovalEmailWithPdf(report: ExpenseReport, employee: User, financeEmail: string | null, pdfBuffer: Buffer) {
    const approverName = report.approver ? report.approver.full_name : 'a manager';
    const subject = `Expense Report Approved: ${report.title}`;
    const html = `<p>Hello,</p><p>The expense report "<b>${report.title}</b>" submitted by ${employee.full_name} has been approved by ${approverName}.</p><p>The PDF summary is attached for your records.</p><p>Payment will be processed by the finance department.</p>`;
    
    const recipients = [employee.email];
    if (financeEmail) {
      recipients.push(financeEmail);
    }

    await this.sendMail(recipients, subject, html, {
      content: pdfBuffer,
      filename: `Report-${report.id}.pdf`,
      contentType: 'application/pdf',
    });
  }

  async sendRejectionNotification(report: ExpenseReport, employee: User, manager: User) {
    const subject = `Expense Report Action Required: ${report.title}`;
    const html = `<p>Hello ${employee.full_name},</p><p>Your expense report titled "<b>${report.title}</b>" was returned by ${manager.full_name}.</p><p><b>Reason:</b> ${report.rejection_reason}</p><p>Please log in to the Expense Management System to make the necessary changes and resubmit.</p>`;
    await this.sendMail([employee.email], subject, html);
  }
}