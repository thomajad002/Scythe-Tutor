import type { Metadata } from "next";
import { Cinzel, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { getOptionalUser } from "@/lib/auth/server";
import { headerNavConfig } from "@/lib/navigation";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: ["500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scythe Scoring Tutor",
  description: "Intelligent tutor for mastering Scythe end-game scoring",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getOptionalUser();
  const authItems = user ? headerNavConfig.authenticatedItems : headerNavConfig.unauthenticatedItems;
  const navItems = [...headerNavConfig.commonItems, ...authItems];

  return (
    <html lang="en" className="h-full overflow-hidden">
      <body
        className={`${plexSans.variable} ${plexMono.variable} ${cinzel.variable} h-full overflow-hidden antialiased`}
      >
        <div className="app-shell h-full bg-background text-foreground">
          <div className="atmosphere-layer" />
          <div className="fixed inset-x-0 top-0 z-50">
            <AppHeader
              brandLabel={headerNavConfig.brand.label}
              brandHref={headerNavConfig.brand.href}
              navItems={navItems}
            />
          </div>
          <main className="fixed inset-x-0 bottom-0 top-20 overflow-y-auto overscroll-contain px-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
