import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsumeMessage } from 'amqplib';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { QUEUES } from '../messaging/events.constants';

/**
 * Audit consumer.
 * Subscribes to ALL auth.* and audit.* events and writes them
 * to the audit_logs collection for POPIA compliance.
 */
@Injectable()
export class AuditConsumer implements OnModuleInit {
    private readonly logger = new Logger(AuditConsumer.name);

    constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
    private readonly rabbitmq: RabbitMQService,
    ) {}

    async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe<Record<string, unknown>>(
        QUEUES.AUDIT_LOG,
        async (payload, msg) => this.handleAudit(payload, msg),
    );
}

    private async handleAudit(
        payload: Record<string, unknown>,
        msg: ConsumeMessage,
    ): Promise<void> {
    const routingKey = msg.fields.routingKey;

    await this.auditModel.create({
        userId:     (payload.userId as string) ?? null,
        action:     routingKey,
        resource:   this.deriveResource(routingKey),
        resourceId: (payload.userId as string) ?? null,
        ipAddress:  (payload.ipAddress as string) ?? '',
        userAgent:  (payload.userAgent as string) ?? '',
        newValue:   this.sanitizePayload(payload),
        statusCode: this.deriveStatusCode(routingKey),
        timestamp:  new Date(),
    });

    this.logger.debug(`Audit logged: ${routingKey}`);
}

    private deriveResource(routingKey: string): string {
        const parts = routingKey.split('.');
        return parts[1] ?? routingKey;
    }

    private deriveStatusCode(routingKey: string): number {
        if (routingKey.includes('failed') || routingKey.includes('error')) return 401;
        if (routingKey.includes('locked') || routingKey.includes('inactive'))  return 403;
        return 200;
    }

    private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
        const REDACTED = new Set(['password', 'passwordhash', 'token', 'secret', 'pin', 'otp']);
        return Object.fromEntries(
            Object.entries(payload).filter(([key]) => !REDACTED.has(key.toLowerCase())),
        );
    }
}