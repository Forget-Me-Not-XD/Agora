// ========== Imports: ==========
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const config = app.get(ConfigService);

    // ========== Security headers ==========
    // contentSecurityPolicy is disabled: this is a JSON-only API, not an
    // HTML-serving app, so CSP doesn't apply (the Next.js web app sets its
    // own headers independently in next.config.js). crossOriginResourcePolicy
    // is relaxed because this API is intentionally called cross-origin by
    // web.use-agora.com and the mobile app — helmet's 'same-origin' default
    // would otherwise let browsers block those responses.
    app.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            hsts: {
                maxAge: 63072000, // 2 years, matches apps/web/next.config.js
                includeSubDomains: true,
                preload: true,
            },
        }),
    );

    // ========== CORS - allow mobile + web frontends ==========
    const rawOrigins = config.get<string>('ALLOWED_ORIGINS') ?? '';
    const allowedOrigins = rawOrigins
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

    app.enableCors({
        origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin ${requestOrigin} is not allowed `), false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // ── Global validation pipe ─────────────────────
    // Strips unknown properties, transforms payloads to DTO instances,
    // throws 400 for invalid input automatically.

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    // ========== API prefix ==========

    app.setGlobalPrefix('api/v1');

    // ========== Keep-alive timeouts to sync Node server and Cloudflare timeouts  ==========
    const httpServer = app.getHttpServer();
    httpServer.keepAliveTimeout = 100_000;
    httpServer.headersTimeout = 185_000;

    const port = config.get<number>('port') ?? 3000;
    await app.listen(port, '0.0.0.0');

    Logger.log(`API running on port ${port}`, 'Bootstrap');
    Logger.log(`Environment: ${config.get('nodeEnv')}`, 'Bootstrap');
}

bootstrap().catch((err) => {
    //eslint-disable-next-line no-console
    console.error('Fatal startup error: ', err);
    process.exit(1);
});