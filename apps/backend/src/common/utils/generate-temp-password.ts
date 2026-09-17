import { randomInt } from 'crypto';

// Sonder I/O/0/1 om verwarring op 'n skerm of oor die telefoon te vermy
const UPPER   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER   = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS  = '23456789';
const SYMBOLS = '!@#$%^&*';
const ALL     = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(chars: string): string {
    return chars[randomInt(chars.length)];
}

/**
 
Genereer 'n tydelike wagwoord wat CreateUserDto se kompleksiteitsreël voldoen
(hoofletter + kleinletter + syfer + simbool), vir admin-geïnisieerde herstel.*/
export function generateTempPassword(length = 12): string {
    const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
    const rest = Array.from({ length: length - required.length }, () => pick(ALL));
    const chars = [...required, ...rest];

    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}