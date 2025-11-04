# Google Login - Troubleshooting

**Fecha**: 2025-10-31
**Error**: `ERR_INTERNET_DISCONNECTED` para `accounts.google.com/gsi/client`
**Estado**: Problema del navegador/red, no del código

## Problema Identificado

El error `Failed to load resource: net::ERR_INTERNET_DISCONNECTED` indica que el navegador no puede conectarse a `accounts.google.com` para cargar el SDK de Google OAuth.

### Error en Consola:
```
Failed to load resource: net::ERR_INTERNET_DISCONNECTED
accounts.google.com/gsi/client:1
```

---

## Comparación con law-analytics-front

| Aspecto | law-analytics-front | law-analytics-admin | Estado |
|---------|---------------------|---------------------|--------|
| VITE_AUTH0_GOOGLE_ID | ✅ Mismo ID | ✅ Mismo ID | ✅ Idéntico |
| GoogleOAuthProvider | ✅ Configurado | ✅ Configurado | ✅ Idéntico |
| useGoogleLogin hook | ✅ flow: "implicit" | ✅ flow: "implicit" | ✅ Idéntico |
| CustomGoogleButton | ✅ Implementado | ✅ Implementado | ✅ Idéntico |

**Conclusión**: El código es idéntico. El problema no es del código.

---

## Causas Posibles

### 1. Problema de Red/Conectividad
- **Firewall corporativo** bloqueando `accounts.google.com`
- **VPN** interfiriendo con conexiones a Google
- **Proxy** bloqueando el dominio
- **Restricciones de red**

### 2. Extensiones del Navegador
- **Bloqueadores de ads** (uBlock, AdBlock, etc.)
- **Privacy extensions** (Privacy Badger, Ghostery, etc.)
- **Security extensions** que bloquean scripts de terceros
- **Cookie blockers**

### 3. Configuración de Google Cloud Console
- **Orígenes autorizados** no incluyen `localhost:5175`
- **URIs de redirección** mal configuradas
- **Credenciales incorrectas** o deshabilitadas

### 4. Caché del Navegador
- **Caché corrupto** del SDK de Google
- **Service Workers** interfiriendo

---

## Soluciones

### Solución 1: Verificar Extensiones del Navegador

1. **Abrir DevTools** (F12)
2. **Console tab** → Ver errores
3. **Network tab** → Filtrar por "google" → Ver peticiones bloqueadas
4. **Deshabilitar extensiones temporalmente**:
   - Chrome: Modo incógnito (Ctrl+Shift+N)
   - Chrome: chrome://extensions/ → Deshabilitar todas
   - Firefox: about:addons → Deshabilitar todas

### Solución 2: Verificar Configuración de Google Cloud Console

1. **Ir a**: https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. **Buscar el Client ID**: `949191831766-0dnnre28qhjn8jmbnn7h98lg8ng7dlh6.apps.googleusercontent.com`
4. **Authorized JavaScript origins** debe incluir:
   ```
   http://localhost:5174
   http://localhost:5175
   http://localhost:5176
   http://localhost:3000
   ```
5. **Authorized redirect URIs** debe incluir:
   ```
   http://localhost:5174/auth/callback
   http://localhost:5175/auth/callback
   http://localhost:5176/auth/callback
   ```

### Solución 3: Limpiar Caché

```bash
# Chrome
# Settings → Privacy and security → Clear browsing data
# - Cached images and files
# - Cookies and other site data

# O usar modo incógnito
```

### Solución 4: Verificar Firewall/Red

```bash
# Test conectividad a Google
ping accounts.google.com

# Test con curl
curl -I https://accounts.google.com/gsi/client

# Verificar si hay proxy
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

### Solución 5: Usar Navegador Diferente

- **Probar en otro navegador** (Firefox, Edge, Safari)
- **Modo incógnito/privado**
- **Perfil nuevo del navegador**

---

## Solución Temporal: Usar Solo Email/Password

Si Google Login sigue sin funcionar, puedes usar solo autenticación por email:

### Ya Funcionando:
```typescript
// src/pages/auth/login.tsx línea 131
<AuthLogin forgot="/auth/forgot-password" />
```

### Credenciales de Desarrollo:
```
Email: maximilian@rumba-dev.com
Password: 12345678
```

---

## Debugging

### Ver Logs en Consola del Navegador

```javascript
// Después de hacer click en "Iniciar sesión con Google"
// Console tab debería mostrar:

// Si funciona:
"Google login initiated"

// Si falla:
"Error al iniciar sesión con Google. Intenta nuevamente."
// Y el error de red ERR_INTERNET_DISCONNECTED
```

### Verificar SDK de Google Cargado

```javascript
// En Console tab:
console.log(window.google);

// Si es undefined, el SDK no se cargó
```

### Verificar Variables de Entorno

```javascript
// En Console tab:
console.log(import.meta.env.VITE_AUTH0_GOOGLE_ID);

// Debe mostrar:
"949191831766-0dnnre28qhjn8jmbnn7h98lg8ng7dlh6.apps.googleusercontent.com"
```

---

## Comparación: law-analytics-front vs law-analytics-admin

### ¿Por qué funciona en uno y no en el otro?

Posibles razones:

1. **Puerto diferente**:
   - law-analytics-front: probablemente puerto 3000
   - law-analytics-admin: puerto 5175
   - Si 5175 no está autorizado en Google Console, fallará

2. **Origen diferente**:
   - Verificar si ambos usan `http://localhost`
   - Verificar si uno usa `https`

3. **Estado del caché**:
   - law-analytics-front: SDK ya cacheado
   - law-analytics-admin: Intentando cargar por primera vez

---

## Verificar Configuración Actual

### 1. Variables de Entorno (.env)
```env
VITE_AUTH0_GOOGLE_ID=949191831766-0dnnre28qhjn8jmbnn7h98lg8ng7dlh6.apps.googleusercontent.com
```
✅ **Correcto**

### 2. App.tsx (línea 17)
```typescript
<GoogleOAuthProvider clientId={googleClientId}>
```
✅ **Correcto**

### 3. login.tsx (línea 52-60)
```typescript
const googleLogin = useGoogleLogin({
  onSuccess: handleGoogleSuccess,
  onError: () => { ... },
  flow: "implicit",
  scope: "email profile",
});
```
✅ **Correcto**

### 4. CustomGoogleButton (línea 140-146)
```typescript
<CustomGoogleButton
  onClick={() => googleLogin()}
  disabled={isLoading || isEmailLoading}
/>
```
✅ **Correcto**

---

## Alternativa: Cambiar a Authorization Code Flow

Si el problema persiste, puedes cambiar el flujo de OAuth:

### Actual (Implicit Flow):
```typescript
const googleLogin = useGoogleLogin({
  flow: "implicit",  // Token directo en el navegador
  scope: "email profile",
});
```

### Alternativa (Authorization Code Flow):
```typescript
const googleLogin = useGoogleLogin({
  flow: "auth-code",  // Más seguro, usa backend
  scope: "email profile",
  onSuccess: (codeResponse) => {
    // Enviar code al backend para intercambio
  },
});
```

**⚠️ Requiere cambios en el backend**

---

## Checklist de Diagnóstico

Marca cada item que hayas verificado:

- [ ] Probado en **modo incógnito**
- [ ] Probado en **otro navegador**
- [ ] **Extensiones deshabilitadas**
- [ ] **Caché limpiado**
- [ ] **Orígenes autorizados** en Google Console incluyen puerto 5175
- [ ] **Firewall/VPN** no bloqueando Google
- [ ] **SDK de Google** se carga (verificado en Console)
- [ ] **Variables de entorno** correctas
- [ ] **Network tab** no muestra peticiones bloqueadas

---

## Solución Recomendada

### Paso 1: Modo Incógnito
```
1. Abrir Chrome/Firefox en modo incógnito
2. Ir a http://localhost:5175/
3. Intentar login con Google
4. Si funciona → Problema con extensiones/caché
```

### Paso 2: Verificar Google Console
```
1. https://console.cloud.google.com/
2. Seleccionar proyecto
3. APIs & Services → Credentials
4. Editar OAuth 2.0 Client ID
5. Agregar http://localhost:5175 a orígenes autorizados
6. Guardar y esperar 5-10 minutos
```

### Paso 3: Limpiar Todo
```
1. Borrar caché del navegador
2. Cerrar y reabrir navegador
3. Volver a intentar
```

---

## Estado Actual del Login

### ✅ Funciona:
- Login con email/password
- Variables de entorno configuradas
- Código idéntico a law-analytics-front

### ❌ No Funciona:
- Login con Google (error de red)

### ⏳ Pendiente:
- Diagnóstico del problema de red/extensiones
- Verificación de orígenes autorizados en Google Console

---

## Contacto y Soporte

Si el problema persiste después de todos los pasos:

1. **Verificar con el equipo de backend** que el Client ID sea correcto
2. **Revisar la configuración de Google Cloud Console**
3. **Contactar al administrador de red** si estás en una red corporativa

---

**Última actualización**: 2025-10-31
**Estado**: En investigación - Problema del navegador/red
