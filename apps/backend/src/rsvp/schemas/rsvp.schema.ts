// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum RsvpStatus {
    CONFIRMED = 'CONFIRMED',
    HANGING = 'HANGING',
    CANCELLED = 'CANCELLED',
}

export type RsvpDocument = HydratedDocument<Rsvp>;

@Schema({ timestamps: true, collection: 'rsvps' })
export class Rsvp {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
    event!: Types.ObjectId;

    // TBT
}