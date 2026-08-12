// ========== Imports: ==========
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
import { EventDocument } from '../../events/schemas/event.schema';
import { CalendarConnection } from '../../users/schemas/calendar-connection.schema';

export interface GoogleTokenResult {
    accessToken: string;
    refreshToken: string | null;
    expiryDate: Date | null;
    accountEmail: string;
}

export interface GoogleEventSyncResult {
    externalEventId: string;
    refreshedAccessToken: string | null;
    refreshedExpiryDate: Date | null;
}

const CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
];

@Injectable()
export class GoogleCalendarService {
    private readonly logger = new Logger(GoogleCalendarService.name);

    constructor(private readonly config: ConfigService) {}

    buildAuthUrl(state: string): string {
        const client = this.createOAuthClient();
        return client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'select_account consent',
            scope: CALENDAR_SCOPES,
            state,
        });
    }

    async exchangeCode(code: string): Promise<GoogleTokenResult> {
        const client = this.createOAuthClient();
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        const oauth2 = google.oauth2({ auth: client, version: 'v2' });
        const { data } = await oauth2.userinfo.get();

        return {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token ?? null,
            expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            accountEmail: data.email ?? '',
        };
    }

    async createEvent(connection: CalendarConnection, event: EventDocument): Promise<GoogleEventSyncResult> {
        const client = this.createOAuthClient();
        client.setCredentials({
            access_token: connection.accessToken,
            refresh_token: connection.refreshToken,
            expiry_date: connection.tokenExpiresAt ? connection.tokenExpiresAt.getTime() : undefined,
        });

        let refreshedAccessToken: string | null = null;
        let refreshedExpiryDate: Date | null = null;
        client.on('tokens', (tokens) => {
            if (tokens.access_token) refreshedAccessToken = tokens.access_token;
            if (tokens.expiry_date) refreshedExpiryDate = new Date(tokens.expiry_date);
        });

        const calendar = google.calendar({ version: 'v3', auth: client });
        const start = event.date;
        const end = event.endDate ?? new Date(start.getTime() + 60 * 60 * 1000);

        const { data } = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: event.title,
                description: event.description,
                location: event.location,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
            },
        });

        return {
            externalEventId: data.id!,
            refreshedAccessToken,
            refreshedExpiryDate,
        };
    }

    async deleteEvent(connection: CalendarConnection, externalEventId: string): Promise<void> {
        const client = this.createOAuthClient();
        client.setCredentials({
            access_token: connection.accessToken,
            refresh_token: connection.refreshToken,
        });

        const calendar = google.calendar({ version: 'v3', auth: client });
        try {
            await calendar.events.delete({ calendarId: 'primary', eventId: externalEventId });
        } catch (err) {
            this.logger.warn(`Could not delete Google Calendar event ${externalEventId}: ${(err as Error).message}`);
        }
    }

    private createOAuthClient(): OAuth2Client {
        return new google.auth.OAuth2(
            this.config.get<string>('oauth.google.clientId'),
            this.config.get<string>('oauth.google.clientSecret'),
            this.config.get<string>('oauth.google.calendarCallbackUrl'),
        );
    }
}
