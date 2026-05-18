import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'Family Budget',
  description: 'Track family spending together',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Family Budget' },
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1 },
};

// Prevent theme flash on load
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch(e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" className={outfit.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-[family-name:var(--font-outfit)] bg-app text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
