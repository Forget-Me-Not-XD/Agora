// ========== Imports: ==========
import { Role } from "../../common/enums/role.enums";
import { UserDocument } from "../../users/schemas/user.schema";
import { RsvpDocument, RsvpStatus } from "../schemas/rsvp.schema";

class UserInRsvpDto {
    id!: string;
    name!: string;
    surname!: string;
    email!: string;
    role!: Role;

    static fromDocument(user: UserDocument): UserInRsvpDto {
        return {
            id: user._id.toString(),
            name: user.name,
            surname: user.surname,
            email: user.email,
            role: user.role,
        };
    }
}

export class RsvpResponseDto {
    id!: string;
    event!: string;
    user!: UserInRsvpDto;
    status!: RsvpStatus;
    qrPayload!: string;
    checkedIn!: boolean;
    checkedInAt!: Date | null;
    createdAt!: Date;

    static fromDocument(rsvp: RsvpDocument & { user: UserDocument }): RsvpResponseDto {
        return {
            id: rsvp._id.toString(),
            event: rsvp.event.toString(),
            user: UserInRsvpDto.fromDocument(rsvp.user),
            status: rsvp.status,
            qrPayload: rsvp.qrPayload,
            checkedIn: rsvp.checkedIn,
            checkedInAt: rsvp.checkedInAt,
            createdAt: rsvp.createdAt!,
        };
    }
}