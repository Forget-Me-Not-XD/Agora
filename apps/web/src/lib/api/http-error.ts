/**
 * Die foutboodskap vir 'n API-oproep wat misluk het.
 *
 * Die statuskode bly voor die boodskap, want dit help wanneer 'n fout op die skerm beland waar
 * ons dit nie verwag het nie. 'n 429 is die enigste uitsondering: dit kom van die throttler af
 * en die backend se boodskap is al klaar in Afrikaans en vir die gebruiker bedoel.
 */
export function httpErrorMessage(res: Response, body: { message?: string | string[] }): string {
    const raw = body.message ?? res.statusText;
    const message = typeof raw === 'string' ? raw : raw.join(', ');

    return res.status === 429 ? message : `[${res.status}] ${message}`;
}
