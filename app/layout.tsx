import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ROMEBOIS — Barbershop POS",
  description: "Professional barbershop point of sale and ERP system",
};

const navItems = [
  { href: "/", label: "POS", icon: "💈" },
  { href: "/booking", label: "Booking", icon: "📅" },
  { href: "/members", label: "Members", icon: "👥" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full flex bg-zinc-950 text-zinc-100">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950">
          {/* Brand */}
          <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-800">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">
              R
            </div>
            <div>
              <span className="text-lg font-bold tracking-widest text-amber-500">
                ROMEBOIS
              </span>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Barbershop ERP
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors text-sm font-medium"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-zinc-800">
            <p className="text-[11px] text-zinc-600">
              &copy; {new Date().getFullYear()} ROMEBOIS
            </p>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
