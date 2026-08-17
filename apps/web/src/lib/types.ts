// ── Mirrors apps/mobile/src/api/client.ts & stores/auth.store.ts ───────────
// Keep in sync with the backend DTO definitions.

export type UserTag = 'FINANCE';

export interface UserResponse {
  id: string;
  name: string;
  surname: string;
  email: string;
  role: 'ADMIN' | 'DOSENT' | 'GAS' | 'STUDENT';
  studyCenter: string;
  isActive: boolean;
  createdAt: string;
  title: string;
  tags: UserTag[];
  ssoProvider: 'GOOGLE' | 'MICROSOFT' | null;
  calendars: {
    google: boolean;
    microsoft: boolean;
  };
  mustChangePassword: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserResponse;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  surname: string;
  email: string;
  password: string;
  role: 'GAS' | 'STUDENT';
  studyCenter: string;
}

export type UserRole = UserResponse['role'];
