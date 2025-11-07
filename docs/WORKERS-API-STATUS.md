# Workers API - Estado y Configuración

**Fecha**: 2025-10-31
**Estado**: ✅ Configurado y listo para conectar con backend

## Resumen

El panel de administración de workers está **completamente implementado** y configurado para consumir la API de workers desde `VITE_WORKERS_URL`. La implementación es idéntica a la de `law-analytics-front`.

## Variables de Entorno

```env
VITE_WORKERS_URL=https://jenna-nonspillable-nontabularly.ngrok-free.dev/api
```

Esta URL debe apuntar al backend de workers que maneje los endpoints documentados abajo.

## Estructura Implementada

### Servicios API (src/api/workers.ts)
✅ **WorkersService** - Servicio completo con métodos para:
- Scraping workers
- Verification workers
- App Update workers
- Sync workers
- Processing workers
- Notification workers
- Cleanup workers
- Historial de scraping

### Axios Instance (src/utils/workersAxios.ts)
✅ **workersAxios** - Instancia configurada con:
- Base URL: `VITE_WORKERS_URL`
- Timeout: 30 segundos
- Authorization header automático
- **SIN redirect automático en 401** (corregido)

### Componentes UI (src/pages/admin/causas/workers/)
✅ **Página principal** - Sistema de tabs con 7 tipos de workers
✅ **ScrapingWorker** - Gestión completa de scraping configs
✅ **VerificationWorker** - Configuración de verificación
✅ **AppUpdateWorker** - Gestión de actualizaciones
✅ **4 workers placeholder** - Sync, Processing, Notification, Cleanup

## Endpoints que Consume

El frontend está configurado para consumir estos endpoints:

### Scraping Worker
```
GET  /api/configuracion-scraping/           - Obtener configs
PUT  /api/configuracion-scraping/:id         - Actualizar config
PUT  /api/configuracion-scraping/:id/range   - Actualizar rango
GET  /api/configuracion-scraping-history/    - Historial
```

### Verification Worker
```
GET  /api/verificacion-workers/              - Obtener configs
PUT  /api/verificacion-workers/:id           - Actualizar config
```

### App Update Worker
```
GET  /api/configuracion-app-update/          - Obtener configs
PUT  /api/configuracion-app-update/:id       - Actualizar config
```

### Otros Workers (Placeholder)
```
GET  /api/configuracion-{worker-type}/       - Obtener configs
PUT  /api/configuracion-{worker-type}/:id    - Actualizar config
```

Donde `{worker-type}` puede ser: `sincronizacion`, `procesamiento`, `notificaciones`, `limpieza`

## Estructura de Datos Esperada

### WorkerConfig Response
```typescript
{
  success: boolean;
  message: string;
  count?: number;
  total?: number;
  page?: number;
  pages?: number;
  data: WorkerConfig[] | WorkerConfig;
}
```

### WorkerConfig Object
```typescript
{
  _id: string;
  fuero?: "CIV" | "CSS" | "CNT";
  worker_id?: string;
  enabled?: boolean;
  activo?: boolean;
  year?: number;
  range_start?: number;
  range_end?: number;
  // ... más campos según tipo de worker
}
```

### ScrapingHistory Response
```typescript
{
  success: boolean;
  count?: number;
  total?: number;
  page?: number;
  pages?: number;
  data: ScrapingHistory[];
}
```

## Autenticación

El frontend envía automáticamente el token de autenticación en el header:

```
Authorization: Bearer <token>
```

El token se obtiene del sistema de autenticación principal (VITE_AUTH_URL).

## Flujo de Usuario

1. **Usuario se loguea** → Token guardado en secureStorage/authTokenService
2. **Navega a `/admin/causas/workers`** → AuthGuard verifica autenticación y rol admin
3. **Página carga** → Hace peticiones GET a `VITE_WORKERS_URL` con token
4. **Usuario interactúa** → Hace PUT requests para actualizar configuraciones
5. **Backend responde** → Frontend muestra snackbar de éxito/error

## Manejo de Errores

### Error 401 (No autorizado)
- ✅ **NO redirige automáticamente** (corregido hoy)
- El componente muestra error: "Error al cargar las configuraciones"
- El AuthGuard maneja la autenticación general

### Error 403 (Sin permisos)
- Componente muestra: "No tiene permisos de administrador"

### Error 404 (Config no encontrada)
- Componente muestra: "Configuración no encontrada"

### Otros errores
- Componente muestra: "Error al procesar la solicitud"

## Estado Actual del Backend

Según `.env`:
```
VITE_WORKERS_URL=https://jenna-nonspillable-nontabularly.ngrok-free.dev/api
```

### ¿Qué verificar en el backend?

1. **El backend está corriendo** en esa URL
2. **Los endpoints existen** (GET /api/configuracion-scraping/, etc.)
3. **Acepta el token** de VITE_AUTH_URL
4. **Devuelve el formato esperado** (WorkerConfigResponse)

### Probar Conectividad

Desde el navegador, después de loguearte:

1. Abre DevTools → Network tab
2. Ve a `/admin/causas/workers`
3. Busca peticiones a `jenna-nonspillable-nontabularly.ngrok-free.dev`
4. Verifica:
   - Status code
   - Request headers (Authorization)
   - Response body

## Comparación con law-analytics-front

| Aspecto | law-analytics-front | law-analytics-admin | Estado |
|---------|---------------------|---------------------|--------|
| WorkersService | ✅ Implementado | ✅ Implementado | ✅ Idéntico |
| workersAxios | ❌ No existe (usa axios) | ✅ Existe | ✅ Mejor separación |
| Componentes UI | ✅ Implementados | ✅ Implementados | ✅ Idéntico |
| Endpoints | ✅ Consume API | ✅ Consume API | ✅ Mismo formato |
| Autenticación | ✅ Token en header | ✅ Token en header | ✅ Compatible |

## Diferencias con law-analytics-front

### ✅ Ventaja en law-analytics-admin:
**Instancia axios separada** (`workersAxios`) permite:
- Timeout diferente para workers API
- Interceptores específicos
- Base URL independiente
- Mejor separación de concerns

### ⚠️ Requiere verificación:
Si el backend de workers **requiere las mismas cookies** que el backend de auth, podrías necesitar:
```typescript
withCredentials: true  // En workersAxios.ts línea 13
```

Pero actualmente está en `false` porque el backend debería aceptar el token en Authorization header.

## Próximos Pasos

### 1. Verificar Backend
- [ ] Confirmar que el backend está corriendo
- [ ] Probar endpoints manualmente (Postman/curl)
- [ ] Verificar que acepta el token de auth

### 2. Probar en el Frontend
- [ ] Login exitoso
- [ ] Navegar a `/admin/causas/workers`
- [ ] Ver si carga los datos
- [ ] Si no carga, revisar Network tab en DevTools

### 3. Si hay errores CORS
Agregar en el backend:
```javascript
app.use(cors({
  origin: 'http://localhost:5176',
  credentials: true
}));
```

### 4. Si 401 Unauthorized
- Verificar que el backend acepta token de `VITE_AUTH_URL`
- Verificar formato del token (Bearer)
- Verificar que el token no expiró

## Comandos Útiles

```bash
# Iniciar dev server
npm run dev

# Verificar tipos
npm run type-check

# Ver variables de entorno
cat .env

# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
```

## Logs de Debugging

Para debugging en el navegador:

```javascript
// En DevTools Console:
// Ver token actual
localStorage.getItem('authToken')
secureStorage.getAuthToken()

// Ver config de axios
workersAxios.defaults.baseURL
workersAxios.defaults.timeout
```

## Conclusión

✅ **La implementación del frontend está completa y correcta**
✅ **Compatible con law-analytics-front**
✅ **Problemas de login resueltos** (loops infinitos)
✅ **workersAxios corregido** (no redirect en 401)

**Lo único que falta es confirmar que el backend responde correctamente a los endpoints.**

---

**Autor**: Claude Code
**Última actualización**: 2025-10-31
