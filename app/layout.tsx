import { Inter } from 'next/font/google';
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Meal Plan App',
  description: 'Application de planification des repas familiale',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="h-full">
      <body className={inter.className + ' h-full'}>{children}</body>
    </html>
  )
}