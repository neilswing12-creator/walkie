import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { CelebrateProvider } from "@/components/ui/Celebrate";
import { WalkieDefs } from "@/components/mascot/WalkieDefs";

export const metadata: Metadata = {
  metadataBase: new URL("https://walkie.run"),
  title: { default: "Walkie — Every step is an adventure", template: "%s · Walkie" },
  description: "Walk, run, collect adorable pets and build your own cozy pet shop. Walkie turns real-world steps into a world that grows with you.",
  applicationName: "Walkie",
  keywords: ["walking app", "running tracker", "step counter", "fitness game", "virtual pet", "gamified fitness", "husky"],
  authors: [{ name: "Walkie" }],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "https://walkie.run", siteName: "Walkie", title: "Walkie — Every step is an adventure", description: "Walk, run, collect adorable pets and build your own cozy pet shop.", locale: "en_US" },
  twitter: { card: "summary_large_image", title: "Walkie — Every step is an adventure", description: "Walk, run, collect adorable pets and build your own cozy pet shop." },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: "Walkie", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F4F6F8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <WalkieDefs />
        <ToastProvider>
          <CelebrateProvider>{children}</CelebrateProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
