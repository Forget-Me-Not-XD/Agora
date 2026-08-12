// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { UsersModule } from '../users/users.module';
import { RsvpModule } from '../rsvp/rsvp.module';

@Module({
    imports: [UsersModule, RsvpModule],
    controllers: [AccountController],
})
export class AccountModule {}
