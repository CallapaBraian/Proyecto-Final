import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { ChevronRight, Loader, AlertCircle, CheckCircle } from "lucide-react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";

interface CheckoutFlowProps {
  reservation: any;
  onSuccess: (paymentId: string) => void;
}

export default function CheckoutFlow({ reservation, onSuccess }: CheckoutFlowProps) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState(1); // 1, 2, 3
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "WALLET">("CARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PASO 1: Revisar Reserva
  const handleStep1Next = () => {
    setStep(2);
    setError(null);
  };

  // PASO 2: Procesar Pago
  const handleStep2Next = async () => {
    if (!stripe || !elements) {
      setError("Stripe no está disponible");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Crear sesión de pago en backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          reservationId: reservation.id,
        }),
      });

      if (!response.ok) throw new Error("Error al crear sesión de pago");

      const { url } = await response.json();

      // Redirigir a Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Error al procesar pago");
      toast.error(err.message || "Error al procesar pago");
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // ============================================
  // STEP 1: REVISAR RESERVA
  // ============================================
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 flex items-center">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1 h-1 bg-blue-500 mx-2"></div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold mb-6">
          {t("checkout.review") || "Revisar Reserva"}
        </h2>

        {/* Card Resumen */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Código:</span>
              <span className="font-semibold">{reservation.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Huésped:</span>
              <span className="font-semibold">{reservation.guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-semibold text-sm">{reservation.guestEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono:</span>
              <span className="font-semibold">{reservation.guestPhone}</span>
            </div>
            <hr className="my-4" />
            <div className="flex justify-between">
              <span className="text-gray-600">Check-in:</span>
              <span className="font-semibold">
                {new Date(reservation.checkIn).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Check-out:</span>
              <span className="font-semibold">
                {new Date(reservation.checkOut).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Habitación:</span>
              <span className="font-semibold">{reservation.room?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Huéspedes:</span>
              <span className="font-semibold">{reservation.guests}</span>
            </div>
            <hr className="my-4" />
            <div className="flex justify-between text-lg">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-blue-600">${reservation.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
          >
            Atrás
          </button>
          <button
            onClick={handleStep1Next}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            Continuar al Pago <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 2: SELECCIONAR MÉTODO
  // ============================================
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 flex items-center">
            <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
              ✓
            </div>
            <div className="flex-1 h-1 bg-green-500 mx-2"></div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold mb-6">
          {t("checkout.payment_method") || "Método de Pago"}
        </h2>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Métodos */}
        <div className="space-y-4 mb-8">
          {/* Tarjeta */}
          <div
            onClick={() => setPaymentMethod("CARD")}
            className={`p-6 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === "CARD"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "CARD"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "CARD" && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <div>
                <h3 className="font-semibold">💳 Tarjeta de Crédito/Débito</h3>
                <p className="text-sm text-gray-600">Visa, Mastercard, American Express</p>
              </div>
            </div>
          </div>

          {/* Billetera */}
          <div
            onClick={() => setPaymentMethod("WALLET")}
            className={`p-6 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === "WALLET"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "WALLET"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "WALLET" && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <div>
                <h3 className="font-semibold">💰 Billetera Virtual</h3>
                <p className="text-sm text-gray-600">Google Pay, Apple Pay</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Element (si eligió tarjeta) */}
        {paymentMethod === "CARD" && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
            <label className="block text-sm font-semibold mb-4">Información de la Tarjeta</label>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#424770",
                    "::placeholder": {
                      color: "#aab7c4",
                    },
                  },
                  invalid: {
                    color: "#9e2146",
                  },
                },
              }}
            />
            <p className="text-xs text-gray-500 mt-3">
              Tus datos se envían directamente a Stripe. Nunca guardamos datos de tarjetas.
            </p>
          </div>
        )}

        {/* Monto */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Monto a Pagar:</span>
            <span className="text-2xl font-bold text-blue-600">${reservation.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <button
            onClick={handleBack}
            disabled={loading}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Atrás
          </button>
          <button
            onClick={handleStep2Next}
            disabled={loading || !stripe}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Pagar Ahora <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 3: CONFIRMACIÓN
  // ============================================
  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1 flex items-center">
          <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
            ✓
          </div>
          <div className="flex-1 h-1 bg-green-500 mx-2"></div>
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
            ✓
          </div>
          <div className="flex-1 h-1 bg-green-500 mx-2"></div>
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
            ✓
          </div>
        </div>
      </div>

      {/* Success */}
      <div className="text-center mb-12">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-green-600 mb-2">¡Pago Exitoso!</h2>
        <p className="text-gray-600">Tu reserva ha sido confirmada</p>
      </div>

      {/* Detalles */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h3 className="text-lg font-semibold mb-6">Detalles de la Reserva</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Código de Reserva:</span>
            <span className="font-semibold text-green-600">{reservation.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Monto Pagado:</span>
            <span className="font-semibold">${reservation.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha de Pago:</span>
            <span className="font-semibold">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email de Confirmación:</span>
            <span className="font-semibold text-sm">{reservation.guestEmail}</span>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
        <p className="text-gray-700">
          Se envió un recibo detallado a <strong>{reservation.guestEmail}</strong>
        </p>
      </div>

      {/* Botón */}
      <button
        onClick={() => {
          onSuccess(reservation.paymentId);
          window.location.href = "/mis-reservas";
        }}
        className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
      >
        Ver Mis Reservas
      </button>
    </div>
  );
}
