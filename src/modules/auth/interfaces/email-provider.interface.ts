export const EMAIL_PROVIDER_TOKEN =
  process.env.EMAIL_PROVIDER_TOKEN || 'EMAIL_PROVIDER';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailProvider {
  sendMail(options: SendMailOptions): Promise<void>;
}
