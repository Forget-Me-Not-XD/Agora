// ========== Imports: ==========
import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { SsoAccountNotFoundException } from '../exceptions/sso-account-not-found.exception';

@Catch()
@Injectable()
export class SsoExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(SsoExceptionFilter.name);

    constructor(private readonly config: ConfigService) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const res = host.switchToHttp().getResponse<Response>();
        const frontendUrl = this.config.get<string>('frontendUrl');

        if (exception instanceof SsoAccountNotFoundException) {
            const params = new URLSearchParams({ error: 'sso_no_account', email: exception.email });
            res.redirect(`${frontendUrl}/login?${params.toString()}`);
            return;
        }

        const message = exception instanceof Error ? exception.message : 'Unknown SSO error';
        const stack = exception instanceof Error ? exception.stack : undefined;
        this.logger.error(`SSO flow failed: ${message}`, stack);

        res.redirect(`${frontendUrl}/login?error=sso_failed`);
    }
}
