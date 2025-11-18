import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  es: { translation: {
    nav: { home: "Inicio", results: "Resultados", admin: "Panel" },
    home: { title: "Reservá tu estadía", search: "Buscar" },
    room: { capacity: "Capacidad", reserve: "Reservar" }
  }},
  en: { translation: {
    nav: { home: "Home", results: "Results", admin: "Admin" },
    home: { title: "Book your stay", search: "Search" },
    room: { capacity: "Capacity", reserve: "Reserve" }
  }},
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("lang") || "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export default i18n;
