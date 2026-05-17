/**
 * Centralised event registry.
 * Every message published or consumed must use these constants —
 * never raw strings — to prevent typos and routing bugs.
 *
 * Routing key convention:  <domain>.<entity>.<action>
 *   auth.user.registered
 *   auth.user.login
 *   notification.email.welcome
 *   audit.log.create
 */

export const EXCHANGES = {
   AUTH: 'auth.events',
   NOTIFICATION: 'notification.events',
   AUDIT: 'audit.events',
   DEAD_LETTER: 'dlx.events',
} as const;

export const ROUTING_KEYS = {
   // Auth Domain:
   USER_REGISTERED: 'auth.user.registered',
   USER_LOGIN: 'auth.user.login',
   USER_LOGOUT: 'auth.user.logout',
   USER_FAILED_LOGIN: 'auth.user.failed-login',

   // Notification Domain:
   NOTIFY_EMAIL_WELCOME:  'notification.email.welcome',
   NOTIFY_EMAIL_RSVP:     'notification.email.rsvp',
   NOTIFY_SMS_REMINDER:   'notification.sms.reminder',
   NOTIFY_PUSH_GENERIC:   'notification.push.generic',

   // Audit domain
   AUDIT_LOG_CREATE: 'audit.log.create',
} as const;

export const QUEUES = {
   NOTIFICATION_EMAIL: 'queue.notification.email',
   NOTIFICATION_SMS: 'queue.notification.sms',
   NOTIFICATION_PUSH: 'queue.notification.push',
   AUDIT_LOG: 'queue.audit.log',
   DEAD_LETTER: 'queue.dead-letter',
} as const;

// ========== Payload type definitions: ==========
export interface UserRegisteredEvent {
   userId: string;
   email: string;
   name: string;
   role: string;
   timestamp: string;
}

export interface UserLoginEvent {
   userId: string;
   email: string;
   ipAddress: string;
   userAgent: string;
   timestamp: string;
}

export interface UserFailedLoginEvent {
   email: string;
   ipAddress: string;
   reason: string;
   timestamp: string;
}

export interface AuditLogEvent {
   userId: string | null;
   action: string;
   resource: string;
   resourceId?: string;
   ipAddress: string;
   userAgent: string;
   oldValue?: Record<string, unknown>;
   newValue?: Record<string, unknown>;
   statusCode: number;
   timestamp: string;
}