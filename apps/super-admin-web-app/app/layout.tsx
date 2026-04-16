import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RESQ-Link Super Admin',
  description: 'Manage responders, dispatchers, and civilian accounts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AdminAuthProvider>
          <div className="min-h-screen text-slate-100">
            <Navigation />
            <main className="container mx-auto px-4 py-8">{children}</main>
          </div>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
