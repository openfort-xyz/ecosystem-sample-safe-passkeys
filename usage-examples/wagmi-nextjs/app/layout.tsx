import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RapidSafe Wallet - Demo',
  description: 'A demo of RapidSafe Wallet integration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
