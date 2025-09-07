export const metadata = {
  title: 'Sentient Mosaic',
  description: 'Community mosaic for Sentient',
};

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
