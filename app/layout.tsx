import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { getOptionalUser } from "@/lib/auth/server";
import { headerNavConfig } from "@/lib/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Starter App Template",
  description: "Dark-first Next.js + Tailwind starter template",
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
        className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased`}
      >
        <div className="h-full bg-background text-foreground">
          <div className="fixed inset-x-0 top-0 z-50">
            <AppHeader
              brandLabel={headerNavConfig.brand.label}
              brandHref={headerNavConfig.brand.href}
              navItems={navItems}
            />
          </div>
          <main className="fixed inset-x-0 bottom-0 top-20 overflow-y-auto overscroll-contain">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
