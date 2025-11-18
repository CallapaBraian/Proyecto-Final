// src/context/BookingContext.tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface BookingData {
  roomId: string;
  roomName?: string;
  imageUrl?: string | null;
  pricePerNight?: number;
  checkin: string;      // YYYY-MM-DD
  checkout: string;     // YYYY-MM-DD
  guests: number;
  nights: number;
  total: number;
}

interface BookingContextProps {
  booking: BookingData | null;
  setBooking: (data: BookingData) => void;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextProps | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [booking, setBookingState] = useState<BookingData | null>(null);

  function setBooking(data: BookingData) {
    setBookingState(data);
  }

  function clearBooking() {
    setBookingState(null);
  }

  return (
    <BookingContext.Provider value={{ booking, setBooking, clearBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking debe usarse dentro de BookingProvider");
  }
  return ctx;
}
