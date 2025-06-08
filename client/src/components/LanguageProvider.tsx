import { useState, useEffect, ReactNode } from 'react';
import { LanguageContext, Language, translations } from '@/lib/i18n';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    // Get saved language from localStorage or default to Russian
    const saved = localStorage.getItem('game-language');
    return (saved as Language) || 'ru';
  });

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem('game-language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}