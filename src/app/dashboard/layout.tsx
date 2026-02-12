"use client";

import { useUserRole } from "@/hooks/use-user-role";
import { signOutAll } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as React from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/lib/i18n";

function getInitials(value?: string | null) {
  if (!value) return "";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || value.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, loading, user } = useUserRole();
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOutAll();
      router.push('/');
    } catch (err) {
      console.warn('Logout failed', err);
    }
  };

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), show: true },
    { href: "/dashboard/profile", label: t("nav.profile"), show: true },
    { href: "/dashboard/appointments", label: t("nav.appointments"), show: role !== "admin" },
    { href: "/dashboard/health-records", label: t("nav.healthRecords"), show: role !== "admin" },
    { href: "/dashboard/pharmacies", label: t("nav.pharmacies"), show: role === "patient" },
    { href: "/dashboard/pharmacy", label: t("nav.pharmacy"), show: role === "pharmacyOwner" || role === "admin" },
  ];

  const renderNavLinks = (onNavigate?: () => void) =>
    navItems
      .filter((item) => item.show)
      .map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent/10 hover:text-primary"
        >
          {item.label}
        </Link>
      ));

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <header className="border-b bg-card shadow-sm md:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-accent/10 md:hidden"
              aria-label="Open navigation"
              aria-expanded={isMobileNavOpen}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="ArogyaMitra logo"
                width={104}
                height={32}
                priority
              />
              <span className="text-lg font-semibold text-primary leading-none">{t("common.appName")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="segmented" size="sm" />
            <button
              onClick={handleLogout}
              className="rounded-md bg-secondary px-4 py-2 text-sm transition-colors hover:bg-secondary/80"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="relative flex h-full w-48 flex-col border-r border-border bg-card px-5 py-7 shadow-lg">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-accent/10"
              aria-label="Close navigation"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
            <Link href="/" className="mt-8 flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="ArogyaMitra logo"
                width={108}
                height={32}
                className="h-8 w-auto"
                priority
              />
              <span className="text-lg font-semibold text-primary leading-none">ArogyaMitra</span>
            </Link>
            <div className="mt-6 flex flex-1 flex-col">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("common.navigation")}</span>
                {renderNavLinks(() => setIsMobileNavOpen(false))}
              </div>
              <div className="mt-auto border-t border-border/60 pt-5">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-4">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.email || "User"}
                      className="h-10 w-10 rounded-full border border-foreground/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {getInitials(user?.displayName || user?.email || "Arogya") || "AM"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user?.displayName || user?.email}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{role}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <LanguageSwitcher variant="select" size="md" className="flex-1" />
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      handleLogout();
                    }}
                    className="rounded-md bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/80"
                  >
                    {t("common.logout")}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setIsMobileNavOpen(false)}
            className="flex-1 bg-black/40"
          />
        </div>
      )}

      <aside className="hidden h-screen w-52 flex-shrink-0 flex-col border-r border-border bg-card px-5 py-10 md:flex">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="ArogyaMitra logo"
            width={112}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="text-lg font-semibold text-primary leading-none">ArogyaMitra</span>
        </Link>

        <div className="mt-8 flex flex-1 flex-col">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("common.navigation")}</span>
            <div className="flex flex-col gap-1">
              {renderNavLinks()}
            </div>
          </div>

          <div className="mt-auto border-t border-border/60 pt-5">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-4">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || user.email || "User"}
                  className="h-11 w-11 rounded-full border border-foreground/10 object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {getInitials(user?.displayName || user?.email || "Arogya") || "AM"}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.displayName || user?.email}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{role}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <LanguageSwitcher variant="select" size="sm" className="flex-1" />
              <button
                onClick={handleLogout}
                className="w-32 rounded-md bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/80"
              >
                {t("common.logout")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

