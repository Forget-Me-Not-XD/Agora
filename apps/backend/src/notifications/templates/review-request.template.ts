// ========== Imports: ==========
import { MailContent, escapeHtml } from './mail-content';

export function reviewRequestEmail(name: string, eventTitle: string, reviewUrl: string): MailContent {
    const safeName = escapeHtml(name);
    const safeTitle = escapeHtml(eventTitle);
    const safeUrl = escapeHtml(reviewUrl);

    return {
        subject: `Hoe was ${eventTitle}?`,
        html: [
            '<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">',
            `<h1 style="font-size: 22px;">Hallo ${safeName}</h1>`,
            `<p style="font-size: 16px; line-height: 1.5;">Dankie dat jy <strong>${safeTitle}</strong> bygewoon het. Ons hoor graag wat jy daarvan gedink het.</p>`,
            `<p style="margin: 24px 0;"><a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Gee terugvoer</a></p>`,
            `<p style="font-size: 13px; color: #6b7280;">Werk die knoppie nie? Kopieer hierdie skakel in jou blaaier: ${safeUrl}</p>`,
            '</div>',
        ].join(''),
        text: [
            `Hallo ${name}`,
            '',
            `Dankie dat jy ${eventTitle} bygewoon het. Ons hoor graag wat jy daarvan gedink het.`,
            '',
            `Gee terugvoer: ${reviewUrl}`,
        ].join('\n'),
    };
}
