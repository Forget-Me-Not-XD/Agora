// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema ({ _id: false })
export class ReviewCategory {
    @Prop({ required: true })
    id!: string;

    @Prop({ required: true, trim: true })
    name!: string;
}

export const ReviewCategorySchema = SchemaFactory.createForClass(ReviewCategory);