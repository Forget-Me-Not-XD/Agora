// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ReviewRating {
    @Prop({ required: true })
    categoryId!: string;

    @Prop({ required: true, min: 0, max: 5 })
    score!: number;
}

export const ReviewRatingSchema = SchemaFactory.createForClass(ReviewRating);
