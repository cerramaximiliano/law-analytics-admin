# Law Analytics Admin

Panel de administración para Law Analytics - Sistema de gestión y configuración de workers.

## Descripción

Este proyecto es un panel de administración independiente que comparte el sistema de autenticación con Law Analytics pero utiliza endpoints separados para las operaciones de administración, específicamente enfocado en la gestión de workers.

## Tecnologías

- **React 18.2** - Librería UI
- **TypeScript 4.9** - Tipado estático
- **Vite 7.1** - Build tool y dev server
- **Material-UI 5.13** - Componentes UI
- **Redux Toolkit** - State management
- **React Router 6** - Routing
- **Axios** - HTTP client
- **Formik + Yup** - Forms y validación

## Estructura del Proyecto

```
law-analytics-admin/
├── public/              # Archivos estáticos
├── src/
│   ├── assets/         # Imágenes, fuentes
│   ├── components/     # Componentes reutilizables
│   ├── contexts/       # React Contexts (Auth)
│   ├── hooks/          # Custom hooks
│   ├── layout/         # Layouts (MainLayout)
│   ├── pages/          # Páginas de la aplicación
│   │   ├── auth/       # Login, Register, etc.
│   │   └── admin/      # Páginas admin
│   ├── routes/         # Configuración de rutas
│   ├── sections/       # Secciones de componentes
│   ├── services/       # API services
│   ├── store/          # Redux store
│   ├── themes/         # Temas MUI
│   ├── types/          # Tipos TypeScript
│   └── utils/          # Utilidades
├── .env                # Variables de entorno
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (puerto 5174)
npm run dev

# Build para producción
npm run build

# Build para staging
npm run build-stage
```

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
# Google OAuth
VITE_AUTH0_GOOGLE_ID=your_google_client_id

# API URLs
VITE_AUTH_URL=https://api.lawanalytics.app
VITE_WORKERS_URL=your_workers_api_url

# Development
VITE_DEV_EMAIL=your_email
VITE_DEV_PASSWORD=your_password
```

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Build de producción
- `npm run build-stage` - Build de staging
- `npm run preview` - Preview del build
- `npm run lint` - Ejecuta ESLint
- `npm run format` - Formatea código con Prettier
- `npm run type-check` - Verifica tipos TypeScript

## Características

### Fase 1 ✅ (Completada)
- [x] Estructura del proyecto con Vite + React + TypeScript
- [x] Configuración de dependencias (MUI, Redux, Axios, Router)
- [x] TypeScript, ESLint y Prettier configurados
- [x] Estructura de carpetas completa
- [x] Sistema de temas MUI (light/dark mode)
- [x] Variables de entorno configuradas

### Fase 2 (Pendiente)
- [ ] Sistema de autenticación completo
- [ ] Redux store con persistencia
- [ ] Axios instances configurados
- [ ] Servicios de tokens
- [ ] Guards de rutas

### Fase 3 (Pendiente)
- [ ] MainLayout con Header y Sidebar
- [ ] Sistema de navegación
- [ ] React Router configurado

### Fase 4 (Pendiente)
- [ ] Página /admin/causas/workers
- [ ] Componentes de workers
- [ ] Servicio de API para workers

## Convenciones de Código

Ver [CLAUDE.md](./CLAUDE.md) para guías detalladas de código y estilo.

## Autenticación

El sistema de autenticación utiliza los mismos endpoints que el proyecto principal:
- POST `/api/auth/login` - Login con email/password
- POST `/api/auth/google` - Login con Google OAuth
- GET `/api/auth/me` - Obtener usuario actual

Las operaciones de workers utilizan una API diferente configurada en `VITE_WORKERS_URL`.

## Licencia

Privado - Law Analytics © 2024
