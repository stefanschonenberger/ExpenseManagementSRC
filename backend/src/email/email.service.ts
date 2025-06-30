// src/email/email.service.ts
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
  ) {
    this.logger.log('EmailService initialized to use Microsoft Graph API.');
  }

  /**
   * Gets a valid OAuth2 access token for the Microsoft Graph API.
   * Uses the client credentials flow (server-to-server).
   * It will cache the token until it expires.
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiryTime) {
      this.logger.log('Returning cached Graph API access token.');
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
      
      // Explicitly check if the token is a non-empty string.
      if (typeof newAccessToken === 'string' && newAccessToken.length > 0) {
        this.accessToken = newAccessToken;
        // Set expiry to 60 seconds before it actually expires to be safe
        this.tokenExpiryTime = Date.now() + (response.data.expires_in - 60) * 1000;
        
        this.logger.log('Successfully fetched new Graph API access token.');
        return this.accessToken;
      } else {
        // This handles cases where the API call succeeds but returns an empty or invalid token.
        throw new Error('Received an invalid access token from Microsoft Graph.');
      }

    } catch (error) {
      this.logger.error('Failed to get Graph API access token.', error.response?.data || error.message);
      throw new Error('Could not authenticate with Microsoft Graph.');
    }
  }

  /**
   * Sends an email using the Microsoft Graph API /sendMail endpoint.
   * @param to The recipient's email address.
   * @param subject The email subject.
   * @param html The HTML body of the email.
   */
  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    const senderEmail = this.configService.get('O365_SENDER_EMAIL');
    const url = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

    const emailPayload = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
      saveToSentItems: 'true',
    };

    try {
      const token = await this.getAccessToken();
      this.logger.log(`Attempting to send email via Graph API to ${to} with subject "${subject}"`);

      await firstValueFrom(
        this.httpService.post(url, emailPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Email successfully sent to ${to} via Graph API.`);
    } catch (error) {
      this.logger.error(`Failed to send email via Graph API to ${to}.`, error.response?.data || error.message);
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
