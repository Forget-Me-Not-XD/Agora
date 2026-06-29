// ========== Imports: ========== 
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const config = app.get(ConfigService);

    // ========== CORS - allow mobile + web frontends ==========
    const rawOrigins = config.get<string>('ALLOWED_ORIGINS') ?? '';
    const allowedOrigins = rawOrigins
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

    app.enableCors({
        origin: (requestOrigin, callback) => {
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