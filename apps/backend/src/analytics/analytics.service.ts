// ========== Imports: ==========
import { Injectable, ServiceUnavailableException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { stringify } from 'csv-stringify/sync';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Rsvp, RsvpDocument } from '../rsvp/schemas/rsvp.schema';
import { Payment, PaymentDocument, PaymentStatus } from '../payments/schemas/payment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role } from '../common/enums/role.enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { LstmService } from './lstm.service';
import { Trend, TrendDirection } from './dto/trend.dto';

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
    deltaPct: number | null;    //<-- Null - zero comparison possible yet
    direction: TrendDirection;
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

export interface TicketRevenueSummary {
    totalRevenue: number;
    totalTicketsSold: number;
}

export interface EventRevenue {
    eventTitle: string;
    ticketsSold: number;
    revenue: number;
}

export interface RevenuePerMonth {
    year: number;
    month: number;
    total: number;
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
        @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly lstmService: LstmService,
    ) {}

    async assertInsightAccess(eventId: string, user: JwtPayload): Promise<void> {
        if (user.role !== Role.DOSENT) return;

        const event = await this.eventModel.findById(eventId).exec();
        if (!event) throw new NotFoundException(`Geleentheid ${eventId} nie gevind nie`);

        if (event.createdBy.toString() !== user.sub) {
            throw new ForbiddenException('Dosente mag slegs KI-insigte vir hul eie geleenthede sien.');
        }
    }

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

    async getBudgetPerMonth(assignedToUserId?: string): Promise<BudgetPerMonth[]> {
        const scopeStage = assignedToUserId
            ? [{ $match: { assignedTo: new Types.ObjectId(assignedToUserId) } }]
            : [];

        return this.eventModel.aggregate<BudgetPerMonth>([
            ...scopeStage,
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

    private readonly TREND_STABLE_THRESHOLD_PCT = 2;

    private computeTrend(current: number, previous: number): Trend {
        const deltaPct = this.delta(current, previous);
        if(deltaPct === null) return {deltaPct: null, direction: 'stable'};

        const direction: TrendDirection = 
        deltaPct > this.TREND_STABLE_THRESHOLD_PCT ? 'up'
        : deltaPct < -this.TREND_STABLE_THRESHOLD_PCT ? 'down'
        : 'stable';

        return { deltaPct, direction };
    }

    private weekRange(offsetWeeks: number): { start: Date; end: Date } {
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday + offsetWeeks * 7);
        const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
        const end = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
        return { start, end };
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
        totalEvents: { value: totalEvents, ...this.computeTrend(eventsThisMonth, eventsLastMonth) },
        activeUsers: { value: totalUsers, ...this.computeTrend(usersThisMonth, usersLastMonth) },
        newSignups:  { value: usersThisMonth, ...this.computeTrend(usersThisMonth, usersLastMonth) },
        totalRsvps:  { value: totalRsvps, ...this.computeTrend(rsvpsThisMonth, rsvpsLastMonth) },
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

async getTicketRevenueSummary(): Promise<TicketRevenueSummary> {
    const result = await this.paymentModel.aggregate<TicketRevenueSummary>([
        { $match: { status: PaymentStatus.VOLTOOI } },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                totalTicketsSold: { $sum: 1 },
            },
        },
        { $project: { _id: 0, totalRevenue: 1, totalTicketsSold: 1 } },
    ]).exec();

    return result.length > 0 ? result[0] : { totalRevenue: 0, totalTicketsSold: 0 };
}

async getRevenuePerEvent(limit = 5): Promise<EventRevenue[]> {
    return this.paymentModel.aggregate<EventRevenue>([
        { $match: { status: PaymentStatus.VOLTOOI } },
        {
            $group: {
                _id: '$event',
                ticketsSold: { $sum: 1 },
                revenue: { $sum: '$amount' },
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
                ticketsSold: 1,
                revenue: 1,
            },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
    ]).exec();
}

async getRevenuePerMonth(): Promise<RevenuePerMonth[]> {
    return this.paymentModel.aggregate<RevenuePerMonth>([
        { $match: { status: PaymentStatus.VOLTOOI } },
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                total: { $sum: '$amount' },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $project: { _id: 0, year: '$_id.year', month: '$_id.month', total: 1 } },
    ]).exec();
}

async getEventsTrend(): Promise<Trend> {
    const thisMonth = this.monthRange(0);
    const lastMonth = this.monthRange(-1);
    const [current, previous] = await Promise.all([
        this.eventModel.countDocuments({ date: { $gte: thisMonth.start, $lt: thisMonth.end } }).exec(),
        this.eventModel.countDocuments({ date: { $gte: lastMonth.start, $lt: lastMonth.end } }).exec(),
    ]);
    return this.computeTrend(current, previous);
}

// Week-over-week, not month-over-month: RSVPs happen often enough that a weekly view is more useful.
async getRsvpsTrend(): Promise<Trend> {
    const thisWeek = this.weekRange(0);
    const lastWeek = this.weekRange(-1);
    const [current, previous] = await Promise.all([
        this.rsvpModel.countDocuments({ createdAt: { $gte: thisWeek.start, $lt: thisWeek.end } }).exec(),
        this.rsvpModel.countDocuments({ createdAt: { $gte: lastWeek.start, $lt: lastWeek.end } }).exec(),
    ]);
    return this.computeTrend(current, previous);
}

async getBudgetTrend(assignedToUserId?: string): Promise<Trend> {
    const thisMonth = this.monthRange(0);
    const lastMonth = this.monthRange(-1);
    const scopeMatch = assignedToUserId ? { assignedTo: new Types.ObjectId(assignedToUserId) } : {};

    const [current, previous] = await Promise.all([
        this.eventModel.aggregate<{ total: number }>([
            { $match: { ...scopeMatch, date: { $gte: thisMonth.start, $lt: thisMonth.end } } },
            { $group: { _id: null, total: { $sum: '$budget' } } },
        ]).exec(),
        this.eventModel.aggregate<{ total: number }>([
            { $match: { ...scopeMatch, date: { $gte: lastMonth.start, $lt: lastMonth.end } } },
            { $group: { _id: null, total: { $sum: '$budget' } } },
        ]).exec(),
    ]);
    return this.computeTrend(current[0]?.total ?? 0, previous[0]?.total ?? 0);
}

async getRevenueTrend(): Promise<Trend> {
    const thisMonth = this.monthRange(0);
    const lastMonth = this.monthRange(-1);

    const [current, previous] = await Promise.all([
        this.paymentModel.aggregate<{ total: number }>([
            { $match: { status: PaymentStatus.VOLTOOI, createdAt: { $gte: thisMonth.start, $lt: thisMonth.end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]).exec(),
        this.paymentModel.aggregate<{ total: number }>([
            { $match: { status: PaymentStatus.VOLTOOI, createdAt: { $gte: lastMonth.start, $lt: lastMonth.end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]).exec(),
    ]);
    return this.computeTrend(current[0]?.total ?? 0, previous[0]?.total ?? 0);
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

    // Delegates to LstmService, which owns the venv interpreter path and the
    // real-history sequence building - avoids a second, divergent spawn implementation.
    async predictAttendance(eventId: string): Promise<AttendancePrediction> {
        const result = await this.lstmService.predictAttendance(eventId);
        return {
            predictedFillRate: result.predictedFillRate,
            predictedAttendance: result.estimatedAttendees,
        };
    }
}