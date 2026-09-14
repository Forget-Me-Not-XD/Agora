// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export enum RsvpStatus {
    BEVESTIG = 'BEVESTIG',
    HANGENDE = 'HANGENDE',
    GEKANSELLEER = 'GEKANSELLEER',
}

export type RsvpDocument = HydratedDocument<Rsvp>;

@Schema({ timestamps: true, collection: 'rsvps' })
export class Rsvp {
    @Prop ({ required: true, type: SchemaTypes.ObjectId, ref: 'Event', index: true })
    event!: Types.ObjectId;

    // Ontbreek vir 'n walk-in -- iemand wat sonder 'n gebruikersrekening ter plekke geregistreer is.
    @Prop ({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
    user?: Types.ObjectId;

    // Net gestel vir 'n walk-in of 'n +1-gas; onnodig wanneer 'n `user` gekoppel is.
    @Prop ({ trim: true })
    guestName?: string;

    // Net gestel op 'n +1-gas se eie RSVP-dokument (sien primaryRsvpId hieronder).
    @Prop ({ trim: true })
    guestEmail?: string;

    @Prop ({ required: true, enum: RsvpStatus, default: RsvpStatus.HANGENDE })
    status!: RsvpStatus;

    @Prop ({ required: true, trim: true })
    qrPayload!: string;

    @Prop ({ default: false })
    checkedIn!: boolean;

    @Prop ({ type: Date, default: null })
    checkedInAt!: Date | null;

    @Prop ({ type: String, default: null })
    googleCalendarEventId!: string | null;

    @Prop ({ type: String, default: null })
    outlookCalendarEventId!: string | null;

    @Prop ({ default: false })
    paid!: boolean;

    @Prop ({ type: SchemaTypes.ObjectId, ref: 'Payment', default: null })
    payment!: Types.ObjectId | null;

    @Prop ({ trim: true })
    plusOneName?: string;

    @Prop ({ trim: true })
    plusOneSurname?: string;

    @Prop ({ trim: true })
    plusOneEmail?: string;

    // Gestel op die hoof-registreerder se RSVP: wys na die +1-gas se eie,
    // onafhanklike RSVP-dokument (met sy eie qrPayload/checkedIn).
    @Prop ({ type: SchemaTypes.ObjectId, ref: 'Rsvp', default: null })
    plusOneRsvpId!: Types.ObjectId | null;

    // Gestel op die +1-gas se eie RSVP-dokument: wys terug na die hoof-
    // registreerder se RSVP wat hulle uitgenooi het.
    @Prop ({ type: SchemaTypes.ObjectId, ref: 'Rsvp', default: null })
    primaryRsvpId!: Types.ObjectId | null;

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
