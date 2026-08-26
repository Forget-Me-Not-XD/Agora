// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum PaymentStatus {
    HANGENDE = 'HANGENDE',
    VOLTOOI = 'VOLTOOI',
    MISLUK = 'MISLUK',
}

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
    @Prop ({ required: true, type: Types.ObjectId, ref: 'Event', index: true })
    event !: Types.ObjectId;

    @Prop ({ required: true, type: Types.ObjectId, ref: 'User', index: true })
    user !: Types.ObjectId;

    @Prop ({ required: true, unique: true, trim: true })
    reference !: string;

    @Prop ({ required: true, min: 0 })
    amount !: number;

    @Prop ({ required: true, enum: PaymentStatus, default: PaymentStatus.HANGENDE })
    status !: PaymentStatus;

    @Prop ({ type: String, default: null })
    providerPaymentId !: string | null;

    @Prop ({ type: Types.ObjectId, ref: 'Rsvp', default: null })
    rsvp !: Types.ObjectId | null;

    createdAt ?: Date;
    updatedAt ?: Date
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);