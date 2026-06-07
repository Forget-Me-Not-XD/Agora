// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

@Schema ({ timestamps: true, collection: 'events' })
export class Event {
    @Prop ({ required: true, trim: true })
    title!: string;

    @Prop ({ required: true, trim: true })
    description!: string;

    @Prop ({ required: true, type: Date })
    date!: Date;

    @Prop ({ required: true, trim: true})
    location!: string;

    @Prop ({ required: true })
    maxCapacity!: number;

    @Prop ({ required: true, type: Types.ObjectId, ref: 'User', index: true })
    createdBy!: Types.ObjectId;

    @Prop ({ type: [Types.ObjectId], ref: 'User', default: [] })
    photographers!: Types.ObjectId[];

    @Prop ({ required: false, trim: true, default: '' })
    photographerInstructions!: string;

    @Prop ({ default: 0 })
    confirmedAttendees!: number;

    createdAt?: Date;
    updatedAt?: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);