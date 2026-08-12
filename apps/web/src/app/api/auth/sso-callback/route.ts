// ========== Imports: ==========
import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { completeSsoLoginAction } from '@/lib/actions/auth.actions';

export async function GET(request: NextRequest): Promise<void> {
    const accessToken  = request.nextUrl.searchParams.get('accessToken');
    const refreshToken = request.nextUrl.searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
        redirect('/login?error=sso_failed');
    }

    await completeSsoLoginAction(accessToken, refreshToken);
}
