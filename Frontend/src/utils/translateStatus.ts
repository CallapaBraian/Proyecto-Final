// src/utils/translateStatus.ts
import { useLanguage } from "../context/LanguageContext";

// Función para traducir estados (sin Hook)
export const getStatusTranslation = (status: string, dictionary: any): string => {
  const statusMap: Record<string, string> = {
    PENDING: "status.pending",
    PAID: "status.paid",
    CONFIRMED: "status.confirmed",
    CHECKED_IN: "status.checkedIn",
    CHECKED_OUT: "status.checkedOut",
    CANCELLED: "status.cancelled",
    CANCELED: "status.cancelled",  // Variante sin doble L
    NEW: "status.new",
    IN_PROGRESS: "status.inProgress",
    ANSWERED: "status.answered",
    CLOSED: "status.closed",
    ACTIVE: "status.active",
    INACTIVE: "status.inactive",
  };

  const key = statusMap[status] || status;
  
  // Navegar por la estructura del diccionario
  const keys = key.split(".");
  let value: any = dictionary;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || status;
};

// Hook para usar en componentes
export const useStatusTranslation = () => {
  const { t } = useLanguage();
  
  return (status: string): string => {
    const statusMap: Record<string, string> = {
      PENDING: "status.pending",
      PAID: "status.paid",
      CONFIRMED: "status.confirmed",
      CHECKED_IN: "status.checkedIn",
      CHECKED_OUT: "status.checkedOut",
      CANCELLED: "status.cancelled",
      CANCELED: "status.cancelled",  // Variante sin doble L
      NEW: "status.new",
      IN_PROGRESS: "status.inProgress",
      ANSWERED: "status.answered",
      CLOSED: "status.closed",
      ACTIVE: "status.active",
      INACTIVE: "status.inactive",
    };

    const key = statusMap[status] || status;
    return t(key);
  };
};
