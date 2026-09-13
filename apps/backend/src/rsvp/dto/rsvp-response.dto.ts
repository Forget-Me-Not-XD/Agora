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
    user!: UserInRsvpDto | null;
    guestName!: string | null;
    guestEmail!: string | null;
    status!: RsvpStatus;
    qrPayload!: string;
    checkedIn!: boolean;
    checkedInAt!: Date | null;
    paid!: boolean;
    payment!: string | null;
    plusOneName!: string | null;
    plusOneSurname!: string | null;
    plusOneEmail!: string | null;
    plusOneRsvpId!: string | null;
    primaryRsvpId!: string | null;
    createdAt!: Date;

    // 'n Walk-in het geen gekoppelde gebruiker nie -- `user` is dan null en
    // `guestName` (op die geleentheid ingesamel) word gebruik om die gas te wys.
    static fromDocument(rsvp: RsvpDocument & { user?: UserDocument | null }): RsvpResponseDto {
        return {
            id: rsvp._id.toString(),
            event: rsvp.event.toString(),
            user: rsvp.user ? UserInRsvpDto.fromDocument(rsvp.user) : null,
            guestName: rsvp.guestName ?? null,
            guestEmail: rsvp.guestEmail ?? null,
            status: rsvp.status,
            qrPayload: rsvp.qrPayload,
            checkedIn: rsvp.checkedIn,
            checkedInAt: rsvp.checkedInAt,
            paid: rsvp.paid,
            payment: rsvp.payment ? rsvp.payment.toString() : null,
            plusOneName: rsvp.plusOneName ?? null,
            plusOneSurname: rsvp.plusOneSurname ?? null,
            plusOneEmail: rsvp.plusOneEmail ?? null,
            plusOneRsvpId: rsvp.plusOneRsvpId ? rsvp.plusOneRsvpId.toString() : null,
            primaryRsvpId: rsvp.primaryRsvpId ? rsvp.primaryRsvpId.toString() : null,
            createdAt: rsvp.createdAt!,
        };
    }
}