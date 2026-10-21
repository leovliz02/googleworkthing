import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NUS Campus Transit Hub',
  description: 'Real-time NUS shuttle bus tracker and smart class commute planner',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
