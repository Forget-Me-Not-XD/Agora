// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { Rsvp, RsvpSchema }   from '../rsvp/schemas/rsvp.schema';
import { User, UserSchema }   from '../users/schemas/user.schema';
import { ExportService }      from './export.service';
import { ExportController }   from './export.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Event.name, schema: EventSchema },
            { name: Rsvp.name,  schema: RsvpSchema  },
            { name: User.name,  schema: UserSchema   },
        ]),
    ],
    providers:   [ExportService],
    controllers: [ExportController],
})
export class ExportModule {}