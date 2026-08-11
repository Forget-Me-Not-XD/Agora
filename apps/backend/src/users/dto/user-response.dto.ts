// ========== Imports: ==========
import { Role } from '../../common/enums/role.enums';
import { UserDocument } from '../schemas/user.schema';
import { UserTitle } from '../../common/enums/user-title.enum';
import { UserTag } from '../../common/enums/user-tag.enum';
/**
 * Public-facing User shape.
 * NEVER includes passwordHash, failedLoginAttempts, or lockedUntil.
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
    tags!: UserTag[];

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
            tags: user.tags ?? [],
        };
    }
}
