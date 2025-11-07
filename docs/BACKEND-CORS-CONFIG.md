# Backend CORS Configuration - Workers API

**Fecha**: 2025-11-03
**Estado**: CORS bloqueando header `ngrok-skip-browser-warning`
**Prioridad**: ALTA - Bloquea acceso a Workers API

---

## Problema Actual

El frontend necesita enviar el header `ngrok-skip-browser-warning: true` para bypasear la página de advertencia de ngrok (plan gratuito), pero el backend está bloqueando este header con error CORS:

```
Access to XMLHttpRequest at 'https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/'
from origin 'http://localhost:5174' has been blocked by CORS policy:
Request header field ngrok-skip-browser-warning is not allowed by Access-Control-Allow-Headers in preflight response.
```

---

## Solución: Configurar CORS en el Backend

### Express.js (Node.js)

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000'
  ],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning'  // ← AGREGAR ESTE HEADER
  ],
  exposedHeaders: ['Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));
```

### Fastify

```javascript
const fastify = require('fastify')();

fastify.register(require('@fastify/cors'), {
  origin: [
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000'
  ],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning'  // ← AGREGAR ESTE HEADER
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
});
```

### Python Flask

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

CORS(app,
     origins=[
         'http://localhost:5174',
         'http://localhost:5175',
         'http://localhost:5176',
         'http://localhost:3000'
     ],
     allow_headers=[
         'Content-Type',
         'Authorization',
         'ngrok-skip-browser-warning'  # ← AGREGAR ESTE HEADER
     ],
     supports_credentials=True,
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'])
```

### Python Django

```python
# settings.py

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'content-type',
    'authorization',
    'ngrok-skip-browser-warning',  # ← AGREGAR ESTE HEADER
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
```

### NestJS

```typescript
// main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:3000'
    ],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning'  // ← AGREGAR ESTE HEADER
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
  });

  await app.listen(3000);
}
bootstrap();
```

---

## ¿Por Qué Se Necesita Este Header?

### Problema de Ngrok (Plan Gratuito)

Ngrok free plan muestra una página de advertencia en el navegador antes de permitir el acceso a la aplicación:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>ngrok - Warning</title>
  </head>
  <body>
    <h1>You are about to visit: your-app.ngrok-free.app</h1>
    <p>Click "Visit Site" to continue</p>
  </body>
</html>
```

Esta página HTML se devuelve con status 200, lo que hace que el frontend piense que recibió una respuesta exitosa, pero el contenido es HTML en lugar de JSON.

### Solución

Enviar el header `ngrok-skip-browser-warning: true` le indica a ngrok que omita esta página de advertencia y devuelva directamente el contenido de la API.

**Documentación oficial de ngrok**: https://ngrok.com/docs/http/http-header-templates/

---

## Verificar Configuración Actual

### 1. Revisar CORS en el Backend

Busca en tu código backend dónde está configurado CORS:

```bash
# Express/Node
grep -r "cors(" .

# Python
grep -r "CORS(" .
grep -r "CORS_ALLOW" .

# NestJS
grep -r "enableCors" .
```

### 2. Verificar Headers Permitidos

Busca la configuración actual de `allowedHeaders` o `CORS_ALLOW_HEADERS`:

```bash
# Express
grep -r "allowedHeaders" .

# Python
grep -r "CORS_ALLOW_HEADERS" .
```

### 3. Agregar el Nuevo Header

Agrega `'ngrok-skip-browser-warning'` al array de headers permitidos.

---

## Testing

### 1. Antes de la Configuración

```bash
# Hacer petición con el header
curl -H "ngrok-skip-browser-warning: true" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/

# Resultado esperado: Error CORS
```

### 2. Después de la Configuración

```bash
# Hacer petición con el header
curl -H "ngrok-skip-browser-warning: true" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     https://jenna-nonspillable-nontabularly.ngrok-free.dev/api/api/configuracion-scraping/

# Resultado esperado: JSON response exitoso
```

### 3. Verificar en el Frontend

Una vez configurado el backend:

1. Ir a http://localhost:5174/admin/causas/workers
2. Abrir DevTools (F12) → Console
3. Deberías ver:

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

---

## Alternativas (Si No Puedes Cambiar CORS)

### Opción 1: Ngrok Pro/Paid Plan

El plan pago de ngrok no muestra la página de advertencia:
- https://ngrok.com/pricing

### Opción 2: Usar Otro Túnel

Alternativas a ngrok que no tienen warning page:
- **localtunnel**: https://localtunnel.github.io/www/
- **serveo**: https://serveo.net/
- **cloudflared**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

### Opción 3: Deploy en Servidor Real

Deploy el backend en un servidor real:
- Heroku
- Railway
- Render
- DigitalOcean
- AWS EC2

### Opción 4: Proxy en el Frontend

Configurar un proxy en Vite para reenviar requests:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/workers': {
        target: 'https://jenna-nonspillable-nontabularly.ngrok-free.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/workers/, '/api'),
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      }
    }
  }
});
```

**⚠️ Problema**: Solo funciona en desarrollo, no en producción.

---

## Checklist de Implementación

- [ ] Identificar framework del backend (Express, Fastify, Flask, etc.)
- [ ] Localizar configuración de CORS en el código
- [ ] Agregar `'ngrok-skip-browser-warning'` a `allowedHeaders`
- [ ] Verificar que los orígenes incluyen localhost:5174, 5175, 5176
- [ ] Reiniciar el servidor backend
- [ ] Probar con curl o Postman
- [ ] Probar en el frontend (localhost:5174/admin/causas/workers)
- [ ] Verificar logs en DevTools Console
- [ ] Verificar que no hay errores CORS en Network tab

---

## Contacto

Si tienes problemas con la configuración:

1. **Compartir código actual de CORS**: Copia y pega la configuración actual
2. **Framework del backend**: ¿Qué tecnología usas? (Express, Flask, etc.)
3. **Logs del servidor**: ¿Hay errores en el servidor al hacer la petición?
4. **Versión de librerías**:
   - Express: `npm list express`
   - Flask: `pip show flask-cors`
   - etc.

---

## Estado Actual

### Frontend ✅

```typescript
// src/utils/workersAxios.ts
const workersAxios: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_WORKERS_URL || "http://localhost:3035",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true", // ✅ Header configurado
  },
  withCredentials: false,
});
```

### Backend ❌

**Pendiente**: Agregar `'ngrok-skip-browser-warning'` a `allowedHeaders` en la configuración de CORS.

---

**Última actualización**: 2025-11-03
**Estado**: Esperando configuración de CORS en el backend
