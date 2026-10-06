// =========== Imports: =========== 
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
    value: number,
    count: number;
}

@Injectable()
