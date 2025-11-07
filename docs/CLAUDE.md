# CLAUDE.md - Law Analytics Admin Guide

## Comandos Disponibles

- `npm run dev` - Iniciar servidor de desarrollo (puerto 5174)
- `npm run build` - Build para producción
- `npm run build-stage` - Build para staging usando .env.qa
- `npm run test` - Ejecutar tests
- `npm run lint` - Ejecutar ESLint para verificar código
- `npm run format` - Formatear código con Prettier
- `npm run type-check` - Verificar tipos TypeScript

## Guías de Estilo de Código

### TypeScript
- Usa tipado estricto e interfaces
- Evita `any` siempre que sea posible
- Define interfaces para props de componentes y tipos de datos

### Imports
- Ordena imports lógicamente
- Evita imports profundos de MUI (`@mui/*/*/*`)
- Usa los alias configurados en tsconfig:
  - `components/` en lugar de `../../../components`
  - `utils/` en lugar de `../../utils`

### Formato
- **Indentación**: Usa tabs
- **Ancho máximo**: 140 caracteres
- **Comillas**: Dobles (`"`)
- **Comas finales**: Siempre (trailing commas)
- **Punto y coma**: Automático según Prettier

### Naming
- **Variables/Funciones**: camelCase (`userData`, `fetchUser`)
- **Componentes/Clases**: PascalCase (`UserCard`, `AuthProvider`)
- **Constantes**: UPPER_SNAKE_CASE (`API_URL`, `MAX_RETRIES`)
- **Archivos de componentes**: PascalCase (`UserCard.tsx`)
- **Archivos de utilidades**: camelCase (`authService.ts`)

### Manejo de Errores
- Usa try/catch para llamadas API y operaciones async
- Muestra mensajes de error claros al usuario
- Registra errores en consola para debugging

### Componentes React
- Sigue patrones de componentes funcionales con hooks
- Usa `React.memo()` para componentes que renderizan con frecuencia
- Destructura props al inicio del componente
- Usa `useMemo` y `useCallback` cuando sea apropiado

### State Management
- **Redux**: Para estado global (auth, menu, snackbar)
- **Context**: Para tema y autenticación
- **Local State**: Para estado específico del componente

### Estilado
- Usa el sistema de temas MUI
- Usa `styled()` de @mui/material para componentes personalizados
- Define estilos en archivos separados cuando sean complejos

### Iconos
- Usa **iconsax-react** para iconos
- Ejemplo: `<SearchNormal1 size={20} />`

## Consejos para el Proyecto

1. **Convenciones de TypeScript**: Sigue las convenciones para nombramiento y estructura
2. **Variables no usadas**: Usa prefijo `_` para variables obligatorias que no se usan (`_unusedParam`)
3. **Props de componentes**: Asegúrate de utilizar todos los props o desestructurarlos con `...rest`
4. **Imports de MUI**: No uses imports profundos como `@mui/material/Button/Button`
5. **Axios**: Usa las instancias configuradas (`authAxios`, `workersAxios`)
6. **Rutas**: Usa las constantes definidas en el archivo de rutas

## Estructura de APIs

### API de Autenticación
**Base URL**: `VITE_AUTH_URL` (https://api.lawanalytics.app)

Endpoints:
- `POST /api/auth/login` - Login con email/password
- `POST /api/auth/google` - Login con Google OAuth
- `POST /api/auth/verify-code` - Verificar código 2FA
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### API de Workers
**Base URL**: `VITE_WORKERS_URL`

Endpoints (a definir en fases posteriores):
- `GET /api/workers/scraping/configs`
- `GET /api/workers/scraping/history`
- `POST /api/workers/scraping/start`
- etc.

## Hooks Personalizados

### useAuth
Hook para acceder al contexto de autenticación:
```typescript
const { isLoggedIn, user, login, logout } = useAuth();
```

### useConfig
Hook para acceder a la configuración del tema:
```typescript
const { mode, menuOrientation, container } = useConfig();
```

## Guards de Rutas

### AuthGuard
Protege rutas que requieren autenticación:
```typescript
<Route element={<AuthGuard />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

### AdminRoleGuard
Protege rutas que requieren rol de administrador:
```typescript
<Route element={<AdminRoleGuard />}>
  <Route path="/admin" element={<AdminPanel />} />
</Route>
```

## Variables de Entorno

```env
# Google OAuth
VITE_AUTH0_GOOGLE_ID - ID de cliente de Google OAuth
VITE_GOOGLE_API_KEY - API key de Google

# APIs
VITE_AUTH_URL - URL de la API de autenticación
VITE_WORKERS_URL - URL de la API de workers

# Development
VITE_DEV_EMAIL - Email para desarrollo
VITE_DEV_PASSWORD - Password para desarrollo
VITE_MAINTENANCE_MODE - Modo mantenimiento (true/false)
```

## Debugging

### Redux DevTools
El proyecto tiene Redux DevTools habilitado. Abre las DevTools del navegador para inspeccionar el estado.

### Axios Interceptors
Los interceptors de Axios registran todas las peticiones y respuestas en la consola durante desarrollo.

### TypeScript
Ejecuta `npm run type-check` para verificar errores de tipos sin compilar.

## Testing

```bash
# Ejecutar tests
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Generar cobertura
npm run test:coverage
```

## Build y Deploy

```bash
# Build de producción
npm run build

# Build de staging
npm run build-stage

# Preview del build
npm run preview

# Verificar build completo
npm run build:check
```

## Resolución de Problemas

### Error de tipos TypeScript
```bash
npm run type-check
```

### Error de formato
```bash
npm run format
```

### Error de linting
```bash
npm run lint
```

### Limpiar node_modules
```bash
rm -rf node_modules package-lock.json
npm install
```

## Recursos

- [Documentación de MUI](https://mui.com/)
- [Documentación de Redux Toolkit](https://redux-toolkit.js.org/)
- [Documentación de React Router](https://reactrouter.com/)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de TypeScript](https://www.typescriptlang.org/)

---

Usa VS Code con auto-formatting on save para mantener consistencia en el estilo del código.
