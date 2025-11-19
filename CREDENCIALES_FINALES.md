# 🔐 CREDENCIALES DE ACCESO - Hotel.ar

**Última actualización:** 18 de Noviembre, 2025

---

## 👥 ROLES Y CREDENCIALES

### 🟢 HUÉSPED (Usuario)
```
Email:    user@hotel.ar
Password: User1234
Rol:      GUEST
```

**Funcionalidades disponibles:**
- Ver habitaciones disponibles
- Hacer reservas (3 pasos)
- Ver mis reservas
- Enviar consultas por mail
- Ver mi perfil

---

### 🟠 OPERADOR (Staff)
```
Email:    operador@hotel.ar
Password: Operador1234
Rol:      OPERATOR
```

**Funcionalidades disponibles:**
- Ver panel de control
- Gestionar habitaciones (ver estado, activar/desactivar)
- Gestionar reservas (cambiar estado: pending→confirmed→checked_in→checked_out)
- Responder consultas de mail
- Ver estadísticas de ocupación
- Procesar pagos

---

### 🔵 ADMINISTRADOR (Admin)
```
Email:    admin@hotel.ar
Password: Admin1234
Rol:      ADMIN
```

**Funcionalidades disponibles:**
- Todo lo del OPERADOR +
- CRUD completo de habitaciones
- CRUD completo de operadores
- Panel de análisis y gráficos
- Estadísticas avanzadas (ingresos, ocupación, etc)

---

## 🚀 Cómo Ingresar

1. Abre http://localhost:5175
2. Haz clic en "Iniciar sesión"
3. Elige el rol que quieras probar
4. Copia el email y contraseña correspondiente
5. ¡Listo!

---

## 📊 Resumen de Habitaciones

El sistema tiene **12 habitaciones** diferentes:

1. Suite Ejecutiva - $250/noche
2. Habitación Doble Standard - $120/noche
3. Habitación Triple Familiar - $180/noche
4. Suite Premium Vista Cerro - $500/noche
5. Departamento 2 Ambientes - $200/noche
6. Habitación Single Económica - $80/noche
7. Habitación Simple Estándar - $100/noche
8. Habitación Doble Confort - $150/noche
9. Habitación Doble Superior - $170/noche
10. Habitación Familiar XL - $220/noche
11. Suite Deluxe - $280/noche
12. Suite Presidencial Premium Plus - $550/noche

---

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcryptjs
- ✅ Autenticación JWT
- ✅ Validación en backend y frontend
- ✅ Control de roles en todas las rutas
- ✅ Base de datos en Railway.app

---

## 📝 Notas Importantes

1. Las imágenes se sirven desde GitHub (URLs raw) para mejor rendimiento
2. La BD está online en Railway
3. Los usuarios se pueden crear/editar desde el panel admin
4. Las contraseñas deben tener al menos 1 mayúscula, 1 minúscula y 1 número

---

**¿Problemas de acceso?** 
- Verifica que el Backend esté corriendo en puerto 4000
- Verifica que el Frontend esté en puerto 5173
- Revisa la consola del navegador (F12) para errores
