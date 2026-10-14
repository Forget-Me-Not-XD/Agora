// ========== Imports: ==========
import { MailContent, escapeHtml } from './mail-content';

export function passwordResetEmail(name: string, resetUrl: string): MailContent {
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(resetUrl);

    return {
        subject: 'Herstel jou Agora-wagwoord',
        html: [
            '<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">',
            `<h1 style="font-size: 22px;">Hallo ${safeName}</h1>`,
            '<p style="font-size: 16px; line-height: 1.5;">Ons het \'n versoek ontvang om jou wagwoord te herstel. Die skakel hieronder werk een keer en verval oor 30 minute.</p>',
            `<p style="margin: 24px 0;"><a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Herstel wagwoord</a></p>`,
            `<p style="font-size: 13px; color: #6b7280;">Werk die knoppie nie? Kopieer hierdie skakel in jou blaaier: ${safeUrl}</p>`,
            '<p style="font-size: 13px; color: #6b7280;">Het jy nie hierdie versoek gerig nie? Ignoreer dan hierdie e-pos; jou wagwoord bly dieselfde.</p>',
            '</div>',
        ].join(''),
        text: [
            `Hallo ${name}`,
            '',
            'Ons het \'n versoek ontvang om jou wagwoord te herstel. Die skakel hieronder werk een keer en verval oor 30 minute.',
            '',
            `Herstel wagwoord: ${resetUrl}`,
            '',
            'Het jy nie hierdie versoek gerig nie? Ignoreer dan hierdie e-pos; jou wagwoord bly dieselfde.',
        ].join('\n'),
    };
}

export function passwordChangedEmail(name: string): MailContent {
    const safeName = escapeHtml(name);

    return {
        subject: 'Jou Agora-wagwoord is verander',
        html: [
            '<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">',
            `<h1 style="font-size: 22px;">Hallo ${safeName}</h1>`,
            '<p style="font-size: 16px; line-height: 1.5;">Jou wagwoord is so pas via \'n herstelskakel verander, en jy is op al jou ander toestelle uitgemeld.</p>',
            '<p style="font-size: 13px; color: #6b7280;">Was dit nie jy nie? Kontak dadelik die administrateur.</p>',
            '</div>',
        ].join(''),
        text: [
            `Hallo ${name}`,
            '',
            'Jou wagwoord is so pas via \'n herstelskakel verander, en jy is op al jou ander toestelle uitgemeld.',
            '',
            'Was dit nie jy nie? Kontak dadelik die administrateur.',
        ].join('\n'),
    };
}

export function ssoPasswordResetEmail(name: string): MailContent {
    const safeName = escapeHtml(name);

    return {
        subject: 'Jou Agora-rekening gebruik Google of Microsoft',
        html: [
            '<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">',
            `<h1 style="font-size: 22px;">Hallo ${safeName}</h1>`,
            '<p style="font-size: 16px; line-height: 1.5;">Ons het \'n versoek ontvang om jou wagwoord te herstel, maar jou rekening het nie \'n wagwoord nie. Jy meld aan met Google/Microsoft.</p>',
            '<p style="font-size: 16px; line-height: 1.5;">Kies op die aanmeldbladsy "Meld aan met Google" of "Meld aan met Microsoft".</p>',
            '<p style="font-size: 13px; color: #6b7280;">Het jy nie hierdie versoek gerig nie? Ignoreer dan hierdie e-pos.</p>',
            '</div>',
        ].join(''),
        text: [
            `Hallo ${name}`,
            '',
            'Ons het \'n versoek ontvang om jou wagwoord te herstel, maar jou rekening het nie \'n wagwoord nie. Jy meld aan met Google/Microsoft.',
            '',
            'Kies op die aanmeldbladsy "Meld aan met Google" of "Meld aan met Microsoft".',
            '',
            'Het jy nie hierdie versoek gerig nie? Ignoreer dan hierdie e-pos.',
        ].join('\n'),
    };
}
