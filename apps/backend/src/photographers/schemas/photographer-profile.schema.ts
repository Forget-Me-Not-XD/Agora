// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PhotographerProfileDocument = HydratedDocument<PhotographerProfile>

@Schema({ timestamps: true, collection: 'photographer_profiles' })
export class PhotographerProfile {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true, index: true})
    user!: Types.ObjectId;

    @Prop({ required: true, trim: true })
    bio!: string;

    @Prop({ required: false, trim: true, default: '' })
    portfolioUrl!: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export const PhotographerProfileSchema = SchemaFactory.createForClass(PhotographerProfile);