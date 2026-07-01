// ========== Imports: ==========
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Rsvp, RsvpDocument } from '../rsvp/schemas/rsvp.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ExportService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        @InjectModel(Rsvp.name)  private readonly rsvpModel:  Model<RsvpDocument>,
        @InjectModel(User.name)  private readonly userModel:  Model<UserDocument>,
    ) {}

    // KPIs CSV
    async buildKpisCsv(): Promise<string> {
        const [totalEvents, totalUsers, totalRsvps, checkedIn] = await Promise.all([
            this.eventModel.countDocuments().exec(),
            this.userModel.countDocuments({ isActive: true }).exec(),
            this.rsvpModel.countDocuments().exec(),
            this.rsvpModel.countDocuments({ checkedIn: true }).exec(),
        ]);

        const attendanceRate = totalRsvps > 0
            ? ((checkedIn / totalRsvps) * 100).toFixed(1)
            : '0.0';

        const rows = [
            ['KPI', 'Waarde'],
            ['Totale Geleenthede',    String(totalEvents)],
            ['Aktiewe Gebruikers',    String(totalUsers)],
            ['Totale RSVPs',          String(totalRsvps)],
            ['Ingeboek (Check-in)',   String(checkedIn)],
            ['Bywoningskoers (%)',    attendanceRate],
        ];

        return this.toCsv(rows);
    }

    // Events Summary CSV
    async buildEventsSummaryCsv(): Promise<string> {
        const events = await this.eventModel.find().sort({ date: 1 }).exec();

        const rsvpCounts = await this.rsvpModel.aggregate<{
            _id: string;
            total: number;
            checkedIn: number;
        }>([
            {
                $group: {
                    _id:       { $toString: '$event' },
                    total:     { $sum: 1 },
                    checkedIn: { $sum: { $cond: ['$checkedIn', 1, 0] } },
                },
            },
        ]).exec();

        const rsvpMap = new Map(rsvpCounts.map((r) => [r._id, r]));

        const header = ['Titel', 'Datum', 'Ligging', 'Kapasiteit', 'RSVPs', 'Ingeboek', 'Bywoningskoers (%)'];
        const rows   = events.map((e) => {
            const counts      = rsvpMap.get(e._id.toString());
            const total       = counts?.total     ?? 0;
            const checked     = counts?.checkedIn ?? 0;
            const rate        = total > 0 ? ((checked / total) * 100).toFixed(1) : '0.0';
            return [
                e.title,
                e.date.toISOString().slice(0, 10),
                e.location,
                String(e.maxCapacity),
                String(total),
                String(checked),
                rate,
            ];
        });

        return this.toCsv([header, ...rows]);
    }

    // RSVP Summary CSV
    async buildRsvpSummaryCsv(): Promise<string> {
        const rsvps = await this.rsvpModel
            .find()
            .populate<{ event: EventDocument }>('event')
            .populate<{ user: UserDocument }>('user')
            .exec();

        const header = ['Geleentheid', 'Gebruiker', 'E-pos', 'Status', 'Ingeboek', 'Ingeboek Om'];
        const rows   = rsvps.map((r) => {
            const event = r.event as unknown as EventDocument;
            const user  = r.user  as unknown as UserDocument;
            return [
                event?.title    ?? r.event.toString(),
                user
                    ? `${user.name} ${user.surname}`
                    : r.user.toString(),
                user?.email     ?? '',
                r.status,
                r.checkedIn ? 'Ja' : 'Nee',
                r.checkedInAt   ? r.checkedInAt.toISOString() : '',
            ];
        });

        return this.toCsv([header, ...rows]);
    }

    // Helper function
    private toCsv(rows: string[][]): string {
    const bom = '\uFEFF';
    const sep = 'sep=,\r\n';  
    const csv = rows
        .map((row) =>
            row
                .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                .join(','),
        )
        .join('\r\n');
    return bom + sep + csv;
}
}