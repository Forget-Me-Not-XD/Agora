import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import '@/theme/globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
  title: 'AGORA',
  description: 'Bestuur funksies, RSVPs en bywoning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="af" className={inter.className} suppressHydrationWarning>
      <body className="bg-app text-app min-h-screen" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}