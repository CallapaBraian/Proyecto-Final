// src/routes/Resultados.tsx
export default function Resultados() {
  return (
    <section className="container-max py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Resultados de búsqueda</h1>
      <p className="text-muted">
        Aquí se mostrarán los departamentos disponibles.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-gray-900/40 p-6 text-center">
        <p className="text-muted">No hay resultados para mostrar aún.</p>
      </div>
    </section>
  );
}
