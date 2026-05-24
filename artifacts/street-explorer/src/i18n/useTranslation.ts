import { useState, useCallback } from "react";
import { createContext, useContext } from "react";
import { TRANSLATIONS, LANGUAGES, LangCode, Strings } from "./strings";

const STORAGE_KEY = "pov_language";

function detectBrowserLanguage(): LangCode {
  const lang = navigator.language?.split("-")[0] as LangCode;
  return LANGUAGES.find((l) => l.code === lang) ? lang : "it";
}

export function useTranslation() {
  const [currentLang, setCurrentLang] = useState<LangCode>(
    () => (localStorage.getItem(STORAGE_KEY) as LangCode) || detectBrowserLanguage()
  );

  const changeLanguage = useCallback((lang: LangCode) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setCurrentLang(lang);
  }, []);

  return {
    t: TRANSLATIONS[currentLang],
    currentLang,
    changeLanguage,
    isLoading: false,
    languages: LANGUAGES,
  };
}

export type TranslationContextType = ReturnType<typeof useTranslation>;

export const TranslationContext = createContext<TranslationContextType>({
  t: TRANSLATIONS["it"],
  currentLang: "it",
  changeLanguage: () => {},
  isLoading: false,
  languages: LANGUAGES,
});

export function useT() {
  return useContext(TranslationContext);
}