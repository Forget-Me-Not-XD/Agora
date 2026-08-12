// ========== Exports: ==========
export interface SsoProfile {
    ssoId: string;
    email: string;
    name: string;
    surname: string;
}

export type SsoDone = (error: Error | null, profile?: SsoProfile) => void;