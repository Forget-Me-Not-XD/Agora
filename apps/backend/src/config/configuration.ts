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
    jwt: {
        secret: string;
        accessExpiry: string;
        refreshExpiry: string;
    };
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
        jwt: {
            secret: process.env.JWT_SECRET!,
            accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
            refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
        },
    };
};
