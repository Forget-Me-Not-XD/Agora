// ========== Imports: ==========
import { Role } from '../../common/enums/role.enums';
import { UserDocument } from '../schemas/user.schema';
import { UserTitle } from '../../common/enums/user-title.enum';
import { SsoProvider } from '../../common/enums/sso-provider.enum';
/**
 * Public-facing User shape.
 * NEVER includes passwordHash, failedLoginAttempts, lockedUntil, or calendar tokens.
 */

export class UserResponseDto {
    id!: string;
    name!: string;
    surname!: string;
    email!: string;
    role!: Role;
    studyCenter!: string;
    isActive!: boolean;
    createdAt!: Date;
    title!: string;
    ssoProvider!: SsoProvider | null;
    calendars!: { google: boolean; microsoft: boolean };

    static fromDocument(user: UserDocument): UserResponseDto {
        return {
            id: user._id.toString(),
            name: user.name,
            surname: user.surname,
            email: user.email,
            role: user.role,
            studyCenter: user.studyCenter,
            isActive: user.isActive,
            createdAt: user.createdAt!,
            title: user.title ?? '',
            ssoProvider: user.ssoProvider ?? null,
            calendars: {
                google: user.googleCalendar?.connected ?? false,
                microsoft: user.outlookCalendar?.connected ?? false,
            },
        };
    }
}
