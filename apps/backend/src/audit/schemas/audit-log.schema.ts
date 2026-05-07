import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * Immutable audit trail.
 * Records every authentication event and (in later phases)
 * every POST/PATCH/DELETE on protected resources.
 *
 * Required for POPIA compliance — proves who did what when.
 */
@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
    @Prop({ type: String, index: true, default: null })
    userId!: string | null;

    @Prop({ required: true, index: true })
    action!: string;          // e.g. 'auth.user.registered'

    @Prop({ required: true })
    resource!: string;

    @Prop({ type: String, default: null })
    resourceId!: string | null;

    @Prop({ default: '' })
    ipAddress!: string;

    @Prop({ default: '' })
    userAgent!: string;

    @Prop({ type: Object, default: null })
    oldValue!: Record<string, unknown> | null;

    @Prop({ type: Object, default: null })
    newValue!: Record<string, unknown> | null;

    @Prop({ default: 200 })
    statusCode!: number;

    @Prop({ required: true, type: Date, index: true })
    timestamp!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ userId: 1, timestamp: -1 });