import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookies';

export function GET(request: Request) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    clearAuthCookies(response.cookies);
    return response;
}
