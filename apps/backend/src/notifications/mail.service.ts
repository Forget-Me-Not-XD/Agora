// ========== Imports: ==========
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { MailContent } from './templates/mail-content';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter<SMTPTransport.SentMessageInfo> | null;
    private readonly from: string;

    constructor(private readonly config: ConfigService) {
        this.from = this.config.get<string>('smtp.from')!;
        this.transporter = this.createTransporter();
    }

    async send(to: string, mail: MailContent): Promise<boolean> {
        if (!this.transporter) {
            this.logger.warn('E-pos oorgeslaan: SMTP is nie gekonfigureer nie');
            return false;
        }

        try {
            await this.transporter.sendMail({ from: this.from, to, ...mail });
            return true;
        } catch (err) {
            this.logger.error(`E-pos kon nie gestuur word nie: ${(err as Error).message}`);
            return false;
        }
    }

    private createTransporter(): Transporter<SMTPTransport.SentMessageInfo> | null {
        const host = this.config.get<string>('smtp.host');
        if (!host) {
            this.logger.warn('SMTP_HOST is nie gestel nie -- e-posse sal nie gestuur word nie');
            return null;
        }

        const port = this.config.get<number>('smtp.port')!;
        const user = this.config.get<string>('smtp.user');
        const pass = this.config.get<string>('smtp.pass');

        this.logger.log(`SMTP gekonfigureer via ${host}:${port}`);
        return createTransport({
            host,
            port,
            secure: port === 465,
            auth: user && pass ? { user, pass } : undefined,
            connectionTimeout: 10_000,
            socketTimeout: 20_000,
        });
    }
}
