# Implementación de Refresh Token Automático

## Resumen

El sistema ahora implementa refresh token automático en las instancias de axios (`workersAxios` y `authAxios`), replicando el comportamiento del proyecto `law-analytics-front`.

## Flujo de Funcionamiento

### 1. Petición Normal con Token Válido
```
Usuario → Request → API → Response (200) → Usuario
```

### 2. Petición con Token Expirado (Flujo Automático de Refresh)
```
Usuario → Request → API → Response (401)
                    ↓
        Interceptor detecta 401
                    ↓
        POST /api/auth/refresh-token
                    ↓
        ┌─────────────┴─────────────┐
        │                           │
    Refresh OK               Refresh FAIL
        │                           │
   Nuevo Token              Limpiar Tokens
        │                           │
   Retry Request            Redirect /login
        │
   Response (200)
        │
    Usuario
```

## Implementación Técnica

### workersAxios.ts

**Request Interceptor:**
- Agrega el token al header `Authorization: Bearer {token}`
- NO previene peticiones con token expirado

**Success Response Interceptor:**
- Captura tokens de headers (`authorization`, `x-auth-token`)
- Captura tokens del body (`response.data.token`)
- Almacena en `authTokenService` y `secureStorage`

**Error Response Interceptor:**
```typescript
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;

  // Intentar refresh y capturar el nuevo token
  const refreshResponse = await axios.post(`${VITE_AUTH_URL}/api/auth/refresh-token`, {}, { withCredentials: true });

  // Capturar token de la respuesta del refresh
  const newToken = refreshResponse.headers["authorization"]?.replace("Bearer ", "")
    || refreshResponse.headers["x-auth-token"]
    || refreshResponse.data?.token;

  if (newToken) {
    authTokenService.setToken(newToken);
    secureStorage.setAuthToken(newToken);
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
  }

  // Reintentar petición con nuevo token
  return workersAxios(originalRequest);
}
```

### authAxios.ts

**Request Interceptor:**
- Agrega el token al header `Authorization: Bearer {token}`

**Response Interceptor:**
- Similar a workersAxios pero excluye endpoints de auth:
  - `/login`
  - `/register`
  - `/google`
  - `/refresh-token`
  - `/logout`

## Prevención de Loops Infinitos

### Flag `_retry`
Cada petición original tiene un flag `_retry` que se establece en `true` después del primer intento de refresh:

```typescript
if (!originalRequest._retry) {
  originalRequest._retry = true;
  // ... intentar refresh
}
```

### Exclusión de Endpoints de Auth
Los endpoints de autenticación están excluidos para evitar que el refresh token intente refrescarse a sí mismo:

```typescript
if (!url.includes("/refresh-token") && !url.includes("/login") ...) {
  // ... intentar refresh
}
```

## Variables de Entorno Requeridas

```env
# API de Autenticación (para refresh token)
VITE_AUTH_URL=https://api.lawanalytics.app

# API de Workers
VITE_WORKERS_URL=http://localhost:3035
```

## Captura y Almacenamiento de Token

### En Todas las Respuestas Exitosas
Tanto `workersAxios` como `authAxios` capturan tokens de TODAS las respuestas exitosas:
1. Response headers: `authorization` o `x-auth-token`
2. Response body: `response.data.token`

### Específicamente en el Refresh
Cuando se hace refresh del token:
1. Se captura explícitamente de la respuesta del endpoint `/api/auth/refresh-token`
2. Se almacena ANTES de reintentar la petición original
3. Se actualiza el header `Authorization` de la petición original

### Almacenamiento
```typescript
authTokenService.setToken(cleanToken);
secureStorage.setAuthToken(cleanToken);
```

## Manejo de Errores

### Si el Refresh Falla
1. Limpiar tokens de todos los storages
2. Verificar que no estamos en `/login`
3. Redirigir a `/login`

```typescript
catch (refreshError) {
  secureStorage.clearSession();
  authTokenService.clearToken();

  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }

  return Promise.reject(refreshError);
}
```

## Diferencias con la Implementación Anterior

### ❌ Antes (Preventivo)
- Decodificaba el token en cada request
- Verificaba expiración ANTES de enviar
- Rechazaba la petición si estaba expirado
- Redirigía al login inmediatamente

### ✅ Ahora (Reactivo con Refresh)
- NO verifica expiración en request
- Deja que el servidor responda 401
- Intenta refresh automático
- Solo redirige si el refresh falla
- La petición original se completa exitosamente

## Ventajas del Nuevo Enfoque

1. **Experiencia de Usuario Mejorada**
   - No interrupciones durante navegación
   - Sesión se extiende automáticamente
   - Menos prompts de login

2. **Consistencia con law-analytics-front**
   - Mismo comportamiento en ambos proyectos
   - Código mantenible
   - Debugging más fácil

3. **Manejo de Tokens Más Robusto**
   - El servidor es la fuente de verdad
   - No hay desincronización de tiempos
   - Funciona con diferentes zonas horarias

4. **Menor Latencia**
   - No necesita decodificar JWT en cada request
   - Refresh solo cuando es necesario

## Logs para Debugging

El sistema incluye logs detallados:

```
🔄 workersAxios: Intentando refrescar token...
✅ workersAxios: Token refrescado exitosamente
🔄 workersAxios: Reintentando petición original con nuevo token
✅ workersAxios: Response 200: {...}
```

o en caso de error:

```
❌ workersAxios: Response error: 401
🔄 workersAxios: Intentando refrescar token...
❌ workersAxios: Error al refrescar token: {...}
```

## Testing

Para probar el sistema de refresh:

1. Login normalmente
2. Esperar a que el token expire (o modificar el exp en el JWT)
3. Hacer una petición a workers API
4. Verificar en console:
   - Se intenta el refresh
   - Se reintenta la petición original
   - La petición se completa exitosamente

## Compatibilidad

- ✅ Compatible con httpOnly cookies
- ✅ Compatible con tokens en headers
- ✅ Compatible con tokens en body
- ✅ Compatible con múltiples storages (cookies, localStorage, sessionStorage)
- ✅ Compatible con withCredentials para CORS

## Mantenimiento

Si necesitas agregar más instancias de axios, asegúrate de:

1. Importar `authTokenService` y `secureStorage`
2. Implementar `getAuthToken()` helper
3. Agregar request interceptor con token
4. Agregar response interceptor con refresh logic
5. Establecer flag `_retry` para prevenir loops
6. Excluir endpoints de auth del refresh
