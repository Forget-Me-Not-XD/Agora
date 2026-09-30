import { isAxiosError } from 'axios';

interface ApiErrorBody {
    message?: string | string[];
}

export function getErrorMessage(err: unknown, fallback: string): string {

    if (isAxiosError<ApiErrorBody>(err)) {
        const raw = err.response?.data?.message;
        if (typeof raw === 'string' && raw.trim()) return raw;
        if (Array.isArray(raw) && raw.length > 0) return raw.join(', ');
        return fallback;
    }

    if (err instanceof Error && err.message) return err.message;
    return fallback;
    
}

export function getErrorStatus(err: unknown): number | undefined {
    return isAxiosError(err) ? err.response?.status : undefined;
}