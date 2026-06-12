import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Sports Editor — Intelligent Highlight Generator',
  description:
    'Transform sports videos into viral YouTube Shorts with AI-powered scene detection, smart clip generation, and professional editing tools.',
  keywords: ['AI', 'sports', 'video editor', 'highlights', 'YouTube Shorts'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-dark-900 text-white min-h-screen`}>
        {/* Background ambient glow */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent-purple/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-pink/5 blur-[120px]" />
          <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-accent-cyan/3 blur-[100px]" />
        </div>

        {children}

        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '!bg-dark-800 !text-white !border !border-white/10',
            duration: 4000,
            style: {
              background: '#13131a',
              color: '#f0f0f5',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
