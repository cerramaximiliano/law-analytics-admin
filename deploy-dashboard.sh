#!/bin/bash

# Script de despliegue para dashboard.lawanalytics.app
# Este script configura el proyecto law-analytics-admin en el servidor
#
# IMPORTANTE: Este script es para DEPLOY INICIAL
# Para actualizaciones del código, usa: ./update-dashboard.sh
#
# El script detectará automáticamente si ya existe configuración SSL
# y la preservará en lugar de sobrescribirla.

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
DOMAIN="dashboard.lawanalytics.app"
PROJECT_NAME="law-analytics-admin"
REPO_URL="https://github.com/cerramaximiliano/law-analytics-admin.git"
SERVER_USER="ubuntu"
SERVER_IP="15.229.93.121"
SSH_KEY="/home/mcerra/www/lawanalytics.app.pem"
REMOTE_PATH="/var/www/${PROJECT_NAME}"
BUILD_DIR="build"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Despliegue de ${DOMAIN}${NC}"
echo -e "${GREEN}========================================${NC}"

# Función para ejecutar comandos en el servidor
remote_exec() {
	ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "$@"
}

# Función para ejecutar comandos con sudo en el servidor
remote_sudo() {
	ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "echo '988703za' | sudo -S bash -c '$1'"
}

# 1. Verificar conexión al servidor
echo -e "\n${YELLOW}[1/7] Verificando conexión al servidor...${NC}"
if remote_exec "echo 'Conexión exitosa'"; then
	echo -e "${GREEN}✓ Conectado al servidor${NC}"
else
	echo -e "${RED}✗ Error al conectar al servidor${NC}"
	exit 1
fi

# 2. Preparar directorio en el servidor
echo -e "\n${YELLOW}[2/7] Preparando directorio en el servidor...${NC}"
remote_sudo "if [ -d ${REMOTE_PATH} ]; then echo Haciendo backup...; mv ${REMOTE_PATH} ${REMOTE_PATH}.backup.\$(date +%Y%m%d_%H%M%S); fi && mkdir -p ${REMOTE_PATH} && chown -R ubuntu:ubuntu ${REMOTE_PATH}"
echo -e "${GREEN}✓ Directorio preparado${NC}"

# 3. Clonar repositorio
echo -e "\n${YELLOW}[3/7] Clonando repositorio...${NC}"
remote_exec "
	cd /var/www
	git clone ${REPO_URL} ${PROJECT_NAME}
	cd ${PROJECT_NAME}
	echo 'Repositorio clonado correctamente'
"
echo -e "${GREEN}✓ Repositorio clonado${NC}"

# 4. Copiar variables de entorno de producción
echo -e "\n${YELLOW}[4/7] Copiando variables de entorno de producción...${NC}"
if [ -f ".env.production" ]; then
	scp -i "${SSH_KEY}" .env.production "${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/.env"
	echo -e "${GREEN}✓ Archivo .env.production copiado como .env${NC}"
else
	echo -e "${RED}✗ No se encontró archivo .env.production${NC}"
	echo -e "${YELLOW}⚠ Deberás crear el archivo .env manualmente en el servidor${NC}"
	exit 1
fi

# 5. Instalar dependencias y hacer build
echo -e "\n${YELLOW}[5/7] Instalando dependencias y compilando...${NC}"
remote_exec "
	cd ${REMOTE_PATH}
	npm install
	npm run build
	echo 'Build completado'
"
echo -e "${GREEN}✓ Aplicación compilada${NC}"

# 6. Configurar nginx
echo -e "\n${YELLOW}[6/7] Configurando nginx...${NC}"

# Verificar si ya existe configuración con SSL
SSL_EXISTS=$(remote_exec "grep -q 'listen.*443.*ssl' /etc/nginx/sites-available/${DOMAIN} 2>/dev/null && echo 'yes' || echo 'no'")

if [ "$SSL_EXISTS" = "yes" ]; then
	echo -e "${YELLOW}⚠ Detectada configuración SSL existente${NC}"
	echo -e "${YELLOW}⚠ Actualizando solo el root path sin modificar SSL${NC}"

	# Solo actualizar el root path manteniendo el resto de la configuración
	remote_sudo "sed -i 's|root .*|root ${REMOTE_PATH}/${BUILD_DIR};|g' /etc/nginx/sites-available/${DOMAIN}"
	remote_sudo "nginx -t && systemctl reload nginx"
	echo -e "${GREEN}✓ Nginx actualizado (SSL preservado)${NC}"
else
	echo -e "${YELLOW}⚠ No se detectó SSL, creando configuración básica HTTP${NC}"

	# Crear configuración básica solo si no existe SSL
	remote_sudo "
cat > /etc/nginx/sites-available/${DOMAIN} << 'EOF'
server {
	listen 80;
	listen [::]:80;
	server_name ${DOMAIN};

	root ${REMOTE_PATH}/${BUILD_DIR};
	index index.html;

	# React Router - todas las rutas van a index.html
	location / {
		try_files \\\$uri \\\$uri/ /index.html;
	}

	# Cache para archivos estáticos
	location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
		expires 1y;
		add_header Cache-Control \"public, immutable\";
	}

	# Compresión
	gzip on;
	gzip_vary on;
	gzip_min_length 1024;
	gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

	# Headers de seguridad
	add_header X-Frame-Options \"SAMEORIGIN\" always;
	add_header X-Content-Type-Options \"nosniff\" always;
	add_header X-XSS-Protection \"1; mode=block\" always;

	client_max_body_size 10M;
}
EOF
	"

	# Habilitar sitio
	remote_sudo "
		ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
		nginx -t && systemctl reload nginx
	"
	echo -e "${GREEN}✓ Nginx configurado${NC}"
fi

# 7. Configurar SSL con certbot
echo -e "\n${YELLOW}[7/7] Verificando SSL con Let's Encrypt...${NC}"

if [ "$SSL_EXISTS" = "yes" ]; then
	echo -e "${GREEN}✓ SSL ya está configurado y ha sido preservado${NC}"
	echo -e "${YELLOW}Tip: El certificado se renueva automáticamente vía certbot${NC}"
else
	echo -e "${YELLOW}Nota: Asegúrate de que el DNS ${DOMAIN} apunte a ${SERVER_IP}${NC}"
	echo -e "${YELLOW}¿Deseas configurar SSL ahora? (s/n)${NC}"
	read -r setup_ssl

	if [ "$setup_ssl" = "s" ] || [ "$setup_ssl" = "S" ]; then
		remote_sudo "certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@lawanalytics.app --redirect"
		echo -e "${GREEN}✓ SSL configurado${NC}"
	else
		echo -e "${YELLOW}⚠ Puedes configurar SSL manualmente ejecutando en el servidor:${NC}"
		echo -e "${YELLOW}   sudo certbot --nginx -d ${DOMAIN}${NC}"
	fi
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ¡Despliegue completado! 🚀${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${GREEN}Tu aplicación está disponible en:${NC}"
echo -e "${GREEN}  http://${DOMAIN}${NC}"
if [ "$setup_ssl" = "s" ] || [ "$setup_ssl" = "S" ]; then
	echo -e "${GREEN}  https://${DOMAIN}${NC}"
fi
echo -e "\n${YELLOW}Comandos útiles:${NC}"
echo -e "  Ver logs de nginx: ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_IP} 'sudo tail -f /var/log/nginx/error.log'"
echo -e "  Actualizar código: ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_IP} 'cd ${REMOTE_PATH} && git pull && npm run build'"
echo -e "  Reiniciar nginx: ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_IP} 'echo 988703za | sudo -S systemctl restart nginx'"
