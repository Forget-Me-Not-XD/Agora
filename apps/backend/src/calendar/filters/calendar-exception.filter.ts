// ========== Imports: ==========
import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';

@Catch()
@Injectable()
export class CalendarExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(CalendarExceptionFilter.name);

    constructor(
        private readonly config: ConfigService,
        private readonly jwtService: JwtService,
    ) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const message = exception instanceof Error ? exception.message : 'Unknown calendar error';
        const stack = exception instanceof Error ? exception.stack : undefined;
        this.logger.error(`Calendar connection flow failed: ${message}`, stack);

        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        // Nie 'n sekuriteitsbeslissing nie -- net 'n beste-poging raaiskoot na watter
        // platform hierdie versoek begin het, sodat die foutboodskap ook op mobiel
        // land i.p.v. altyd op die webwerf. 'n Onverifieerbare/vervalste state
        // beteken bloot ons val terug op die webwerf, wat reeds die vorige gedrag was.
        const requestedPlatform = req.query?.platform;
        const decodedState = typeof req.query?.state === 'string'
            ? this.jwtService.decode<{ platform?: string }>(req.query.state)
            : null;
        const isMobile = requestedPlatform === 'mobile' || decodedState?.platform === 'mobile';

        if (isMobile) {
            const mobileScheme = this.config.get<string>('oauth.mobileScheme');
            res.redirect(`${mobileScheme}://calendar-callback?calendar=connection_failed`);
            return;
        }

        const frontendUrl = this.config.get<string>('frontendUrl');
        res.redirect(`${frontendUrl}/profile?calendar=connection_failed`);
    }
}
