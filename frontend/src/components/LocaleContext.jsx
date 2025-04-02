import React, { createContext, useState, useContext, useEffect } from 'react';

const LocaleContext = createContext();

export const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    // Try to get stored preference
    const stored = localStorage.getItem('locale');
    if (stored) return JSON.parse(stored);
    
    // Fall back to browser language
    const browserLang = navigator.language.replace('-', '_');
    // Map browser language to supported locales
    const supportedLocales = {
      'en_US': { region: 'US', language: 'en_US' },
      'es_MX': { region: 'US', language: 'es_MX' },
      'pt_BR': { region: 'US', language: 'pt_BR' },
      'en_GB': { region: 'EU', language: 'en_GB' },
      'es_ES': { region: 'EU', language: 'es_ES' },
      'fr_FR': { region: 'EU', language: 'fr_FR' },
      // Add more mappings as needed
    };
    
    return supportedLocales[browserLang] || supportedLocales['en_US'];
  });

  useEffect(() => {
    localStorage.setItem('locale', JSON.stringify(locale));
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);