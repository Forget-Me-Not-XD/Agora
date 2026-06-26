// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
    userId !: Types.ObjectId;

    @Prop({ required: true, trim: true })
    message !: string;

    @Prop({ required: true, type: Types.ObjectId, ref: 'Event', index: true })
    event !: Types.ObjectId;

    @Prop({ defualt: false })
    read !: boolean;

    createdAt ?: Date;
    updatedAt ?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);