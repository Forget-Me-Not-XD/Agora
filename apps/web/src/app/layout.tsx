import type { Metadata } from 'next';
import '@/theme/globals.css';

export const metadata: Metadata = {
  title: 'Akademia Funksiebestuurstelsel',
  description: 'Bestuur funksies, RSVPs en bywoning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="af" suppressHydrationWarning>
      <body className="bg-app text-app min-h-screen">
        {children}
      </body>
    </html>
  );
}
