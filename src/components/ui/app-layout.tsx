"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/ui/language-selector";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const NAV_LINKS = [
    { label: t("common.dashboard"), href: "/dashboard" },
    { label: t("common.profile"), href: "/profile" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-n-50">
      <header className="border-b border-n-200 bg-n-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Derivé" width={36} height={36} className="h-9 w-9 rounded-[12px]" />
              <span className="font-heading text-xl font-bold text-n-900">Derivé</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors ${
                      isActive
                        ? "bg-lavender-50 text-lavender-500"
                        : "text-n-500 hover:text-n-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full text-n-400 transition-colors hover:bg-n-100 hover:text-n-700"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
