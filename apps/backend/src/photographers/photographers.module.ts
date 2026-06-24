// ========== Imports: ==========
import { Module } from "@nestjs/common";
import { PhotographerProfile, PhotographerProfileSchema } from './schemas/photographer-profile.schema';
import { MongooseModule } from "@nestjs/mongoose";

@Module ({ 
    imports: [MongooseModule.forFeature([{ name: PhotographerProfile.name, schema: PhotographerProfileSchema }])],
    providers: [],
    controllers: [],
    exports: [],
})
export class PhotographersModule {}