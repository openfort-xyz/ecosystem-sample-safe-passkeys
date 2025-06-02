import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rapidsafe Wallet - Demo',
  description: 'A demo of Rapidsafe Wallet integration',
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
