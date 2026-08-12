// ========== Imports: ==========
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CalendarConnection {
    @Prop({ default: false })
    connected!: boolean;

    @Prop({ type: String, default: null })
    accountEmail!: string | null;

    @Prop({ type: String, default: null })
    accessToken!: string | null;

    @Prop({ type: String, default: null})
    refreshToken!: string | null;

    @Prop({ type: Date, default: null })
    tokenExpiresAt!: Date | null;
}

export const CalendarConnectionSchema = SchemaFactory.createForClass(CalendarConnection);