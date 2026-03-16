"use client";

import { usePathname } from "next/navigation";
import { Upload, UserCircle, Check } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSelector } from "@/components/ui/language-selector";

function getStepIndex(pathname: string): number {
  if (pathname === "/onboarding") return 0;
  if (pathname.startsWith("/onboarding/profile")) return 1;
  return 0;
}

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  totalLabel?: string;
}

export function OnboardingLayout({ children, title, subtitle, totalLabel }: OnboardingLayoutProps) {
  const pathname = usePathname();
  const currentStep = getStepIndex(pathname);
  const { t } = useTranslation();

  const STEPS = [
    {
      key: "content",
      label: t("onboarding.sidebarStep1Label"),
      description: t("onboarding.sidebarStep1Desc"),
      icon: Upload,
      href: "/onboarding",
    },
    {
      key: "profile",
      label: t("onboarding.sidebarStep2Label"),
      description: t("onboarding.sidebarStep2Desc"),
      icon: UserCircle,
      href: "/onboarding/profile",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-n-50">
      <header className="border-b border-n-200 bg-n-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Derivé" width={28} height={28} className="h-7 w-7 rounded-[12px]" />
            <span className="font-heading text-base font-bold text-n-900">Derivé</span>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-80 shrink-0 self-start p-4 lg:block">
          <div className="rounded-[32px] border border-n-200 bg-n-0 p-6 shadow-sm">
            <p className="mb-6 text-[13px] text-n-500">
              {t("onboarding.sidebarIntro")}
            </p>
            <nav className="space-y-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;

                return (
                  <div
                    key={s.key}
                    className={`flex w-full items-start gap-3.5 rounded-[20px] px-4 py-3.5 text-left transition-colors ${
                      isCurrent ? "bg-lavender-50" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isCompleted
                          ? "bg-mint-400 text-white"
                          : isCurrent
                          ? "bg-lavender-400 text-white"
                          : "bg-n-200 text-n-500"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          isCurrent || isCompleted ? "text-n-900" : "text-n-500"
                        }`}
                      >
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-n-400">
                        {s.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden p-6 lg:p-10">
          {/* Mobile progress indicator */}
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    i < currentStep
                      ? "bg-mint-400 text-white"
                      : i === currentStep
                      ? "bg-lavender-400 text-white"
                      : "bg-n-200 text-n-500"
                  }`}
                >
                  {i < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-8 rounded-full transition-colors ${
                      i < currentStep ? "bg-mint-400" : "bg-n-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mb-6">
            {totalLabel && (
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[1px] text-lavender-400">
                {totalLabel}
              </p>
            )}
            <h1 className="font-heading text-[26px] font-bold tracking-tight text-n-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-base leading-relaxed text-n-500">{subtitle}</p>
            )}
          </div>
          <div className="flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
}
