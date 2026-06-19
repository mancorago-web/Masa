import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HeaderTimer from "@/components/HeaderTimer";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MASA",
  description: "Sistema de gestión de pizzería",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MASA",
  },
  openGraph: {
    title: "MASA",
    description: "Sistema de gestión de pizzería",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="apple-touch-icon" href="/icons/masa2.jpeg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MASA" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#16a34a" />
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />
        <script src="https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js" async></script>
        <script src="https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore-compat.js" async></script>
        <script src="https://www.gstatic.com/firebasejs/12.13.0/firebase-auth-compat.js" async></script>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
            });
          }
          window.addEventListener('error', function(e) {
            if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
              location.href = location.pathname + '?t=' + Date.now();
            }
          }, true);
          // Catch chunk load errors that happen before React mounts
          window.__NEXT_PRELOAD_ERRORS = [];
          window.addEventListener('DOMContentLoaded', function() {
            if (window.__NEXT_PRELOAD_ERRORS.length > 0) location.href = location.pathname + '?t=' + Date.now();
          });
        `}} />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        <AuthProvider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <div className="bg-gray-800 text-white py-2 px-4 flex justify-between items-center">
              <div className="font-bold text-sm md:text-base">📅 Sincronizado</div>
              <HeaderTimer />
            </div>
            <div style={{ flex: 1 }}>
              {children}
            </div>
            <footer style={{
              backgroundColor: '#1f2937',
              color: 'white',
              textAlign: 'center',
              padding: '12px',
              fontSize: '14px',
              flexShrink: 0,
            }}>
              MASA © 2026 | v1.0.0
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
