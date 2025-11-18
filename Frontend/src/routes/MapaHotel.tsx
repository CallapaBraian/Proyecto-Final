// src/routes/MapaHotel.tsx
export default function MapaHotel() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-10 text-white">
      {/* Título */}
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Nuestra Ubicación</h1>
        <p className="text-slate-300 mt-1">
          Estamos en pleno centro de Salta Capital.
        </p>
      </header>

      {/* MAPA */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-lg bg-slate-950 mb-8">
        <iframe
          title="Mapa Hotel.ar en Salta"
          src="https://www.google.com/maps?q=Hotel+Regidor,+Buenos+Aires+8,+Salta,+Argentina&output=embed"
          width="100%"
          height="450"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* DESCRIPCIÓN DE CONTACTO */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-md p-6 text-center space-y-3">
        <h2 className="text-xl font-semibold text-blue-400">Hotel.ar</h2>

        <p className="text-slate-300">
          Estamos ubicados a pocos metros de <strong>Plaza 9 de Julio</strong>,
          en el corazón de Salta Capital.
        </p>

        <div className="text-sm text-slate-400 space-y-1">
          <p>📍 Buenos Aires 8, Salta, Argentina</p>
          <p>📞 +54 387 537-6539</p>
          <p>✉ contacto@hotel.ar</p>
        </div>
      </div>
    </section>
  );
}
