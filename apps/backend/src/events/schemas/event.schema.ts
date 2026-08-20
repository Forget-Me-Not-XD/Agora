// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enums';
import { EventType } from '../../common/enums/event-type.enum';
import { ATTENDANCE_ROLES } from '../../common/rbac/event-visibility';

export type EventDocument = HydratedDocument<Event>;

@Schema ({ timestamps: true, collection: 'events' })
export class Event {
    @Prop ({ required: true, trim: true })
    title!: string;

    @Prop ({ required: true, trim: true })
    description!: string;

    @Prop ({ required: true, type: Date })
    date!: Date;

    @Prop ({ required: false, type: Date })
    endDate?: Date;

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

    @Prop ({ required: false, type: Types.ObjectId, ref: 'User', default: null, index: true })
    assignedTo!: Types.ObjectId | null;

    @Prop ({ default: 0 })
    confirmedAttendees!: number;

    @Prop ({ default: 0, min: 0 })
    budget!: number;

    @Prop ({ type: String, enum: ATTENDANCE_ROLES, default: Role.GAS, index: true })
    intendedAttendance!: Role;

    @Prop ({ type: String, enum: Object.values(EventType), default: EventType.PUBLIC })
    type!: EventType;

    @Prop ({ default: false })
    sellsTickets!: boolean;

    @Prop ({ type: Number, default: null })
    ticketPrice!: number | null;

    @Prop ({ type: Number, default: null })
    ticketsAvailable!: number | null;

    createdAt?: Date;
    updatedAt?: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);