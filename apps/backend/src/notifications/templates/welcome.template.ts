// ========== Imports: ==========
import { MailContent, escapeHtml } from './mail-content';

export function welcomeEmail(name: string): MailContent {
    const safeName = escapeHtml(name);

    return {
        subject: 'Welkom by Agora',
        html: [
            '<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">',
            `<h1 style="font-size: 22px;">Welkom, ${safeName}!</h1>`,
            '<p style="font-size: 16px; line-height: 1.5;">Jou Agora-rekening is gereed. Jy kan nou aanmeld om geleenthede te sien en jou plek te bespreek.</p>',
            '<p style="font-size: 13px; color: #6b7280;">Jy ontvang hierdie e-pos omdat \'n rekening met hierdie adres geskep is.</p>',
            '</div>',
        ].join(''),
        text: [
            `Welkom, ${name}!`,
            '',
            'Jou Agora-rekening is gereed. Jy kan nou aanmeld om geleenthede te sien en jou plek te bespreek.',
            '',
            'Jy ontvang hierdie e-pos omdat \'n rekening met hierdie adres geskep is.',
        ].join('\n'),
    };
}
