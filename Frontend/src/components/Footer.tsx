export default function Footer() {
  return (
    <footer className="bg-slate-950 text-gray-300 py-10 mt-10 border-t border-slate-800">
      <div className="max-w-6xl mx-auto grid gap-8 sm:grid-cols-4 px-4 text-sm">

        {/* Marca */}
        <div>
          <h2 className="text-lg font-semibold text-blue-400">Hotel.ar</h2>
          <p className="mt-2 text-gray-400">
            Sistema de reservas desarrollado en Salta, Argentina.
          </p>
          <p className="mt-2 text-gray-400">Tel: +54 387 537-6539</p>
        </div>

        {/* Sección institucional */}
        <div>
          <h3 className="font-semibold text-white mb-2">¿Quiénes somos?</h3>
          <ul className="space-y-1">
            <li>
              <a href="#" className="hover:text-white">Nosotros</a>
            </li>
            <li>
              <a href="#" className="hover:text-white">Servicios</a>
            </li>
          </ul>
        </div>

        {/* Contacto */}
        <div>
          <h3 className="font-semibold text-white mb-2">¿Tienes una consulta?</h3>
          <p>
            <a
              href="mailto:contacto@hotel.ar"
              className="hover:text-white"
            >
              contacto@hotel.ar
            </a>
          </p>
        </div>

        {/* Redes */}
        <div>
          <h3 className="font-semibold text-white mb-2">Redes Sociales</h3>
          <div className="flex gap-3 mt-2">
            <a href="#" className="hover:text-white">Facebook</a>
            <a href="#" className="hover:text-white">Instagram</a>
          </div>
        </div>
      </div>

      {/* Línea final */}
      <div className="text-center text-gray-500 text-xs mt-8 pt-4">
        © 2025 Hotel.ar · Desarrollado por Braian Callapa
      </div>
    </footer>
  );
}
