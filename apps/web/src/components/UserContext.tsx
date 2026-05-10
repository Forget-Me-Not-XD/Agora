'use client';

import { createContext, useContext } from 'react';
import type { MockUser } from '@/lib/mock-data';
import { MOCK_CURRENT_USER } from '@/lib/mock-data';

const UserContext = createContext<MockUser>(MOCK_CURRENT_USER);

export function UserProvider({
    user,
    children,
}: {
    user: MockUser;
    children: React.ReactNode;
}) {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): MockUser {
    return useContext(UserContext);
}