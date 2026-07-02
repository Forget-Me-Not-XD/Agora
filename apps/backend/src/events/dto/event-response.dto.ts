// ========== Imports: ==========
import { Types } from 'mongoose';
import { EventDocument } from '../schemas/event.schema';
import { Role } from '../../common/enums/role.enums';

/**
 * Public facing Event Shape
 * NEVER Includes internal mongoose fields such as _v
 */

export class EventResponseDto {
    id!: string;
    title!: string;
    description!: string;
    date!: Date;
    location!: string;
    maxCapacity!: number;
    createdBy!: string;
    photographers!: string[];
    photographerInstructions!: string;
    confirmedAttendees!: number;
    intendedAttendance!: Role;
    createdAt!: Date;
    updatedAt!: Date;

    static fromDocument(event: EventDocument): EventResponseDto {
        return {
            id:                         event._id.toString(),
            title:                      event.title,
            description:                event.description,
            date:                       event.date,
            location:                   event.location,
            maxCapacity:                event.maxCapacity,
            createdBy:                  event.createdBy.toString(),
            photographers:              event.photographers.map((id: Types.ObjectId) => id.toString()),
            photographerInstructions:   event.photographerInstructions,
            confirmedAttendees:         event.confirmedAttendees,
            intendedAttendance:        event.intendedAttendance,
            createdAt:                  event.createdAt!,
            updatedAt:                  event.updatedAt!,
        };
    }
}