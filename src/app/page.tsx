"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronDown, Camera } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import DemoMoodBoard from "@/components/landing/DemoMoodBoard";
import DemoTasteProfile from "@/components/landing/DemoTasteProfile";
import DemoWorkspace from "@/components/landing/DemoWorkspace";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSelector } from "@/components/ui/language-selector";

/* ── Floating pill tags ── */
type FloatingTag = {
  text: string;
  color: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  dur: string;
  y: string;
  rot: string;
  rotMid: string;
};

const FLOATING_TAGS: (Omit<FloatingTag, "text"> & { textKey: string })[] = [
  { textKey: "landing.tagKyoto", color: "bg-rose-100 text-rose-600 border-rose-200", top: "7%", left: "5%", dur: "5s", y: "-14px", rot: "-2deg", rotMid: "1deg" },
  { textKey: "landing.tagAmalfi", color: "bg-amber-100 text-amber-600 border-amber-200", top: "18%", right: "4%", dur: "6s", y: "-10px", rot: "1deg", rotMid: "-1deg" },
  { textKey: "landing.tagMarrakech", color: "bg-mint-100 text-mint-600 border-mint-200", bottom: "30%", right: "10%", dur: "5.5s", y: "-12px", rot: "-1deg", rotMid: "2deg" },
  { textKey: "landing.tagLocal", color: "bg-lavender-100 text-lavender-600 border-lavender-200", top: "40%", right: "8%", dur: "7s", y: "-16px", rot: "2deg", rotMid: "-2deg" },
  { textKey: "landing.tagGoldenHour", color: "bg-amber-50 text-amber-500 border-amber-100", top: "50%", left: "8%", dur: "6.2s", y: "-13px", rot: "-1deg", rotMid: "2deg" },
  { textKey: "landing.tagFoodTour", color: "bg-rose-50 text-rose-500 border-rose-100", bottom: "16%", left: "28%", dur: "7.2s", y: "-11px", rot: "0.5deg", rotMid: "-1deg" },
  { textKey: "landing.tagPhotography", color: "bg-sky-100 text-sky-600 border-sky-200", top: "68%", left: "16%", dur: "6.5s", y: "-10px", rot: "1.5deg", rotMid: "-1.5deg" },
  { textKey: "landing.tagSlowTravel", color: "bg-lavender-50 text-lavender-500 border-lavender-100", top: "36%", left: "18%", dur: "5.8s", y: "-14px", rot: "-2deg", rotMid: "1deg" },
];

/* ── Social media brand icons (inline SVGs, white/25% opacity) ── */
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.401.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.16z" />
    </svg>
  );
}

function RedNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z" />
    </svg>
  );
}

/* ── Floating mini cards (ombré social post thumbnails) ── */
type FloatingCard = {
  gradient: string;
  label: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  dur: string;
  y: string;
  rot: string;
  rotMid: string;
  w: number;
  aspect: string;
};

function CardIcon({ label, className }: { label: string; className?: string }) {
  if (label.toLowerCase().includes("pinterest")) return <PinterestIcon className={className} />;
  if (label.toLowerCase().includes("instagram")) return <InstagramIcon className={className} />;
  if (label.toLowerCase().includes("tiktok")) return <TikTokIcon className={className} />;
  if (label.toLowerCase().includes("rednote")) return <RedNoteIcon className={className} />;
  return <Camera className={className} />;
}

const FLOATING_CARDS: FloatingCard[] = [
  { gradient: "linear-gradient(135deg, #F4B8C0, #FADCE0, #ED95A1)", label: "Pinterest", top: "3%", right: "8%", dur: "8s", y: "-10px", rot: "-1deg", rotMid: "1.5deg", w: 120, aspect: "4/5" },
  { gradient: "linear-gradient(135deg, #C5C2E5, #E2E0F2, #A8A4D8)", label: "Instagram", top: "10%", left: "22%", dur: "7s", y: "-14px", rot: "2deg", rotMid: "-1deg", w: 105, aspect: "1/1" },
  { gradient: "linear-gradient(135deg, #AAD2EA, #D4E8F4, #7BAED4)", label: "Pinterest", top: "4%", left: "42%", dur: "7.8s", y: "-12px", rot: "-1.5deg", rotMid: "1deg", w: 90, aspect: "1/1" },
  { gradient: "linear-gradient(135deg, #FADCE0, #E2E0F2, #C5C2E5)", label: "Instagram", top: "32%", left: "2%", dur: "8.5s", y: "-13px", rot: "-2deg", rotMid: "2deg", w: 115, aspect: "3/4" },
  { gradient: "linear-gradient(135deg, #AAD2EA, #D4E8F4, #C5C2E5)", label: "RedNote", top: "28%", right: "14%", dur: "6.8s", y: "-11px", rot: "0.5deg", rotMid: "-1.5deg", w: 100, aspect: "1/1" },
  { gradient: "linear-gradient(135deg, #A8DBBE, #D0EDDE, #7EC4A0)", label: "Screenshot", top: "56%", right: "4%", dur: "7.5s", y: "-16px", rot: "-1.5deg", rotMid: "1deg", w: 120, aspect: "4/5" },
  { gradient: "linear-gradient(135deg, #FFDF8A, #FFEFC4, #F5CB5C)", label: "RedNote", bottom: "6%", right: "30%", dur: "9s", y: "-12px", rot: "1deg", rotMid: "-2deg", w: 110, aspect: "3/4" },
  { gradient: "linear-gradient(135deg, #FADCE0, #AAD2EA, #F4B8C0)", label: "TikTok", bottom: "10%", left: "6%", dur: "7.5s", y: "-13px", rot: "-0.5deg", rotMid: "1.5deg", w: 105, aspect: "3/4" },
  { gradient: "linear-gradient(135deg, #C5C2E5, #A8DBBE, #E2E0F2)", label: "Pinterest Board", top: "64%", left: "24%", dur: "8.8s", y: "-10px", rot: "1.5deg", rotMid: "-1deg", w: 95, aspect: "1/1" },
  { gradient: "linear-gradient(135deg, #F4B8C0, #E2E0F2, #FADCE0)", label: "Pinterest", bottom: "4%", left: "44%", dur: "9.5s", y: "-9px", rot: "1deg", rotMid: "-1deg", w: 85, aspect: "4/5" },
  { gradient: "linear-gradient(135deg, #A8DBBE, #FFEFC4, #D0EDDE)", label: "Screenshot", bottom: "22%", right: "22%", dur: "8.2s", y: "-11px", rot: "0.5deg", rotMid: "-1.5deg", w: 100, aspect: "3/4" },
  { gradient: "linear-gradient(135deg, #FFDF8A, #FADCE0, #FFEFC4)", label: "RedNote", top: "14%", right: "28%", dur: "7.2s", y: "-14px", rot: "-1deg", rotMid: "2deg", w: 90, aspect: "4/5" },
];

const SECTIONS = [
  {
    step: 1,
    titleKey: "landing.step1Title",
    descKey: "landing.step1Desc",
    Demo: DemoMoodBoard,
  },
  {
    step: 2,
    titleKey: "landing.step2Title",
    descKey: "landing.step2Desc",
    Demo: DemoTasteProfile,
  },
  {
    step: 3,
    titleKey: "landing.step3Title",
    descKey: "landing.step3Desc",
    Demo: DemoWorkspace,
  },
] as const;

export default function LandingPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-n-50">
      {/* Nav */}
      <header className="border-b border-n-200 bg-n-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Derivé"
              width={36}
              height={36}
              className="h-9 w-9 rounded-[12px]"
            />
            <span className="font-heading text-xl font-bold text-n-900">
              Derivé
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Link href="/dashboard">
              <Button variant="secondary" size="md">{t("landing.logIn")}</Button>
            </Link>
            <Link href="/onboarding">
              <Button size="md">{t("landing.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — fills viewport */}
      <section className="relative flex min-h-[calc(100vh-65px)] flex-col items-center justify-center overflow-hidden">
        {/* Background gradient blob */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-brand-gradient blur-[120px] opacity-[0.08]" />
        </div>

        {/* Floating pill tags */}
        {FLOATING_TAGS.map((tag) => (
          <span
            key={tag.textKey}
            className={`float-tag pointer-events-none absolute hidden select-none rounded-full border px-3 py-1 text-[12px] font-medium opacity-50 sm:inline-block ${tag.color}`}
            style={{
              top: tag.top,
              left: tag.left,
              right: tag.right,
              bottom: tag.bottom,
              "--float-dur": tag.dur,
              "--float-y": tag.y,
              "--float-rot": tag.rot,
              "--float-rot-mid": tag.rotMid,
            } as React.CSSProperties}
          >
            {t(tag.textKey)}
          </span>
        ))}

        {/* Floating mini social-post cards */}
        {FLOATING_CARDS.map((card) => (
            <div
              key={`${card.label}-${card.top ?? card.bottom}-${card.left ?? card.right}`}
              className="float-tag pointer-events-none absolute hidden select-none sm:block"
              style={{
                top: card.top,
                left: card.left,
                right: card.right,
                bottom: card.bottom,
                "--float-dur": card.dur,
                "--float-y": card.y,
                "--float-rot": card.rot,
                "--float-rot-mid": card.rotMid,
                opacity: 0.35,
              } as React.CSSProperties}
            >
              <div
                className="ombre-card relative overflow-hidden rounded-[16px]"
                style={{
                  width: card.w,
                  aspectRatio: card.aspect,
                  backgroundImage: card.gradient,
                  "--ombre-duration": "8s",
                } as React.CSSProperties}
              >
                <CardIcon label={card.label} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120%] w-[120%] text-white/[0.18]" />
              </div>
            </div>
        ))}

        {/* Main content — above floating elements */}
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
          <h1 className="font-heading text-[36px] font-bold text-n-900 sm:text-[44px]">
            Derivé
          </h1>
          <p className="mt-3 text-lg text-n-600 sm:text-xl">
            {t("landing.heroTitle")}
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-n-500">
            {t("landing.heroSubtitle")}
          </p>
          <Link href="/onboarding" className="mt-8">
            <Button size="lg">{t("landing.getStarted")}</Button>
          </Link>
          <p className="mt-3 text-[13px] text-n-400">{t("common.noSignupRequired")}</p>
        </div>

        {/* Scroll indicator — raised higher so floating apps don't cover it */}
        <div className="bounce-down absolute bottom-16 z-10 flex flex-col items-center gap-1.5 text-n-500">
          <span className="text-[14px] font-semibold tracking-wide">{t("landing.seeHowItWorks")}</span>
          <ChevronDown className="h-7 w-7" />
        </div>
      </section>

      {/* Demo Sections */}
      {SECTIONS.map((section, i) => {
        const Demo = section.Demo;
        return (
          <section
            key={section.step}
            className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-20"
          >
            <ScrollReveal>
              {/* Section heading */}
              <div className="mb-8 flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-xl font-bold text-white opacity-60">
                  {section.step}
                </span>
                <h2 className="mt-3 font-heading text-[26px] font-bold text-n-900">
                  {t(section.titleKey)}
                </h2>
                <p className="mt-2 max-w-lg text-base text-n-500">
                  {t(section.descKey)}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <Demo />
            </ScrollReveal>

            {i < SECTIONS.length - 1 && (
              <div className="bounce-down mt-12 flex justify-center text-n-400">
                <ChevronDown className="h-6 w-6" />
              </div>
            )}
          </section>
        );
      })}

      {/* Footer CTA */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-8">
        <div className="flex flex-col items-center justify-center rounded-[32px] bg-brand-gradient-subtle px-10 py-14 text-center lg:px-16 lg:py-20">
          <h2 className="font-heading text-[26px] font-bold text-n-900">
            {t("landing.ctaTitle")}
          </h2>
          <Link href="/onboarding" className="mt-6">
            <Button size="lg">{t("landing.ctaButton")}</Button>
          </Link>
          <p className="mt-3 text-[13px] text-n-400">
            {t("common.free")}
          </p>
        </div>
      </section>
    </div>
  );
}
