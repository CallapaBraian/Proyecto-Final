export function roleLabel(role?: string | null) {
  switch (role) {
    case "ADMIN":
      return "Administrador";

    case "OPERATOR":
      return "Operador";

    case "GUEST":
      return "Usuario";

    default:
      return role ?? "";
  }
}
