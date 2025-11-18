import React, { createContext, useContext, useState, useEffect } from "react";
import es from "../locales/es.json";
import en from "../locales/en.json";

type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Leer del localStorage o usar español por defecto
    const saved = localStorage.getItem("language");
    return (saved as Language) || "es";
  });

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // Función para obtener traducciones (soporta rutas como "common.save")
  const t = (path: string): string => {
    const dictionary = language === "es" ? es : en;
    const keys = path.split(".");
    let value: any = dictionary;

    for (const key of keys) {
      value = value?.[key];
    }

    return value || path; // Si no encuentra, devuelve la ruta
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage debe usarse dentro de LanguageProvider");
  }
  return context;
};
