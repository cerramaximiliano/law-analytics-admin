# Guía de Despliegue - dashboard.lawanalytics.app

## Scripts Disponibles

### 1. `deploy-dashboard.sh` - Despliegue Inicial
Script completo para el primer despliegue del proyecto en el servidor.

**Uso:**
```bash
./deploy-dashboard.sh
```

**Lo que hace:**
1. ✓ Verifica conexión al servidor
2. ✓ Prepara directorio en `/var/www/law-analytics-admin`
3. ✓ Clona el repositorio desde GitHub
4. ✓ Copia variables de entorno (opcional)
5. ✓ Instala dependencias y hace build
6. ✓ Configura nginx para servir la aplicación
7. ✓ Configura SSL con Let's Encrypt (opcional)

**Requisitos previos:**
- DNS de `dashboard.lawanalytics.app` debe apuntar a `15.229.93.121`
- Archivo `.env` configurado localmente (se puede copiar automáticamente)

---

### 2. `update-dashboard.sh` - Actualizaciones
Script rápido para actualizar el código después del despliegue inicial.

**Uso:**
```bash
./update-dashboard.sh
```

**Lo que hace:**
1. ✓ Actualiza código desde Git (main branch)
2. ✓ Opcionalmente actualiza archivo .env
3. ✓ Reinstala dependencias
4. ✓ Reconstruye la aplicación
5. ✓ Recarga nginx

**Cuándo usar:** Después de hacer cambios en el código y pushear a GitHub.

---

## Configuración del Servidor

### Ubicación de Archivos
- **Código:** `/var/www/law-analytics-admin`
- **Build:** `/var/www/law-analytics-admin/dist`
- **Nginx config:** `/etc/nginx/sites-available/dashboard.lawanalytics.app`
- **SSL certs:** `/etc/letsencrypt/live/dashboard.lawanalytics.app/`

### Configuración de Nginx
El nginx está configurado para:
- Servir archivos estáticos desde el directorio `dist`
- Soportar React Router (todas las rutas van a index.html)
- Cache de 1 año para assets estáticos
- Compresión gzip
- Headers de seguridad
- Redirección automática HTTP → HTTPS (después de configurar SSL)

---

## Comandos Útiles

### Conectarse al servidor
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121
```

### Ver logs de nginx
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'sudo tail -f /var/log/nginx/error.log'
```

### Actualizar solo código (sin rebuild)
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'cd /var/www/law-analytics-admin && git pull'
```

### Rebuild manual
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'cd /var/www/law-analytics-admin && npm run build'
```

### Reiniciar nginx
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'echo 988703za | sudo -S systemctl restart nginx'
```

### Verificar configuración de nginx
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'sudo nginx -t'
```

### Ver estado de nginx
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'sudo systemctl status nginx'
```

---

## Troubleshooting

### Error: "nginx: configuration file test failed"
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'sudo nginx -t'
```
Revisa el output para ver qué línea del config tiene error.

### Error: "Cannot find module" o errores de dependencias
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'cd /var/www/law-analytics-admin && rm -rf node_modules package-lock.json && npm install'
```

### La aplicación no carga después de actualizar
1. Limpia la caché del navegador (Ctrl+Shift+R)
2. Verifica que el build se completó correctamente:
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'ls -la /var/www/law-analytics-admin/dist'
```

### SSL no funciona
Renovar certificado manualmente:
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'sudo certbot renew'
```

---

## Variables de Entorno

El archivo `.env` debe contener:

```env
# Google OAuth
VITE_AUTH0_GOOGLE_ID=tu-google-client-id
VITE_GOOGLE_API_KEY=tu-google-api-key

# APIs
VITE_AUTH_URL=https://api.lawanalytics.app
VITE_WORKERS_URL=https://api.lawanalytics.app

# Development (opcional en producción)
VITE_DEV_EMAIL=
VITE_DEV_PASSWORD=
VITE_MAINTENANCE_MODE=false
```

**Importante:** Las variables de entorno de Vite solo se leen en tiempo de build, no en runtime. Si cambias el `.env`, debes hacer rebuild.

---

## Proceso de Desarrollo → Producción

1. Desarrolla y prueba localmente:
```bash
npm run dev
```

2. Haz commit y push de tus cambios:
```bash
git add .
git commit -m "feat: descripción del cambio"
git push
```

3. Actualiza en producción:
```bash
./update-dashboard.sh
```

4. Verifica en el navegador: https://dashboard.lawanalytics.app

---

## Renovación de SSL

Los certificados SSL se renuevan automáticamente. Certbot tiene un cronjob configurado.

Para verificar el estado:
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'sudo certbot certificates'
```

Para renovar manualmente (si es necesario):
```bash
ssh -i /home/mcerra/www/lawanalytics.app.pem ubuntu@15.229.93.121 'sudo certbot renew'
```

---

## Notas Importantes

- El proyecto usa **Vite** como bundler, genera archivos en `dist/`
- El servidor usa **nginx** para servir los archivos estáticos
- Las variables de entorno con prefijo `VITE_` se embeben en el build
- El dominio `dashboard.lawanalytics.app` reemplaza a `admin.lawanalytics.app` para este proyecto
- El puerto 3003 usado por `admin.lawanalytics.app` no se usa aquí (este es un sitio estático)
