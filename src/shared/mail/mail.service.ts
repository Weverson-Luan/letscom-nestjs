import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { EmailParams, MailerSend, Recipient, Sender, Attachment } from 'mailersend';
import { join } from 'path';

export interface SendMailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; contentBase64: string }[];
}

/**
 * Serviço de e-mail via MailerSend (espelha o uso direto do SDK em
 * PasswordResetService e LiberacaoRemessaBalcaoEmailService no Laravel).
 * Renderiza templates Handlebars a partir de src/shared/mail/templates.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailer: MailerSend;
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(private readonly config: ConfigService) {
    this.mailer = new MailerSend({
      apiKey: this.config.get<string>('mail.mailersendApiKey') ?? '',
    });
  }

  render(template: string, context: Record<string, unknown>): string {
    let compiled = this.templateCache.get(template);
    if (!compiled) {
      const filePath = join(__dirname, 'templates', `${template}.hbs`);
      const source = fs.readFileSync(filePath, 'utf-8');
      compiled = Handlebars.compile(source);
      this.templateCache.set(template, compiled);
    }
    return compiled(context);
  }

  async send(options: SendMailOptions): Promise<void> {
    const fromAddress = this.config.get<string>('mail.fromAddress') ?? '';
    const fromName = this.config.get<string>('mail.fromName') ?? 'Letscom';

    const sentFrom = new Sender(fromAddress, fromName);
    const recipients = [new Recipient(options.to, options.toName ?? options.to)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(options.subject)
      .setHtml(options.html);

    if (options.text) {
      emailParams.setText(options.text);
    }

    if (options.attachments?.length) {
      emailParams.setAttachments(
        options.attachments.map(
          (a) => new Attachment(a.contentBase64, a.filename, 'attachment'),
        ),
      );
    }

    await this.mailer.email.send(emailParams);
    this.logger.log(`E-mail "${options.subject}" enviado para ${options.to}`);
  }
}
