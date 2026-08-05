// ========== Imports: ==========
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, Lock, Server } from 'lucide-react';

export const metadata: Metadata = {
  title: 'POPIA & Privaatheid — AGORA',
  description: 'Hoe AGORA persoonlike inligting versamel, gebruik en beskerm ingevolge POPIA.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-[16px] border p-6 mb-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <h2 className="text-[15px] font-black mb-3" style={{ color: 'var(--color-primary)' }}>
        {title}
      </h2>
      <div className="text-[13px] space-y-2" style={{ color: 'var(--color-text-subtle)', lineHeight: '1.7' }}>
        {children}
      </div>
    </section>
  );
}

export default function PopiaPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">

      {/* Kop */}
      <div className="mb-6">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
          POPIA-kennisgewing &amp; Privaatheidsbeleid
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>
          Laas opgedateer: 4 Augustus 2026
        </p>
      </div>

      {/* Eerlikheid vooraf: wat AGORA is en is nie */}
      <div
        className="rounded-[12px] border px-4 py-3 mb-6"
        style={{ background: 'var(--color-jwt-bg)', borderColor: 'var(--color-primary)' }}
      >
        <p className="text-[12px] font-black mb-1.5" style={{ color: 'var(--color-primary)' }}>
          Belangrike konteks
        </p>
        <p className="text-[12px]" style={{ color: 'var(--color-text-subtle)', lineHeight: '1.6' }}>
          AGORA is 'n universiteits-kapstoneprojek (studente-bouwerk), nie 'n geregistreerde
          maatskappy nie. Ons pas POPIA se beginsels toe waar tegnies moontlik, maar sekere
          formele vereistes (soos 'n geregistreerde Inligtingsbeampte by die Inligting-Regulator)
          is nog nie in plek nie. Hierdie bladsy lys daardie gapings eerlik onderaan — ons maak
          geen aansprake wat ons nie kan bewys nie.
        </p>
      </div>

      <Section title="1. Watter persoonlike inligting ons versamel">
        <p>By registrasie versamel ons:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Naam en van</li>
          <li>E-posadres</li>
          <li>Wagwoord — word <strong>nooit</strong> in gewone teks gestoor nie; dit word met
            bcrypt (12 rondtes salting) verhaas voordat dit die databasis bereik, en die
            oorspronklike wagwoord word nêrens behou nie</li>
          <li>Rol (GAS, STUDENT, DOSENT of ADMIN)</li>
          <li>Studiesentrum — opsioneel, slegs vir STUDENT-rekeninge</li>
        </ul>
        <p className="mt-2">
          By elke aanmelding, registrasie en wysiging aan beskermde data hou ons outomaties
          'n oudit-rekord: gebruiker-ID, aksie, IP-adres, blaaier/toestel-inligting (user agent)
          en tydstempel.
        </p>
      </Section>

      <Section title="2. Waarvoor ons dit gebruik">
        <ul className="list-disc pl-5 space-y-1">
          <li>Stelseltoegangsbeheer (aanmelding en rol-gebaseerde toestemmings)</li>
          <li>Om jou aan geleenthede, RSVP's en bywoningsrekords te koppel</li>
          <li>Sekuriteit en aanspreeklikheid — die oudit-rekord bewys wie wat wanneer gedoen het</li>
        </ul>
        <p className="mt-2">
          Ons gebruik <strong>nie</strong> jou data vir bemarking nie, en verkoop of deel dit
          <strong> nie</strong> met derde partye vir hul eie doeleindes nie.
        </p>
      </Section>

      <Section title="3. Waar dit gestoor word">
        <div className="flex items-start gap-2">
          <Server size={16} className="shrink-0 mt-0.5" />
          <p>
            Die databasis (MongoDB) loop op ons eie self-gehoste k3s-Kubernetes-cluster
            (3 Raspberry Pi's) — nie op 'n derdeparty-wolkdiens soos AWS of MongoDB Atlas nie.
            Kubernetes NetworkPolicy-reëls beperk watter interne dienste met die databasis mag praat.
          </p>
        </div>
      </Section>

      <Section title="4. Data in oordrag &amp; die Cloudflare-sertifikaat">
        <div className="flex items-start gap-2 mb-2">
          <Lock size={16} className="shrink-0 mt-0.5" />
          <p>
            Ons cluster sit agter CGNAT, dus gebruik ons 'n Cloudflare Tunnel (<code>cloudflared</code>)
            vir publieke HTTPS-toegang. Die tonnel maak net 'n uitgaande verbinding oop — daar is
            geen binnekomende poort of sertifikaatlêer op ons kant nie. Die sertifikaat wat jou
            blaaier sien, word deur Cloudflare se Universal SSL-diens uitgereik en outomaties hernu.
          </p>
        </div>
        <div className="flex items-start gap-2 mb-2">
          <ShieldCheck size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-green)' }} />
          <p>Ons het dit self geverifieer teen die publieke domein (4 Augustus 2026):</p>
        </div>
        <pre
          className="rounded-[10px] border p-3 text-[11px] overflow-x-auto"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        >
{`Uitreiker (issuer):      Google Trust Services (WE1) — via Cloudflare Universal SSL
Onderwerp (subject):     use-agora.com
Alt. name (SAN):         use-agora.com, *.use-agora.com
Geldig vanaf:            12 Julie 2026
Geldig tot:               10 Oktober 2026
Geverifieer teen:         web.use-agora.com:443 en api.use-agora.com:443`}
        </pre>
      </Section>

      <Section title="5. Wie het toegang">
        <ul className="list-disc pl-5 space-y-1">
          <li>Jy kan altyd net jou eie profiel wysig, tensy jy ADMIN is</li>
          <li>Gebruikerslyste is beperk tot ADMIN- en DOSENT-rolle</li>
          <li>CSV-uitvoer van data is streng ADMIN-only</li>
        </ul>
      </Section>

      <Section title="6. Derde partye">
        <ul className="list-disc pl-5 space-y-1">
          <li>Cloudflare — dra net versleutelde verkeer deur (netwerk-deurvoer); ontvang geen
            kopie van ons databasis nie</li>
          <li>GitHub Container Registry (GHCR) — stoor slegs houerbeelde (kode), geen
            persoonlike data nie</li>
        </ul>
        <p className="mt-2">
          Ons integreer tans <strong>geen</strong> bemarkings- of snuffel-derdepartye
          (analytics/trackers) nie.
        </p>
      </Section>

      <Section title="7. Jou regte ingevolge POPIA">
        <ul className="list-disc pl-5 space-y-1">
          <li>Toegang tot jou eie data — sigbaar in jou profiel</li>
          <li>Regstelling — jy (of 'n admin) kan jou profiel wysig</li>
          <li>Beswaar teen verwerking — kontak ons (sien punt 9)</li>
        </ul>
      </Section>

      <Section title="8. Bekende gapings — opvolgpunte">
        {[
          'Geen self-diens "verwyder my rekening"-funksie nie (reg op uitwissing) — die backend het tans slegs GET/PATCH op gebruikers, geen DELETE nie.',
          'Geen outomatiese bewaartermyn of vervalbeleid vir oudit-logs of onaktiewe rekeninge nie.',
          'Geen geregistreerde Inligtingsbeampte by die Inligting-Regulator nie — akademiese prototipe, nie \'n geregistreerde regspersoon nie.',
          'Die "welkoms-e-pos" ná registrasie bestaan tans net as \'n bediener-loglêer — daar word nog geen werklike e-pos gestuur nie.',
        ].map((gap) => (
          <div key={gap} className="flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-red)' }} />
            <p>{gap}</p>
          </div>
        ))}
      </Section>

      <Section title="9. Kontak">
        <p>
          Vir vrae oor hierdie beleid of jou data, kontak die AGORA-spanne via die
          universiteitsmodule-kanaal. <em>(Opvolgpunt: 'n vaste kontak-e-posadres moet hier
          bygevoeg word sodra die span dit formaliseer.)</em>
        </p>
      </Section>

      <Link
        href="/register"
        className="inline-block text-[13px] font-bold mt-2"
        style={{ color: 'var(--color-primary)' }}
      >
        ← Terug na registrasie
      </Link>
    </div>
  );
}