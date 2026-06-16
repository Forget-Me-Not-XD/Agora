// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum RsvpStatus {
    BEVESTIG = 'BEVESTIG',
    HANGENDE = 'HANGENDE',
    GEKANSELLEER = 'GEKANSELLEER',
}

export type RsvpDocument = HydratedDocument<Rsvp>;

@Schema({ timestamps: true, collection: 'rsvps' })
export class Rsvp {
    @Prop ({ required: true, type: Types.ObjectId, ref: 'Event', index: true })
    event!: Types.ObjectId;

    @Prop ({ required: true, type: Types.ObjectId, ref: 'User', index: true })
    user!: Types.ObjectId;

    @Prop ({ required: true, enum: RsvpStatus, default: RsvpStatus.HANGENDE })
    status!: RsvpStatus;

    @Prop ({ required: true, trim: true })
    qrPayload!: string;

    @Prop ({ default: false })
    checkedIn!: boolean;

    @Prop ({ type: Date, default: null })
    checkedInAt!: Date | null;

    createdAt?: Date;
    updatedAt?: Date;
}

export const RsvpSchema = SchemaFactory.createForClass(Rsvp);

RsvpSchema.index({ event: 1, user: 1}, { unique: true });