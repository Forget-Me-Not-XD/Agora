/**
 * Centralised Configuration loader.
 * All envirionment variables are read and validated here.
 */
export interface AppConfig {
    port: number;
    nodeEnv: string;
    mongoUri: string;
    rabbitmqUrl: string;
    redisUrl: string;
    frontendUrl: string;
    jwt: {
        secret: string;
        accessExpiry: string;
        refreshExpiry: string;
    };
    oauth: {
        google: {
            clientId: string;
            clientSecret: string;
            callbackUrl: string;
            calendarCallbackUrl: string;
        };
        microsoft: {
            clientId: string;
            clientSecret: string;
            callbackUrl: string;
            calendarCallbackUrl: string;
        };
    };
    payfast: {
        merchantId: string;
        merchantKey: string;
        passphrase: string;
        mode: string;
        notifyUrl: string;
        returnUrl: string;
        cancelUrl: string;
        processUrl: string;
    }
}

export default (): AppConfig => {
    const required = ['MONGO_URI', 'RABBITMQ_URL', 'REDIS_URL', 'JWT_SECRET'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    return {
        port: parseInt(process.env.PORT ?? '3000', 10),
        nodeEnv: process.env.NODE_ENV ?? 'development',
        mongoUri: process.env.MONGO_URI!,
        rabbitmqUrl: process.env.RABBITMQ_URL!,
        redisUrl: process.env.REDIS_URL!,
        frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
        jwt: {
            secret: process.env.JWT_SECRET!,
            accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
            refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
        },
        oauth: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID ?? 'not-configured',
                clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'not-configured',
                callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/api/v1/auth/google/callback',
                calendarCallbackUrl: process.env.GOOGLE_CALENDAR_CALLBACK_URL ?? 'http://localhost:3000/api/v1/calendar/google/callback',
            },
            microsoft: {
                clientId: process.env.MICROSOFT_CLIENT_ID ?? 'not-configured',
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? 'not-configured',
                callbackUrl: process.env.MICROSOFT_CALLBACK_URL ?? 'http://localhost:3000/api/v1/auth/microsoft/callback',
                calendarCallbackUrl: process.env.MICROSOFT_CALENDAR_CALLBACK_URL ?? 'http://localhost:3000/api/v1/calendar/microsoft/callback',
            },
        },
        payfast: {
            merchantId: process.env.PAYFAST_MERCHANT_ID ?? '10000100',
            merchantKey: process.env.PAYFAST_MERCHANT_KEY ?? '46f0cd694581a',
            passphrase: process.env.PAYFAST_PASSPHRASE ?? '',
            mode: process.env.PAYFAST_MODE ?? 'simulate',
            notifyUrl: process.env.PAYFAST_NOTIFY_URL ?? 'http://localhost:3000/api/v1/payments/notify',
            returnUrl: process.env.PAYFAST_RETURN_URL ?? 'http://localhost:3001/events',
            cancelUrl: process.env.PAYFAST_CANCEL_URL ?? 'http://localhost:3001/events',
            processUrl: process.env.PAYFAST_PROCESS_URL ?? 'https://sandbox.payfast.co.za/eng/process',
        },
    };
};
