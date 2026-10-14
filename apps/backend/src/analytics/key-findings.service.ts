// ========== Imports: ==========
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema';
import { EventType } from '../common/enums/event-type.enum';
import { Role } from '../common/enums/role.enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { KeyFinding } from './dto/key-finding.dto';

const MIN_GROUP_SIZE = 5;
const TIMEZONE = 'Africa/Johannesburg';

const WEEKDAYS = ['Sondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrydag', 'Saterdag'];

const MONTHS = [
    'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
    'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
    [EventType.PUBLIC]: 'Publiek',
    [EventType.INTERNAL_STUDENT]: 'Intern-Student',
    [EventType.PRIVATE]: 'Privaat',
    [EventType.DEPARTMENT]: 'Departement',
};

type MatchFilter = Record<string, unknown>;

interface GroupStat<T> {
    _id: T;
    attendance: number;
    count: number;
}

interface AverageStat {
    value: number;
    count: number;
}

interface CategoryStat {
    _id: string;
    avgScore: number;
    eventCount: number;
}

@Injectable()
export class KeyFindingsService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    ) {}

    async getKeyFindings(user: JwtPayload): Promise<KeyFinding[]> {
        const scope = this.scopeMatch(user);
        // Geleenthede waar niemand ingeteken is nie, het waarskynlik nie inteken gebruik nie
        // en sal bywoning en no-shows skeeftrek.
        const checkedIn = { ...scope, checkedInCount: { $gt: 0 } };

        const [weekdays, months, types, ratingGroups, noShow, unusedSeats, cost, categories] = await Promise.all([
            this.attendanceByGroup<number>(checkedIn, { $dayOfWeek: { date: '$date', timezone: TIMEZONE } }),
            this.attendanceByGroup<number>(checkedIn, { $month: { date: '$date', timezone: TIMEZONE } }),
            this.attendanceByGroup<EventType>(checkedIn, '$type'),
            this.attendanceByGroup<string>(
                { ...checkedIn, ratingAvg: { $ne: null } },
                {
                    $switch: {
                        branches: [
                            { case: { $gte: ['$ratingAvg', 4] }, then: 'high' },
                            { case: { $lt: ['$ratingAvg', 3] }, then: 'low' },
                        ],
                        default: 'mid',
                    },
                },
            ),
            this.averageOf(
                { ...checkedIn, confirmedAttendees: { $gt: 0 } },
                { $max: [0, { $divide: [{ $subtract: ['$confirmedAttendees', '$checkedInCount'] }, '$confirmedAttendees'] }] },
            ),
            this.averageOf(
                { ...checkedIn, maxCapacity: { $gt: 0 } },
                { $max: [0, { $subtract: ['$maxCapacity', '$checkedInCount'] }] },
            ),
            this.costPerAttendee(scope),
            this.categoryScores(scope),
        ]);

        return [
            this.bestWeekday(weekdays),
            this.worstWeekday(weekdays),
            this.bestMonth(months),
            this.bestType(types),
            this.noShowFinding(noShow),
            this.unusedSeatsFinding(unusedSeats),
            this.costFinding(cost),
            this.weakestCategoryFinding(categories),
            this.ratingFinding(ratingGroups),
        ].filter((finding): finding is KeyFinding => finding !== null);
    }

    private scopeMatch(user: JwtPayload): MatchFilter {
        // Demo-data word uitgesluit, soos in EventsService.findTrainableEvents.
        const match: MatchFilter = { date: { $lt: new Date() }, isDemo: { $ne: true } };
        if (user.role !== Role.ADMIN) {
            match.createdBy = new Types.ObjectId(user.sub);
        }
        return match;
    }

    private attendanceByGroup<T>(match: MatchFilter, groupBy: string | MatchFilter): Promise<GroupStat<T>[]> {
        return this.eventModel.aggregate<GroupStat<T>>([
            { $match: { ...match, maxCapacity: { $gt: 0 } } },
            {
                $group: {
                    _id: groupBy,
                    // Plus-ones kan checkedInCount bo maxCapacity druk; beperk tot 100%.
                    attendance: { $avg: { $min: [1, { $divide: ['$checkedInCount', '$maxCapacity'] }] } },
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gte: MIN_GROUP_SIZE } } },
            { $sort: { attendance: -1, _id: 1 } },
        ]).exec();
    }

    private averageOf(match: MatchFilter, valueExpression: MatchFilter): Promise<AverageStat[]> {
        return this.eventModel.aggregate<AverageStat>([
            { $match: match },
            {
                $group: {
                    _id: null,
                    value: { $avg: valueExpression },
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gte: MIN_GROUP_SIZE } } },
        ]).exec();
    }

    private costPerAttendee(scope: MatchFilter): Promise<AverageStat[]> {
        return this.eventModel.aggregate<AverageStat>([
            { $match: { ...scope, budget: { $gt: 0 }, checkedInCount: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    totalBudget: { $sum: '$budget' },
                    totalAttendees: { $sum: '$checkedInCount' },
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gte: MIN_GROUP_SIZE } } },
            {
                $project: {
                    _id: 0,
                    value: { $divide: ['$totalBudget', '$totalAttendees'] },
                    count: 1,
                },
            },
        ]).exec();
    }

    // Begin by die geleenthede in omvang en soek dan hul resensies op, sodat 'n DOSENT
    // nie elke resensie in die databasis hoef te deursoek nie.
    private categoryScores(scope: MatchFilter): Promise<CategoryStat[]> {
        return this.eventModel.aggregate<CategoryStat>([
            { $match: scope },
            {
                $lookup: {
                    from: this.reviewModel.collection.name,
                    localField: '_id',
                    foreignField: 'event',
                    as: 'review',
                },
            },
            { $unwind: '$review' },
            { $unwind: '$review.ratings' },
            {
                $project: {
                    event: '$_id',
                    score: '$review.ratings.score',
                    category: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$reviewCategories',
                                    as: 'c',
                                    cond: { $eq: ['$$c.id', '$review.ratings.categoryId'] },
                                },
                            },
                            0,
                        ],
                    },
                },
            },
            { $match: { 'category.name': { $exists: true } } },
            {
                $group: {
                    _id: '$category.name',
                    avgScore: { $avg: '$score' },
                    events: { $addToSet: '$event' },
                },
            },
            { $project: { avgScore: 1, eventCount: { $size: '$events' } } },
            { $match: { eventCount: { $gte: MIN_GROUP_SIZE } } },
            { $sort: { avgScore: 1, _id: 1 } },
        ]).exec();
    }

    private bestWeekday(groups: GroupStat<number>[]): KeyFinding | null {
        if (groups.length < 2) return null;
        const best = groups[0];
        const day = WEEKDAYS[best._id - 1];

        return {
            key: 'best-weekday',
            title: 'Beste weeksdag',
            value: day,
            sentence: `Geleenthede op ${day} het die hoogste gemiddelde bywoning: ${this.pct(best.attendance)}% oor ${best.count} geleenthede.`,
            action: `Beplan groot geleenthede op ${this.plural(day)}`,
        };
    }

    private worstWeekday(groups: GroupStat<number>[]): KeyFinding | null {
        if (groups.length < 2) return null;
        const worst = groups[groups.length - 1];
        const day = WEEKDAYS[worst._id - 1];

        return {
            key: 'worst-weekday',
            title: 'Swakste weeksdag',
            value: day,
            sentence: `Geleenthede op ${day} het die laagste gemiddelde bywoning: ${this.pct(worst.attendance)}% oor ${worst.count} geleenthede.`,
            action: `Vermy ${this.plural(day)} vir geleenthede wat hoë bywoning nodig het`,
        };
    }

    private bestMonth(groups: GroupStat<number>[]): KeyFinding | null {
        if (groups.length < 2) return null;
        const best = groups[0];
        const month = MONTHS[best._id - 1];

        return {
            key: 'best-month',
            title: 'Beste maand',
            value: month,
            sentence: `Geleenthede in ${month} het die hoogste gemiddelde bywoning: ${this.pct(best.attendance)}% oor ${best.count} geleenthede.`,
            action: `Skeduleer belangrike geleenthede in ${month}`,
        };
    }

    private bestType(groups: GroupStat<EventType>[]): KeyFinding | null {
        if (groups.length < 2) return null;
        const best = groups[0];
        const label = EVENT_TYPE_LABELS[best._id];

        return {
            key: 'best-type',
            title: 'Beste tipe geleentheid',
            value: label,
            sentence: `${label}-geleenthede het die hoogste gemiddelde bywoning: ${this.pct(best.attendance)}% oor ${best.count} geleenthede.`,
            action: `Bied meer ${label}-geleenthede aan`,
        };
    }

    private noShowFinding(stats: AverageStat[]): KeyFinding | null {
        const stat = stats[0];
        if (!stat) return null;
        const rate = this.pct(stat.value);
        // Om 'n no-show-koers r te vergoed, moet met r / (1 - r) oorbespreek word, nie met r nie.
        const overbook = this.pct(stat.value / (1 - Math.min(stat.value, 0.99)));

        return {
            key: 'no-show-rate',
            title: 'Gemiddelde no-show-koers',
            value: rate,
            sentence: `Gemiddeld daag ${rate}% van die mense wat ingeskryf het nie op nie (${stat.count} geleenthede).`,
            action: `Stuur 'n herinnering die dag voor die geleentheid en oorbespreek met ongeveer ${overbook}%`,
        };
    }

    private unusedSeatsFinding(stats: AverageStat[]): KeyFinding | null {
        const stat = stats[0];
        if (!stat) return null;
        const seats = Math.round(stat.value);

        return {
            key: 'unused-seats',
            title: 'Gemiddelde onbenutte sitplekke',
            value: seats,
            sentence: `Gemiddeld bly ${seats} sitplekke per geleentheid leeg (${stat.count} geleenthede).`,
            action: `Kies kleiner lokale of verlaag die kapasiteit met ongeveer ${seats} sitplekke`,
        };
    }

    private costFinding(stats: AverageStat[]): KeyFinding | null {
        const stat = stats[0];
        if (!stat) return null;
        const cost = Math.round(stat.value);

        return {
            key: 'cost-per-attendee',
            title: 'Koste per werklike bywoner',
            value: cost,
            sentence: `Elke persoon wat werklik opgedaag het, het gemiddeld R${cost} gekos (${stat.count} geleenthede).`,
            action: `Gebruik R${cost} per bywoner as maatstaf wanneer begrotings goedgekeur word`,
        };
    }

    private weakestCategoryFinding(categories: CategoryStat[]): KeyFinding | null {
        if (categories.length < 2) return null;
        const weakest = categories[0];

        return {
            key: 'weakest-review-category',
            title: 'Swakste resensie-kategorie',
            value: weakest._id,
            sentence: `"${weakest._id}" kry die laagste gemiddelde telling: ${weakest.avgScore.toFixed(1)} uit 5 oor ${weakest.eventCount} geleenthede.`,
            action: `Fokus volgende keer se verbeterings op "${weakest._id}"`,
        };
    }

    private ratingFinding(groups: GroupStat<string>[]): KeyFinding | null {
        const high = groups.find((group) => group._id === 'high');
        const low = groups.find((group) => group._id === 'low');
        if (!high || !low) return null;

        const highPct = this.pct(high.attendance);
        const lowPct = this.pct(low.attendance);

        return {
            key: 'rating-vs-attendance',
            title: 'Gradering teenoor bywoning',
            value: highPct - lowPct,
            sentence: `Geleenthede met 'n gradering van 4 of hoër het gemiddeld ${highPct}% bywoning, teenoor ${lowPct}% vir geleenthede onder 3.`,
            action: highPct > lowPct
                ? 'Gebruik hoog-gegradeerde geleenthede as sjabloon vir nuwe beplanning'
                : 'Goeie resensies lei nie tot hoër bywoning nie; fokus eerder op bemarking',
        };
    }

    private pct(rate: number): number {
        return Math.round(rate * 100);
    }

    private plural(day: string): string {
        return day.replace(/dag$/, 'dae');
    }
}
