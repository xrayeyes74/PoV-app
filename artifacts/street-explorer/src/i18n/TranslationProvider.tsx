import { ReactNode } from "react";
import { TranslationContext, useTranslation } from "./useTranslation";

export function TranslationProvider({ children }: { children: ReactNode }) {
  const translation = useTranslation();
  return (
    <TranslationContext.Provider value={translation}>
      {children}
    </TranslationContext.Provider>
  );
}
