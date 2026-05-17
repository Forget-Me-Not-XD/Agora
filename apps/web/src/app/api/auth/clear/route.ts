import { NextResponse } from 'next/server';

export function GET(request: Request) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('akademia_token');
    response.cookies.delete('akademia_refresh_token');
    response.cookies.delete('akademia_user');
    return response;
}
