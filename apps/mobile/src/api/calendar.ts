// ========== Imports: ==========
import { apiClient } from './client';

export interface CalendarStatus {
    google: boolean;
    microsoft: boolean;
    googleAccountEmail: string | null;
    microsoftAccountEmail: string | null;
}

export async function getCalendarStatus(): Promise<CalendarStatus> {
    return apiClient.get<CalendarStatus>('/calendar/status');
}

// Gee die regte Google/Microsoft-toestemmingskoppeling terug as JSON (nie 'n
// rou HTTP-herleiding nie -- sien calendar.controller.ts se kommentaar oor
// waarom mobiel dit anders as web moet hanteer).
export async function getGoogleConnectUrl(): Promise<string> {
    const { url } = await apiClient.get<{ url: string }>('/calendar/google/connect?platform=mobile');
    return url;
}

export async function getMicrosoftConnectUrl(): Promise<string> {
    const { url } = await apiClient.get<{ url: string }>('/calendar/microsoft/connect?platform=mobile');
    return url;
}

export async function disconnectGoogleCalendar(): Promise<void> {
    return apiClient.delete<void>('/calendar/google');
}

export async function disconnectMicrosoftCalendar(): Promise<void> {
    return apiClient.delete<void>('/calendar/microsoft');
}
