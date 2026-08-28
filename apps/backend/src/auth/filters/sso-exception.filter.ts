// ========== Imports: ==========
import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { SsoAccountNotFoundException } from '../exceptions/sso-account-not-found.exception';

@Catch()
@Injectable()
export class SsoExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(SsoExceptionFilter.name);

    constructor(private readonly config: ConfigService) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();
        const isMobile = req.originalUrl.includes('/mobile');
        const target = isMobile
            ? `${this.config.get<string>('oauth.mobileScheme')}://sso-callback`
            : `${this.config.get<string>('frontendUrl')}/login`;

        if (exception instanceof SsoAccountNotFoundException) {
            const params = new URLSearchParams({ error: 'sso_no_account', email: exception.email });
            res.redirect(`${target}?${params.toString()}`);
            return;
        }

        const message = exception instanceof Error ? exception.message : 'Unknown SSO error';
        const stack = exception instanceof Error ? exception.stack : undefined;
        this.logger.error(`SSO flow failed: ${message}`, stack);

        res.redirect(`${target}?error=sso_failed`);
    }
}
