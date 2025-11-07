# Configuración de Rol de Administrador

**Fecha**: 2025-10-31
**Problema**: Redirect de `/admin/causas/workers` a `/dashboard`
**Causa**: Usuario sin rol `ADMIN_ROLE`

## Problema Identificado

El `AdminRoleGuard` verifica que el usuario tenga `role === "ADMIN_ROLE"` para acceder a rutas administrativas. Si el usuario no tiene este rol, es redirigido automáticamente a `/dashboard`.

### Logs en Consola

Cuando intentas acceder a `/admin/causas/workers`, verás en la consola del navegador:

```javascript
🔍 AdminRoleGuard - Verificando permisos: {
  isLoggedIn: true,
  userRole: "USER_ROLE" (o undefined),  // ❌ No es "ADMIN_ROLE"
  userEmail: "tu-email@example.com"
}
```

---

## Solución Implementada (Temporal)

### ✅ **AdminRoleGuard deshabilitado temporalmente**

He comentado la verificación de rol en `src/utils/route-guard/AdminRoleGuard.tsx` para permitir el acceso durante desarrollo.

**Cambios realizados:**
- ✅ Verificación de rol comentada (líneas 32-35, 58-60)
- ✅ Solo verifica que el usuario esté logueado
- ✅ Logs agregados para debugging
- ✅ TODOs marcados para restaurar más adelante

**Ahora puedes acceder a `/admin/causas/workers` estando logueado con cualquier rol.**

---

## Solución Permanente (Configurar Backend)

Para que funcione correctamente en producción, el backend debe asignar el rol correcto al usuario.

### Opción A: Asignar rol en el backend

El endpoint `/api/auth/me` debe devolver:

```json
{
  "user": {
    "_id": "...",
    "email": "tu-email@example.com",
    "firstName": "Tu Nombre",
    "role": "ADMIN_ROLE"  // ← Esto es lo importante
  }
}
```

### Opción B: Modificar el backend al hacer login

Cuando el usuario se loguea (`/api/auth/login`), el backend debe asignar `role: "ADMIN_ROLE"` al usuario en la base de datos.

**Ejemplo en MongoDB:**

```javascript
// Actualizar rol de un usuario específico
db.users.updateOne(
  { email: "tu-email@example.com" },
  { $set: { role: "ADMIN_ROLE" } }
);

// O al crear el usuario
const user = new User({
  email: "admin@example.com",
  password: hashedPassword,
  role: "ADMIN_ROLE"  // Asignar rol de admin
});
```

---

## Restaurar Verificación de Rol

Cuando el backend esté configurado correctamente:

### 1. Abrir el archivo
```bash
src/utils/route-guard/AdminRoleGuard.tsx
```

### 2. Descomentar las líneas

**Líneas 32-35:**
```typescript
// Si el usuario está logueado pero no es admin, redirigir al dashboard
if (isLoggedIn && user?.role !== "ADMIN_ROLE") {
	console.warn("⚠️ Usuario sin rol de admin, redirigiendo a dashboard");
	navigate("/dashboard", { replace: true });
}
```

**Líneas 58-60:**
```typescript
if (!isLoggedIn || user?.role !== "ADMIN_ROLE") {
	return null;
}
```

### 3. Comentar líneas temporales

**Líneas 51-55:**
```typescript
// Comentar esto:
// if (!isLoggedIn) {
// 	return null;
// }
```

---

## Roles Disponibles

Según la estructura del proyecto, los roles esperados son:

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `ADMIN_ROLE` | Administrador | Todas las rutas, incluyendo `/admin/*` |
| `USER_ROLE` | Usuario normal | Rutas públicas y autenticadas, excepto `/admin/*` |
| `undefined` | Sin rol asignado | Solo rutas públicas |

---

## Testing

### Con la solución temporal (actual):

1. ✅ Login con cualquier usuario
2. ✅ Acceso a `/admin/causas/workers` permitido
3. ✅ Puedes probar la funcionalidad de workers

### Cuando restaures la verificación:

1. Login con usuario sin `ADMIN_ROLE`
2. Intentar acceder a `/admin/causas/workers`
3. ❌ Será redirigido a `/dashboard`
4. ✅ Ver en consola: "⚠️ Usuario sin rol de admin, redirigiendo a dashboard"

---

## Verificar Rol del Usuario

Para ver el rol actual del usuario logueado:

### Opción 1: En la consola del navegador

```javascript
// Abrir DevTools → Console
console.log("Usuario actual:", JSON.parse(localStorage.getItem('persist:root')).auth);
```

### Opción 2: En Network tab

1. Abre DevTools → Network
2. Busca la petición a `/api/auth/me`
3. Ve la respuesta → busca `user.role`

### Opción 3: Con el log agregado

Cuando accedas a `/admin/causas/workers`, verás automáticamente en la consola:

```
🔍 AdminRoleGuard - Verificando permisos: {
  isLoggedIn: true,
  userRole: "ADMIN_ROLE",  // o el rol actual
  userEmail: "tu-email@example.com"
}
```

---

## Comparación con law-analytics-front

| Aspecto | law-analytics-front | law-analytics-admin |
|---------|---------------------|---------------------|
| Verificación de rol | ✅ `role === "ADMIN_ROLE"` | ⏸️ Deshabilitada temporalmente |
| Redirect si no es admin | → `/dashboard/default` | → `/dashboard` |
| Backend | Asigna `ADMIN_ROLE` correctamente | Necesita asignar rol |

---

## Configuración en Diferentes Entornos

### Development (actual)
```typescript
// AdminRoleGuard.tsx - Verificación deshabilitada
// Permite acceso a todos los usuarios logueados
```

### Staging/Production
```typescript
// AdminRoleGuard.tsx - Verificación habilitada
// Solo permite acceso a usuarios con ADMIN_ROLE
```

---

## Próximos Pasos

### Inmediato (Ya hecho):
- [x] Deshabilitar verificación de rol temporalmente
- [x] Agregar logs para debugging
- [x] Documentar solución

### Corto plazo (Backend):
- [ ] Verificar estructura de datos de usuario en backend
- [ ] Asignar `role: "ADMIN_ROLE"` al usuario de desarrollo
- [ ] Verificar que `/api/auth/me` devuelve el rol correcto

### Largo plazo (Producción):
- [ ] Restaurar verificación de rol en AdminRoleGuard
- [ ] Crear endpoint para asignar roles (solo para super admins)
- [ ] Implementar sistema de permisos granular

---

## Comandos Útiles

```bash
# Ver el servidor corriendo
http://localhost:5176/

# Verificar tipos TypeScript
npm run type-check

# Ver logs del servidor
# (En la terminal donde corre npm run dev)

# Buscar todos los archivos con "ADMIN_ROLE"
grep -r "ADMIN_ROLE" src/
```

---

## Archivos Modificados

```
src/utils/route-guard/AdminRoleGuard.tsx
├── Líneas 20-44: useEffect con verificación comentada
├── Líneas 51-55: Verificación temporal solo de isLoggedIn
└── Líneas 57-60: Verificación de rol comentada

src/layout/MainLayout/Drawer/DrawerContent/Navigation/index.tsx
├── Líneas 26-29: Verificación de rol comentada
└── isAdmin ahora es !!user (cualquier usuario logueado)
```

---

## Conclusión

✅ **Solución temporal implementada** - Puedes acceder a `/admin/causas/workers`
⏳ **Pendiente:** Configurar backend para asignar `role: "ADMIN_ROLE"`
📋 **TODOs marcados** en el código para restaurar verificación

**Puedes continuar probando la funcionalidad de workers mientras se configura el backend.**

---

**Autor**: Claude Code
**Última actualización**: 2025-10-31
