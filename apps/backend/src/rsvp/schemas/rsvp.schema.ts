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

    // Ontbreek vir 'n walk-in -- iemand wat sonder 'n gebruikersrekening ter plekke geregistreer is.
    @Prop ({ type: Types.ObjectId, ref: 'User', index: true })
    user?: Types.ObjectId;

    // Net gestel vir 'n walk-in; onnodig wanneer 'n `user` gekoppel is.
    @Prop ({ trim: true })
    guestName?: string;

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

// Slegs afgedwing vir regte RSVPs -- 'n walk-in het geen `user` nie, so
// verskeie walk-ins vir dieselfde geleentheid moet nie as duplikate tel nie.
RsvpSchema.index(
    { event: 1, user: 1 },
    { unique: true, partialFilterExpression: { user: { $exists: true } } },
);