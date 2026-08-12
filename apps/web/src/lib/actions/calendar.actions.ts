'use server';

// ========== Imports: ==========
import { cookies } from 'next/headers';
import { getCalendarStatus, type CalendarStatus } from '@/lib/api/calendar';
import { COOKIE_NAME } from '@/lib/auth-cookies';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export async function getCalendarStatusAction(): Promise<CalendarStatus | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  return getCalendarStatus(token);
}

export async function getGoogleCalendarConnectUrlAction(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/v1/calendar/google/connect`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
    cache:   'no-store',
  });

  return res.headers.get('location');
}

export async function getMicrosoftCalendarConnectUrlAction(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/v1/calendar/microsoft/connect`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
    cache:   'no-store',
  });

  return res.headers.get('location');
}

export async function disconnectGoogleCalendarAction(): Promise<{ error?: string }> {
  const token = cookies().get(COOKIE_NAME)?.value;

  try {
    await fetch(`${API_URL}/api/v1/calendar/google`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    });
    return {};
  } catch {
    return { error: 'Kon nie Google Kalender ontkoppel nie.' };
  }
}

export async function disconnectMicrosoftCalendarAction(): Promise<{ error?: string }> {
  const token = cookies().get(COOKIE_NAME)?.value;

  try {
    await fetch(`${API_URL}/api/v1/calendar/microsoft`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    });
    return {};
  } catch {
    return { error: 'Kon nie Outlook Kalender ontkoppel nie.' };
  }
}
