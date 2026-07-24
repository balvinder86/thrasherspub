import { createContext, useContext, useState, type ReactNode } from "react";

import { translations, type Language, type TranslationDict } from "./translations";

const STORAGE_KEY = "thrashers-language";

function readStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(STORAGE_KEY) === "es" ? "es" : "en";
}

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: TranslationDict;
} | null>(null);

// One shared language preference for the whole app, persisted to
// localStorage — same "provider above the router's Outlet" shape as
// DateRangeProvider, so every page's shared Topbar/Sidebar picks it
// up automatically.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
