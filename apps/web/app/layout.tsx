import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GYM — Workout Tracker",
  description: "Log workouts, track exercises, and build routines.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GYM",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    shortcut: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08080E",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('gym_theme');
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
}catch(e){
  document.documentElement.setAttribute('data-theme', 'dark');
}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${jakarta.variable} ${jetbrains.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
