import type { KeyFinding } from '../api/analytics';

// Hou dit gelyk aan die web se components/KeyFindings.tsx, sodat albei presies dieselfde syfers wys.

// Die backend kan 'n bevinding sonder waarde stuur: as genoeg geleenthede se tipe via die API op
// null gestel is, kom "Beste tipe" terug met "undefined" in die sin. Wys so een eerder glad nie.
export function usableFindings(findings: KeyFinding[]): KeyFinding[] {
  return findings.filter((finding) => finding.value !== null && finding.value !== undefined);
}

// 'n Onbekende key, soos 'n bevinding wat later in die backend bykom, wys die waarde net soos dit is.
export function formatFindingValue(finding: KeyFinding): { value: string; unit?: string } {
  const { key, value } = finding;
  if (typeof value !== 'number') return { value: String(value) };

  switch (key) {
    case 'no-show-rate':
      return { value: `${value}%` };
    case 'unused-seats':
      return { value: String(value), unit: value === 1 ? 'sitplek' : 'sitplekke' };
    case 'cost-per-attendee':
      return { value: `R ${value.toLocaleString('af-ZA')}` };
    case 'rating-vs-attendance':
      return { value: `${value > 0 ? '+' : ''}${value}`, unit: 'persentasiepunte' };
    default:
      return { value: String(value) };
  }
}
