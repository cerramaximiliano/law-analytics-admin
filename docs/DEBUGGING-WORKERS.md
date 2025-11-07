# Debugging - Workers API

**Fecha**: 2025-10-31
**Estado**: Logs agregados para debugging

## Logs Agregados

He agregado logs de debugging en 3 lugares para rastrear las peticiones a `VITE_WORKERS_URL`:

### 1. **workersAxios** (src/utils/workersAxios.ts)
```typescript
// Request interceptor (línea 76-77)
console.log(`🌐 workersAxios: ${method} ${baseURL}${url}`);
console.log("🔑 Token disponible:", token ? "SÍ" : "NO");

// Response interceptor (línea 94)
console.log(`✅ workersAxios: Response ${status}:`, data);

// Error interceptor (línea 98)
console.error("❌ workersAxios: Response error:", error);
```

### 2. **WorkersService** (src/api/workers.ts)
```typescript
// Antes de la petición (línea 148)
console.log(`📡 WorkersService: GET ${endpoint}`, params);

// Después de la petición (línea 150)
console.log(`✅ WorkersService: Response from ${endpoint}:`, data);

// En caso de error (línea 153)
console.error(`❌ WorkersService: Error GET ${endpoint}:`, error);
```

### 3. **ScrapingWorker** (src/pages/admin/causas/workers/ScrapingWorker.tsx)
```typescript
// Al iniciar (línea 62-63)
console.log("📡 ScrapingWorker: Iniciando petición");
console.log("🔗 Base URL:", VITE_WORKERS_URL);

// Respuesta recibida (línea 67)
console.log("✅ ScrapingWorker: Respuesta recibida:", response);

// Configs encontrados (línea 70)
console.log("✅ Configs encontrados:", cantidad);

// Formato incorrecto (línea 73)
console.warn("⚠️ Respuesta sin datos o formato incorrecto");

// Error (línea 76)
console.error("❌ ScrapingWorker: Error al cargar configs:", error);
```

---

## Qué Verás en la Consola

### **Escenario 1: Todo Funciona Correctamente**

```
📡 ScrapingWorker: Iniciando petición a WorkersService.getScrapingConfigs
🔗 Base URL: https://jenna-nonspillable-nontabularly.ngrok-free.dev/api

📡 WorkersService: GET /api/configuracion-scraping/ {page: 1, limit: 20}

🌐 workersAxios: GET https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/
🔑 Token disponible: eyJhbGciOiJIUzI1NiIs...

✅ workersAxios: Response 200: {success: true, data: [...]}

✅ WorkersService: Response from /api/configuracion-scraping/: {success: true, data: [...]}

✅ ScrapingWorker: Respuesta recibida: {success: true, data: [...]}
✅ Configs encontrados: 3
```

### **Escenario 2: Backend No Responde**

```
📡 ScrapingWorker: Iniciando petición a WorkersService.getScrapingConfigs
🔗 Base URL: https://jenna-nonspillable-nontabularly.ngrok-free.dev/api

📡 WorkersService: GET /api/configuracion-scraping/ {page: 1, limit: 20}

🌐 workersAxios: GET https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/
🔑 Token disponible: eyJhbGciOiJIUzI1NiIs...

❌ workersAxios: Response error: {status: 404, message: "Not Found"}

❌ WorkersService: Error GET /api/configuracion-scraping/: Error: Configuración no encontrada

❌ ScrapingWorker: Error al cargar configs: Error: Configuración no encontrada
```

### **Escenario 3: Token No Disponible**

```
📡 ScrapingWorker: Iniciando petición a WorkersService.getScrapingConfigs
🔗 Base URL: https://jenna-nonspillable-nontabularly.ngrok-free.dev/api

📡 WorkersService: GET /api/configuracion-scraping/ {page: 1, limit: 20}

🌐 workersAxios: GET https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/
🔑 Token disponible: NO

❌ workersAxios: Response error: {status: 401, message: "Unauthorized"}

❌ WorkersService: Error GET /api/configuracion-scraping/: Error: No autorizado

❌ ScrapingWorker: Error al cargar configs: Error: No autorizado
```

### **Escenario 4: Formato de Respuesta Incorrecto**

```
📡 ScrapingWorker: Iniciando petición a WorkersService.getScrapingConfigs
🔗 Base URL: https://jenna-nonspillable-nontabularly.ngrok-free.dev/api

📡 WorkersService: GET /api/configuracion-scraping/ {page: 1, limit: 20}

🌐 workersAxios: GET https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/
🔑 Token disponible: eyJhbGciOiJIUzI1NiIs...

✅ workersAxios: Response 200: {message: "OK"}

✅ WorkersService: Response from /api/configuracion-scraping/: {message: "OK"}

✅ ScrapingWorker: Respuesta recibida: {message: "OK"}
⚠️ Respuesta sin datos o formato incorrecto: {message: "OK"}
```

---

## Cómo Verificar

### 1. **Abrir DevTools**
```
F12 o Click derecho → Inspeccionar
```

### 2. **Ir a Console Tab**
```
Console → Ver logs
```

### 3. **Navegar a Workers**
```
http://localhost:5175/admin/causas/workers
Click en tab "Scraping"
```

### 4. **Ver Logs**
Los logs aparecerán automáticamente cuando la página cargue.

---

## Información que Necesito

Por favor, copia y pega los logs de la consola aquí:

### **Logs Completos:**
```
[Pegar logs aquí]
```

### **Información Adicional:**
- **Base URL mostrada**: _______
- **Token disponible**: SÍ / NO
- **Status de respuesta**: _______
- **Mensaje de error (si hay)**: _______

---

## Verificar También en Network Tab

### 1. **Abrir Network Tab en DevTools**
```
DevTools → Network
```

### 2. **Filtrar por "configuracion"**
```
En el campo de filtro: configuracion
```

### 3. **Buscar la petición**
```
Name: configuracion-scraping
Method: GET
Status: ???
```

### 4. **Click en la petición**
Ver:
- **Request URL**: ¿Cuál es la URL completa?
- **Request Headers**: ¿Tiene Authorization?
- **Response**: ¿Qué devuelve el servidor?
- **Status Code**: 200, 401, 404, 500, etc.

---

## URLs Esperadas

### **Correcta:**
```
https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/
```

### **⚠️ Posible problema - Doble /api:**
Si ves:
```
https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/
```

Podría ser que `VITE_WORKERS_URL` ya incluye `/api` y `WorkersService` también lo agrega.

**Verificar en .env:**
```env
# Debería ser UNO de estos:
VITE_WORKERS_URL=https://jenna-nonspillable-nontabularly.ngrok-free.dev
# O
VITE_WORKERS_URL=https://jenna-nonspillable-nontabularly.ngrok-free.dev/api
```

**Y en WorkersService (src/api/workers.ts:143):**
```typescript
this.endpoint = `/api/configuracion-${workerType}/`;
```

Si `VITE_WORKERS_URL` ya tiene `/api`, entonces el endpoint quedaría:
```
https://.../api + /api/configuracion-scraping/ = /api/api/configuracion-scraping/
```

---

## Posibles Problemas

### 1. **Ngrok Browser Warning (ERR_NGROK_6024)** ✅ RESUELTO
**Síntoma:** Response 200 pero HTML en lugar de JSON
**Causa:** Ngrok free plan muestra página de advertencia
**Solución:** Agregar header `ngrok-skip-browser-warning: true` ✅ YA IMPLEMENTADO

El header se agregó en `src/utils/workersAxios.ts`:
```typescript
headers: {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true", // ← Esto resuelve el problema
}
```

### 2. **URL Incorrecta (Doble /api)**
**Síntoma:** 404 Not Found
**Solución:** Cambiar `.env`:
```env
# De:
VITE_WORKERS_URL=https://jenna-nonspillable-nontabularly.ngrok-free.dev/api

# A:
VITE_WORKERS_URL=https://jenna-nonspillable-nontabularly.ngrok-free.dev
```

### 2. **Backend No Corriendo**
**Síntoma:** ERR_CONNECTION_REFUSED o ECONNREFUSED
**Solución:** Iniciar el backend de workers

### 3. **Token No Enviado**
**Síntoma:** 401 Unauthorized
**Solución:** Verificar que el token se guarda correctamente después del login

### 4. **Endpoint No Existe**
**Síntoma:** 404 Not Found
**Solución:** Verificar que el backend tiene la ruta `/api/configuracion-scraping/`

### 5. **CORS**
**Síntoma:** CORS policy error en consola
**Solución:** Configurar CORS en el backend:
```javascript
app.use(cors({
  origin: 'http://localhost:5175',
  credentials: true
}));
```

---

## Próximos Pasos

1. **Ver los logs en la consola**
2. **Copiar los logs completos**
3. **Verificar Network tab**
4. **Identificar el problema** según los escenarios arriba

---

## Servidor Corriendo

```
✅ http://localhost:5175/
✅ Logs agregados y activos
```

---

**Con estos logs, podremos identificar exactamente dónde está el problema!**
