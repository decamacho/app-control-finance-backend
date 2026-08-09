import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '@sendgrid/mail';
import {
  IEmailProvider,
  SendMailOptions,
} from '../../interfaces/email-provider.interface';

@Injectable()
export class SendgridProvider implements IEmailProvider {
  private readonly logger = new Logger(SendgridProvider.name);
  private readonly mailService: MailService;

  constructor(private readonly configService: ConfigService) {
    this.mailService = new MailService();

    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      this.mailService.setApiKey(apiKey);
    } else {
      this.logger.warn(
        'SENDGRID_API_KEY not configured. Emails will not be sent.',
      );
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@walletai.app',
    );

    if (!this.configService.get<string>('SENDGRID_API_KEY')) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }

    await this.mailService.send({
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      html: options.html,
    });

    this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
  }
}
