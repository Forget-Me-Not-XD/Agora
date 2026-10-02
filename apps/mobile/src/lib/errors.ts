import { isAxiosError } from 'axios';

interface ApiErrorBody {
    message?: string | string[];
}

function readApiMessage(err: unknown): string | undefined {
    if (!isAxiosError<ApiErrorBody>(err)) return undefined;
    const raw = err.response?.data?.message;
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (Array.isArray(raw) && raw.length > 0) return raw.join(', ');
    return undefined;
}

/**
 * Gee slegs die backend se boodskap terug (string of string[]), anders die fallback.
 * Gebruik dit waar 'n nie-API-fout nooit sy rou boodskap aan die gebruiker moet wys nie.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
    return readApiMessage(err) ?? fallback;
}

/**
 * Soos getApiErrorMessage, maar wys ook die boodskap van 'n gewone Error (bv. dié wat
 * ons stores self gooi). Axios se eie err.message ("Request failed with status code 500")
 * word doelbewus nie gewys nie.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
    const apiMessage = readApiMessage(err);
    if (apiMessage) return apiMessage;
    if (isAxiosError(err)) return fallback;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
}

export function getErrorStatus(err: unknown): number | undefined {
    return isAxiosError(err) ? err.response?.status : undefined;
}
