// ========== Imports: ==========
import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Catch()
@Injectable()
export class CalendarExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(CalendarExceptionFilter.name);

    constructor(private readonly config: ConfigService) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const message = exception instanceof Error ? exception.message : 'Unknown calendar error';
        const stack = exception instanceof Error ? exception.stack : undefined;
        this.logger.error(`Calendar connection flow failed: ${message}`, stack);

        const res = host.switchToHttp().getResponse<Response>();
        const frontendUrl = this.config.get<string>('frontendUrl');
        res.redirect(`${frontendUrl}/profile?calendar=connection_failed`);
    }
}
