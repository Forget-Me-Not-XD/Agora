// ========== Imports: ==========
import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { Response } from 'express';

// Liveness/readiness endpoints for the k8s probes — deliberately outside
// auth/throttling so the kubelet can always reach them.
@Controller('health')
export class HealthController {
    constructor(@InjectConnection() private readonly mongoConnection: Connection) {}

    // Process is up and handling requests. Never checks dependencies —
    // if this fails, k8s should restart the pod.
    @Get('live')
    live() {
        return { status: 'ok' };
    }

    // Safe to receive traffic. Checks the Mongo connection specifically,
    // since every request path depends on it — if this fails, k8s should
    // stop routing traffic here (but not restart the pod).
    @Get('ready')
    ready(@Res() res: Response) {
        const mongoReady = this.mongoConnection.readyState === 1;
        if (mongoReady) {
            return res.status(HttpStatus.OK).json({ status: 'ok', mongo: 'connected' });
        }
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'unavailable', mongo: 'disconnected' });
    }
}
