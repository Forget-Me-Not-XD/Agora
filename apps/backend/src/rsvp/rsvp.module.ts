// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rsvp, RsvpSchema } from './schemas/rsvp.schema';

@Module ({
    imports: [MongooseModule.forFeature([{ name: Rsvp.name, schema: RsvpSchema }])],
    providers: [],
    controllers: [],
    exports: [],
})
export class RsvpModule {}