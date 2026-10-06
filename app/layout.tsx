import { Inter } from 'next/font/google';
import { auth, SessionProvider } from '@/lib/auth';
import Nav from './Nav';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Meal Plan App',
  description: 'Application de planification des repas familiale',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="fr" className="h-full">
      <body className={inter.className + ' h-full bg-gray-50 text-xs sm:text-sm'}>
        <SessionProvider session={session}>
          <Nav session={session} />
          <div className="min-h-screen">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
