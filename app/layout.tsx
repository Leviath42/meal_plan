import { Inter } from 'next/font/google';
import Link from 'next/link';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Meal Plan App',
  description: 'Application de planification des repas familiale',
};

function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-blue-600">Meal Plan</Link>
          <div className="flex gap-6">
            <Link
              href="/recipes"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Recettes
            </Link>
            <Link
              href="/ingredients"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Ingrédients
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={inter.className + ' h-full bg-gray-50'}>
        <Navigation />
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
