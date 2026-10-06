// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
    FOTOGRAAF = 'FOTOGRAAF',
    RESENSIE_VERSOEK = 'RESENSIE_VERSOEK',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
    @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User', index: true })
    userId !: Types.ObjectId;

    @Prop({ required: true, trim: true })
    message !: string;

    @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Event', index: true })
    event !: Types.ObjectId;

    @Prop({ default: false })
    read !: boolean;

    @Prop({ type: String, enum: Object.values(NotificationType), default: NotificationType.FOTOGRAAF })
    type !: NotificationType;

    createdAt ?: Date;
    updatedAt ?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);