import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://ummah.tengorra.com"),
  title: { default: "UmmahGuide", template: "%s · UmmahGuide" },
  description: "Find the next Jamat near you, read the Quran, and keep your prayers — one calm companion for Muslims.",
  openGraph: {
    title: "UmmahGuide",
    description: "Find the next Jamat near you, read the Quran, and keep your prayers.",
    url: "https://ummah.tengorra.com",
    siteName: "UmmahGuide",
    type: "website",
  },
  manifest: "/manifest.json",
  applicationName: "UmmahGuide",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "UmmahGuide" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B3D33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
