// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/enums/role.enums';
import { UserTitle } from '../../common/enums/user-title.enum'
import { SsoProvider } from '../../common/enums/sso-provider.enum';
import { CalendarConnection, CalendarConnectionSchema } from './calendar-connection.schema';
import { UserTag } from '../../common/enums/user-tag.enum';
export type UserDocument = HydratedDocument<User>;

/**
 * User entity — the central identity record.
 *
 * Sensitive fields (passwordHash, calendar tokens) are NEVER returned in API responses.
 * UserResponseDto.fromDocument() strips them before serialisation.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
    @Prop({ required: true, trim: true })
    name!: string;

    @Prop({ required: true, trim: true })
    surname!: string;

    @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
    email!: string;

    @Prop({ required: false })
    passwordHash?: string;

    @Prop({ type: Date, default: Date.now })
    passwordChangedAt!: Date;

    @Prop({ default: false })
    mustCangePassword!: boolean;

    @Prop({ required: true, enum: Role, default: Role.GAS, index: true })
    role!: Role;

    @Prop({ required: false, trim: true, default: '' })
    studyCenter!: string;

    @Prop({ default: true })
    isActive!: boolean;

    @Prop({ default: 0 })
    failedLoginAttempts!: number;

    @Prop({ type: Date, default: null })
    lockedUntil!: Date | null;

    @Prop({ type: String, enum: Object.values(UserTitle), default: UserTitle.NONE})
    title!: string;

    @Prop({ type: String, enum: SsoProvider, default: null })
    ssoProvider!: SsoProvider | null;

    @Prop({ type: String, default: null, index: true })
    ssoId!: string | null;

    @Prop({ type: CalendarConnectionSchema, default: () => ({}) })
    googleCalendar!: CalendarConnection;

    @Prop({ type: CalendarConnectionSchema, default: () => ({}) })
    outlookCalendar!: CalendarConnection;

    @Prop({ type: [String], enum: Object.values(UserTag), default: [] })
    tags!: UserTag[];

    // Timestamps added by Mongoose timestamps: true
    createdAt?: Date;
    updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound index for fast role-based queries
UserSchema.index({ role: 1, isActive: 1 });
