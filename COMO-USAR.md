# Cómo Usar Law Analytics Admin

**Guía rápida para comenzar a usar el panel de administración**

## 🚀 Inicio Rápido

### 1. Instalación
```bash
cd /home/mcerra/www/law-analytics-admin
npm install
```

### 2. Configuración
Copia el archivo `.env.example` a `.env` y configura las variables:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:
```env
VITE_AUTH0_GOOGLE_ID=<your-google-client-id>
VITE_GOOGLE_API_KEY=<your-google-api-key>
VITE_AUTH_URL=https://api.lawanalytics.app
VITE_WORKERS_URL=<your-workers-api-url>
```

**Nota:** Nunca compartas o commitees el archivo `.env` con credenciales reales.

### 3. Desarrollo
```bash
npm run dev
```
El servidor se iniciará en http://localhost:5174

### 4. Acceso
1. Abre tu navegador en http://localhost:5174
2. Inicia sesión con tu cuenta de administrador
3. Serás redirigido al dashboard

## 📋 Funcionalidades Principales

### Login
- **Ruta**: `/login`
- **Métodos**: Email/Password o Google OAuth
- **Requisito**: Debes tener rol de ADMIN_ROLE

### Dashboard
- **Ruta**: `/dashboard`
- **Descripción**: Página principal tras login
- **Acceso**: Usuarios autenticados

### Workers Configuration
- **Ruta**: `/admin/causas/workers`
- **Descripción**: Gestión completa de workers
- **Acceso**: Solo administradores

## 🔧 Gestión de Workers

### Tipos de Workers Disponibles

#### 1. Scraping Worker
**Qué hace**: Busca y recopila nuevas causas judiciales

**Configuraciones principales**:
- **Fuero**: CIV (Civil), CSS (Seguridad Social), CNT (Trabajo)
- **Year**: Año de búsqueda
- **Range Start/End**: Rango de números de expediente
- **Enabled**: Activar/desactivar worker

**Configuración avanzada**:
- **Captcha**: Configurar 2captcha o capsolver
- **Proxy**: Habilitar/deshabilitar proxy
- **API Keys**: Gestionar keys de servicios

**Cómo usar**:
1. Ve a tab "Scraping"
2. Verás lista de configuraciones por fuero
3. Toggle "Enabled" para activar/desactivar
4. Click en ícono de edición para modificar valores
5. Click en ícono de configuración (⚙️) para opciones avanzadas
6. Guarda cambios y verifica en historial

#### 2. Verification Worker
**Qué hace**: Verifica la validez de causas judiciales

**Configuraciones principales**:
- **Fuero**: CIV, CSS, CNT
- **Verification Mode**: all, civil, ss, trabajo
- **Batch Size**: Cantidad de documentos por lote
- **Balance**: Saldo de servicios de captcha

**Cómo usar**:
1. Ve a tab "Verificación"
2. Selecciona configuración por fuero
3. Ajusta modo de verificación
4. Configura batch size según carga del servidor
5. Monitorea balance de captcha
6. Activa/desactiva según necesidad

#### 3. App Update Worker
**Qué hace**: Actualiza documentos de causas existentes

**Configuraciones principales**:
- **Interval**: Frecuencia de actualización
- **Documents to Update**: Cantidad por ciclo
- **Last Update**: Última ejecución
- **Status**: Estado actual

**Cómo usar**:
1. Ve a tab "Actualización"
2. Configura intervalos de actualización
3. Ajusta cantidad de documentos
4. Monitorea logs de actualizaciones
5. Verifica estadísticas de éxito/error

#### 4-7. Otros Workers (Placeholders)
**Status**: Implementación pendiente
- Sync Worker
- Processing Worker
- Notification Worker
- Cleanup Worker

## 🎯 Flujos de Trabajo Comunes

### Activar un Worker de Scraping

```
1. Login → /admin/causas/workers
2. Tab "Scraping"
3. Buscar worker del fuero deseado (ej: CIV)
4. Toggle "Enabled" a ON
5. Verificar que year y ranges sean correctos
6. Esperar unos segundos
7. Refresh página
8. Verificar en historial que comenzó a ejecutar
```

### Configurar Captcha para Verification

```
1. Login → /admin/causas/workers
2. Tab "Verificación"
3. Buscar worker del fuero deseado
4. Click en ícono de configuración (⚙️)
5. En modal, sección "Captcha":
   - Seleccionar proveedor (2captcha/capsolver)
   - Ingresar API Key
   - Enable/Disable según necesidad
   - Configurar fallback si es necesario
6. Guardar cambios
7. Verificar balance de captcha
```

### Ver Historial de Ejecuciones

```
1. Login → /admin/causas/workers
2. Tab "Scraping" o "Actualización"
3. Scroll hacia abajo
4. Verás tabla con historial:
   - Fecha de ejecución
   - Fuero procesado
   - Año
   - Rango procesado
   - Documentos encontrados/procesados
5. Usar paginación para ver más registros
6. Filtrar por fuero si es necesario
```

## 📊 Monitoreo

### Indicadores de Estado

**Estados de Workers**:
- 🟢 **Active**: Worker está activo y ejecutando
- 🟡 **Inactive**: Worker está inactivo
- 🔴 **Error**: Worker tiene errores

**Ubicación**: En cada tab, al lado del nombre

### Estadísticas en Tiempo Real

**Scraping Worker**:
- Documents Processed: Total procesados
- Documents Found: Total encontrados
- Last Execution: Última vez que corrió

**Verification Worker**:
- Documents Verified: Total verificados
- Documents Valid: Válidos
- Documents Invalid: Inválidos
- Success Rate: % de éxito

### Logs y Debugging

Para ver logs detallados:
1. Abrir DevTools del navegador (F12)
2. Tab "Console"
3. Filtrar por "Worker" o "API"
4. Ver requests/responses
5. Identificar errores si los hay

## ⚙️ Configuración Avanzada

### Captcha Configuration

**2captcha**:
- Obtener API key en https://2captcha.com
- Costo aproximado: $2.99 por 1000 captchas
- Velocidad: ~30-60 segundos por captcha
- Configurar en modal de config avanzada

**Capsolver**:
- Obtener API key en https://capsolver.com
- Costo aproximado: Varía según tipo
- Velocidad: Similar a 2captcha
- Configurar en modal de config avanzada

### Proxy Configuration

**Cuándo usar**:
- Rate limiting del sitio objetivo
- IP blocking
- Distribución de carga

**Cómo configurar**:
1. Abrir modal de config avanzada
2. Sección "Proxy"
3. Enable proxy
4. Seleccionar aplicación:
   - Puppeteer: Para navegación web
   - Captcha Service: Para resolver captchas
5. Configurar servicio y protocolo
6. Guardar

### Range Configuration (Scraping)

**Qué son los ranges**:
- Range Start: Número inicial de expediente
- Range End: Número final de expediente
- Year: Año de los expedientes

**Ejemplo**:
```
Year: 2024
Range Start: 1
Range End: 1000
```
Buscará expedientes del 1 al 1000 del año 2024.

**Recomendaciones**:
- Ranges pequeños (100-500) para testing
- Ranges grandes (5000+) para producción
- Ajustar según capacidad del servidor

## 🐛 Solución de Problemas

### Error: "No autorizado"
**Causa**: Token expirado o usuario sin permisos
**Solución**:
1. Hacer logout
2. Login nuevamente
3. Verificar que usuario tenga rol ADMIN_ROLE

### Error: "Worker no responde"
**Causa**: Backend caído o URL incorrecta
**Solución**:
1. Verificar VITE_WORKERS_URL en .env
2. Verificar que backend esté corriendo
3. Verificar ngrok tunnel si aplica
4. Verificar logs del backend

### Error: "Balance insuficiente"
**Causa**: Saldo de captcha agotado
**Solución**:
1. Recargar saldo en 2captcha/capsolver
2. Verificar API key correcta
3. Esperar a que balance se actualice
4. Desactivar worker temporalmente

### Workers no ejecutan
**Posibles causas**:
1. **Enabled = false**: Activar toggle
2. **Backend no procesa**: Verificar logs backend
3. **Configuración incorrecta**: Revisar ranges/year
4. **Rate limiting**: Esperar o usar proxy

### Página carga lenta
**Soluciones**:
1. Verificar conexión a internet
2. Limpiar caché del navegador
3. Verificar DevTools por errores
4. Reducir cantidad de datos cargados (pagination)

## 📱 Responsive Design

### Desktop (>1200px)
- Drawer expandido
- Todas las columnas visibles
- Mejor experiencia para gestión

### Tablet (768px-1199px)
- Drawer colapsable
- Algunas columnas ocultas
- Scroll horizontal si es necesario

### Mobile (<768px)
- Drawer con menú hamburger
- Vista simplificada
- Cards en lugar de tablas
- Scroll vertical

## 🔐 Seguridad

### Mejores Prácticas

**Para Administradores**:
1. No compartir credenciales
2. Cerrar sesión al terminar
3. No dejar sesión abierta en computadoras públicas
4. Verificar HTTPS en producción
5. Cambiar passwords regularmente

**Para API Keys**:
1. No commitear keys a Git
2. Usar .env para keys
3. Rotar keys cada 3-6 meses
4. Monitorear uso de keys
5. Desactivar keys comprometidas inmediatamente

### Permisos

**ADMIN_ROLE**:
- Acceso completo a /admin/*
- Puede ver/editar todos los workers
- Puede activar/desactivar workers
- Puede ver historial completo

**USER_ROLE**:
- No tiene acceso a /admin/*
- Solo puede ver dashboard básico
- No puede modificar configuraciones

## 📚 Recursos Adicionales

### Documentación Completa
- `PROYECTO-COMPLETADO.md` - Overview completo
- `FASE-1-DOCUMENTACION.md` - Setup y configuración
- `FASE-2-COMPLETADA.md` - Sistema de autenticación
- `FASE-3-DOCUMENTACION.md` - Layout y navegación
- `FASE-4-DOCUMENTACION.md` - Workers management

### Documentación Resumida
- `FASE-1-RESUMEN.md` - Resumen Fase 1
- `FASE-3-RESUMEN.md` - Resumen Fase 3
- `FASE-4-RESUMEN.md` - Resumen Fase 4

### Código
- `CLAUDE.md` - Guidelines de código
- Código está autoexplicado con comments
- Types/Interfaces documentadas

## 🆘 Soporte

### Obtener Ayuda
1. Revisar esta guía
2. Revisar documentación técnica
3. Buscar en issues del proyecto
4. Contactar al equipo de desarrollo

### Reportar Bugs
1. Descripción clara del problema
2. Pasos para reproducir
3. Screenshots si aplica
4. Logs del navegador/backend
5. Versión del navegador
6. Sistema operativo

## ✅ Checklist de Uso Diario

**Al comenzar el día**:
- [ ] Verificar que backend esté corriendo
- [ ] Login en el sistema
- [ ] Verificar estado de workers activos
- [ ] Revisar historial de la noche
- [ ] Verificar balances de captcha

**Durante el día**:
- [ ] Monitorear logs por errores
- [ ] Ajustar configuraciones según necesidad
- [ ] Activar/desactivar workers según carga
- [ ] Verificar estadísticas de éxito

**Al finalizar el día**:
- [ ] Revisar resumen de ejecuciones
- [ ] Desactivar workers no necesarios
- [ ] Verificar balances para el día siguiente
- [ ] Logout del sistema

---

**¿Preguntas?** Consulta la documentación completa o contacta al equipo.

**Última actualización**: 2025-10-30
