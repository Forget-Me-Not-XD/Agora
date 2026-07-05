// ========== Imports: ==========
import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import { stringify } from 'csv-stringify/sync';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Rsvp, RsvpDocument } from '../rsvp/schemas/rsvp.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LstmService } from './lstm.service';

const execFileAsync = promisify(execFile);

export interface RsvpPerEvent {
    eventTitle: string;
    totalRsvps: number;
}

export interface EventsPerMonth {
    year: number;
    month: number;
    count: number;
}

export interface BudgetPerMonth {
    year: number;
    month: number;
    total: number;
}

export interface AdminKpi {
    value: number;
    deltaPct: number | null    //<-- Null - zero comparison possible yet
}

export interface AdminKpis {
    totalEvents: AdminKpi;
    activeUsers: AdminKpi;
    newSignups: AdminKpi;
    totalRsvps: AdminKpi;
}

export interface RecentRsvp {
    id: string;
    eventTitle: string;
    userName: string;
    status: string;
    checkedIn: boolean;
    createdAt: Date;
}

export interface RsvpStatusCount {
    status: string;
    count: number;
}

export interface AttendancePrediction {
    predictedFillRate: number;
    predictedAttendance: number;
}

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly lstmService: LstmService,
    ) {}

    async getRsvpsPerEvent(): Promise<RsvpPerEvent[]> {
        return this.rsvpModel.aggregate<RsvpPerEvent>([
            {
                $group: {
                    _id: '$event',
                    totalRsvps: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'eventDoc',
                },
            },
            { $unwind: '$eventDoc' },
            {
                $project: {
                    _id: 0,
                    eventTitle: '$eventDoc.title',
                    totalRsvps: 1,
                },
            },
            { $sort: { totalRsvps: -1 } },
        ]).exec();
    }

    async getEventsPerMonth(): Promise<EventsPerMonth[]> {
        return this.eventModel.aggregate<EventsPerMonth>([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    count: 1,
                },
            },
        ]).exec();
    }

    async getBudgetPerMonth(): Promise<BudgetPerMonth[]> {
        return this.eventModel.aggregate<BudgetPerMonth>([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                    },
                    total: { $sum: '$budget' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    total: 1,
                },
            },
        ]).exec();
    }

    async getAverageFillRate(): Promise<number> {
        const result = await this.eventModel.aggregate<{ avgFillRate: number }>([
            { $match: { maxCapacity: { $gt: 0 } } },
            {
                $project: {
                    fillRate: { $divide: ['$confirmedAttendees', '$maxCapacity'] },
                },
            },
            {
                $group: {
                    _id: null,
                    avgFillRate: { $avg: '$fillRate' },
                },
            },
        ]).exec();

        return result.length > 0 ? result[0].avgFillRate : 0;
    }

    async getTop5Events(): Promise<RsvpPerEvent[]> {
        return this.rsvpModel.aggregate<RsvpPerEvent>([
            {
                $group: {
                    _id: '$event',
                    totalRsvps: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'eventDoc',
                },
            },
            { $unwind: '$eventDoc' },
            {
                $project: {
                    _id: 0,
                    eventTitle: '$eventDoc.title',
                    totalRsvps: 1,
                },
            },
            { $sort: { totalRsvps: -1 } },
            { $limit: 5 },
        ]).exec();
    }

    private monthRange(offsetMonths: number): { start: Date; end: Date } {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
        return { start, end };
    }

    private delta(current: number, previous: number): number | null {
        if (previous === 0) return current === 0 ? null : 100;
        return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    async getAdminKpis(): Promise <AdminKpis> {
        const thisMonth = this.monthRange(0);
        const lastMonth = this.monthRange(-1);

        const [
            totalEvents, totalUsers, totalRsvps,
            eventsThisMonth, eventsLastMonth, 
            usersThisMonth,usersLastMonth,
            rsvpsThisMonth, rsvpsLastMonth, 
        ] = await Promise.all([
            this.eventModel.countDocuments().exec(),
            this.userModel.countDocuments({ isActive: true }).exec(),
            this.rsvpModel.countDocuments().exec(),
            this.eventModel.countDocuments({ date: { $gte: thisMonth.start, $lt: thisMonth.end } }).exec(),
            this.eventModel.countDocuments({ date: { $gte: lastMonth.start, $lt: lastMonth.end } }).exec(),
            this.userModel.countDocuments({ createdAt: { $gte: thisMonth.start, $lt: thisMonth.end } }).exec(),
            this.userModel.countDocuments({ createdAt: { $gte: lastMonth.start, $lt: lastMonth.end } }).exec(),
            this.rsvpModel.countDocuments({ createdAt: { $gte: thisMonth.start, $lt: thisMonth.end } }).exec(),
            this.rsvpModel.countDocuments({ createdAt: { $gte: lastMonth.start, $lt: lastMonth.end } }).exec(),
        ]);

        return {
        totalEvents: { value: totalEvents, deltaPct: this.delta(eventsThisMonth, eventsLastMonth) },
        activeUsers: { value: totalUsers, deltaPct: this.delta(usersThisMonth, usersLastMonth) },
        newSignups:  { value: usersThisMonth, deltaPct: this.delta(usersThisMonth, usersLastMonth) },
        totalRsvps:  { value: totalRsvps, deltaPct: this.delta(rsvpsThisMonth, rsvpsLastMonth) },
        };
    }

    async getRsvpsPerMonth(): Promise<EventsPerMonth[]> {
    return this.rsvpModel.aggregate<EventsPerMonth>([
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $project: { _id: 0, year: '$_id.year', month: '$_id.month', count: 1 } },
    ]).exec();
}

async getRsvpStatusBreakdown(): Promise<RsvpStatusCount[]> {
    return this.rsvpModel.aggregate<RsvpStatusCount>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
        { $sort: { count: -1 } },
    ]).exec();
}

async getRecentRsvps(limit: number): Promise<RecentRsvp[]> {
    const rsvps = await this.rsvpModel
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate<{ event: EventDocument }>('event')
        .populate<{ user: UserDocument }>('user')
        .exec();

    return rsvps.map((r) => {
        const event = r.event as unknown as EventDocument;
        const user = r.user as unknown as UserDocument;
        return {
            id: r._id.toString(),
            eventTitle: event?.title ?? 'Onbekend',
            userName: user ? `${user.name} ${user.surname}` : 'Onbekend',
            status: r.status,
            checkedIn: r.checkedIn,
            createdAt: r.createdAt!,
        };
    });
}

    async exportToCsv(type: string): Promise<string> {
        let rows: string[][];

        switch (type) {
            case 'kpis': {
                const [totalEvents, totalUsers, totalRsvps, checkedIn] = await Promise.all([
                    this.eventModel.countDocuments().exec(),
                    this.userModel.countDocuments({ isActive: true }).exec(),
                    this.rsvpModel.countDocuments().exec(),
                    this.rsvpModel.countDocuments({ checkedIn: true }).exec(),
                ]);
                const attendanceRate = totalRsvps > 0
                    ? ((checkedIn / totalRsvps) * 100).toFixed(1)
                    : '0.0';
                rows = [
                    ['KPI', 'Waarde'],
                    ['Totale Geleenthede',  String(totalEvents)],
                    ['Aktiewe Gebruikers',  String(totalUsers)],
                    ['Totale RSVPs',        String(totalRsvps)],
                    ['Ingeboek (Check-in)', String(checkedIn)],
                    ['Bywoningskoers (%)',  attendanceRate],
                ];
                break;
            }
            case 'events-summary': {
                const [eventsPerMonth, top5Events] = await Promise.all([
                    this.getEventsPerMonth(),
                    this.getTop5Events(),
                ]);
                rows = [
                    ['Jaar', 'Maand', 'Geleenthede per Maand', 'Top Geleentheid', 'RSVPs'],
                    ...eventsPerMonth.map((e, i) => [
                        String(e.year),
                        String(e.month),
                        String(e.count),
                        top5Events[i]?.eventTitle ?? '',
                        top5Events[i] ? String(top5Events[i].totalRsvps) : '',
                    ]),
                ];
                break;
            }
            case 'rsvp-summary': {
                const [rsvpsPerEvent, averageFillRate] = await Promise.all([
                    this.getRsvpsPerEvent(),
                    this.getAverageFillRate(),
                ]);
                rows = [
                    ['Geleentheid', 'Totale RSVPs', 'Gemiddelde Vullingskoers (%)'],
                    ...rsvpsPerEvent.map((r) => [
                        r.eventTitle,
                        String(r.totalRsvps),
                        (averageFillRate * 100).toFixed(1),
                    ]),
                ];
                break;
            }
            default:
                throw new BadRequestException(`Ongeldige tipe: ${type}`);
        }

        return '\uFEFF' + 'sep=,\r\n' + stringify(rows);
    }

    // Calls predict.py as a child process and returns a typed attendance prediction.
    // Degrades gracefully (503) when the model artefact is missing or Python is unavailable.
    async predictAttendance(eventId: string): Promise<AttendancePrediction> {
        // getTrainingData throws NotFoundException (via EventsService.findById) if eventId doesn't exist
        const [trainingItem] = await this.lstmService.getTrainingData(eventId);

        const mlDir = join(__dirname, '..', '..', '..', 'ml');
        const modelPath = join(mlDir, 'model.tflite');
        const scriptPath = join(mlDir, 'predict.py');

        if (!existsSync(modelPath)) {
            throw new ServiceUnavailableException('Voorspellingsdiens nie beskikbaar nie');
        }

        let result: { predictedFillRate: number; estimatedAttendees: number };
        try {
            const { stdout } = await execFileAsync('python', [
                scriptPath,
                ...trainingItem.features.map(String),
            ]);
            result = JSON.parse(stdout);
        } catch {
            // Covers: Python not installed (ENOENT), predict.py exiting non-zero, malformed stdout
            throw new ServiceUnavailableException('Voorspellingsdiens nie beskikbaar nie');
        }

        return {
            predictedFillRate: result.predictedFillRate,
            predictedAttendance: result.estimatedAttendees,
        };
    }
}