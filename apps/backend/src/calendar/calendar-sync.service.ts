// ========== Imports: ==========
import { Injectable, Logger } from '@nestjs/common';
import { UserDocument } from '../users/schemas/user.schema';
import { EventDocument } from '../events/schemas/event.schema';
import { GoogleCalendarService } from './services/google-calendar.service';
import { MicrosoftCalendarService } from './services/microsoft-calendar.service';
import { UsersService } from '../users/users.service';

export interface RsvpCalendarSyncResult {
    googleCalendarEventId: string | null;
    outlookCalendarEventId: string | null;
}

@Injectable()
export class CalendarSyncService {
    private readonly logger = new Logger(CalendarSyncService.name);

    constructor(
        private readonly googleCalendarService: GoogleCalendarService,
        private readonly microsoftCalendarService: MicrosoftCalendarService,
        private readonly usersService: UsersService,
    ) {}

    async syncRsvpCreated(user: UserDocument, event: EventDocument): Promise<RsvpCalendarSyncResult> {
        const result: RsvpCalendarSyncResult = {
            googleCalendarEventId: null,
            outlookCalendarEventId: null,
        };

        if (user.googleCalendar?.connected) {
            try {
                const { externalEventId, refreshedAccessToken, refreshedExpiryDate } =
                    await this.googleCalendarService.createEvent(user.googleCalendar, event);
                result.googleCalendarEventId = externalEventId;

                if (refreshedAccessToken) {
                    await this.usersService.updateGoogleCalendarConnection(user._id.toString(), {
                        ...user.googleCalendar,
                        accessToken: refreshedAccessToken,
                        tokenExpiresAt: refreshedExpiryDate ?? user.googleCalendar.tokenExpiresAt,
                    });
                }
            } catch (err) {
                this.logger.warn(`Google Calendar sync failed for user ${user._id.toString()}: ${(err as Error).message}`);
            }
        }

        if (user.outlookCalendar?.connected) {
            try {
                const freshened = await this.microsoftCalendarService.ensureFreshToken(user.outlookCalendar);
                const connection = freshened ?? user.outlookCalendar;

                if (freshened) {
                    await this.usersService.updateOutlookCalendarConnection(user._id.toString(), freshened);
                }

                result.outlookCalendarEventId = await this.microsoftCalendarService.createEvent(connection, event);
            } catch (err) {
                this.logger.warn(`Outlook Calendar sync failed for user ${user._id.toString()}: ${(err as Error).message}`);
            }
        }

        return result;
    }

    async syncRsvpCancelled(
        user: UserDocument,
        googleCalendarEventId: string | null,
        outlookCalendarEventId: string | null,
    ): Promise<void> {
        if (googleCalendarEventId && user.googleCalendar?.connected) {
            await this.googleCalendarService.deleteEvent(user.googleCalendar, googleCalendarEventId);
        }

        if (outlookCalendarEventId && user.outlookCalendar?.connected) {
            const freshened = await this.microsoftCalendarService.ensureFreshToken(user.outlookCalendar);
            const connection = freshened ?? user.outlookCalendar;
            await this.microsoftCalendarService.deleteEvent(connection, outlookCalendarEventId);
        }
    }
}
