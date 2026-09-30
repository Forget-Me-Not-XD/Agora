// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { ReviewRating, ReviewRatingSchema } from './review-rating.schema';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
    @Prop ({ required: true, type: SchemaTypes.ObjectId, ref: 'Event' })
    event!: Types.ObjectId;

    @Prop ({ required: true, type: SchemaTypes.ObjectId, ref: 'User', index: true })
    user!: Types.ObjectId;

    @Prop ({ type: [ReviewRatingSchema], default: [] })
    ratings!: ReviewRating[];

    @Prop ({ trim: true })
    comment?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ event: 1, user: 1 }, { unique: true });
