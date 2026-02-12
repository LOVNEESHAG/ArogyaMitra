"use client";

import { useCallback } from "react";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  variant?: "select" | "segmented";
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: {
    select: "px-2 py-1 text-xs",
    button: "px-2 py-1 text-xs",
  },
  md: {
    select: "px-3 py-1.5 text-sm",
    button: "px-3 py-1.5 text-sm",
  },
};

export function LanguageSwitcher({ className, variant = "select", size = "sm" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation();

  const handleSelectChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (SUPPORTED_LANGUAGES.includes(next as any)) {
      setLanguage(next as any);
    }
  }, [setLanguage]);

  const handleButtonClick = useCallback((lang: string) => {
    if (SUPPORTED_LANGUAGES.includes(lang as any)) {
      setLanguage(lang as any);
    }
  }, [setLanguage]);

  if (variant === "segmented") {
    return (
      <div className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-background p-0.5", className)}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = lang === language;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handleButtonClick(lang)}
              className={cn(
                "rounded-md transition",
                sizeClasses[size].button,
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <label className={cn("inline-flex items-center gap-2 text-xs font-medium", className)}>
      <span className="sr-only">Select language</span>
      <select
        className={cn(
          "rounded-md border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          sizeClasses[size].select
        )}
        value={language}
        onChange={handleSelectChange}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang]}
          </option>
        ))}
      </select>
    </label>
  );
}
