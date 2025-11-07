#!/bin/bash

# Script de actualización para dashboard.lawanalytics.app
# Actualiza el código y reconstruye la aplicación

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración
DOMAIN="dashboard.lawanalytics.app"
PROJECT_NAME="law-analytics-admin"
SERVER_USER="ubuntu"
SERVER_IP="15.229.93.121"
SSH_KEY="/home/mcerra/www/lawanalytics.app.pem"
REMOTE_PATH="/var/www/${PROJECT_NAME}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Actualizando ${DOMAIN}${NC}"
echo -e "${GREEN}========================================${NC}"

# Función para ejecutar comandos con sudo en el servidor
remote_sudo() {
	ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "echo 'REDACTED' | sudo -S bash -c '$1'"
}

# 1. Actualizar código
echo -e "\n${YELLOW}[1/4] Obteniendo últimos cambios de Git...${NC}"
ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "
	cd ${REMOTE_PATH}
	git fetch origin
	git reset --hard origin/main
	echo 'Código actualizado'
"
echo -e "${GREEN}✓ Código actualizado${NC}"

# 2. Preguntar si actualizar .env
echo -e "\n${YELLOW}[2/4] ¿Deseas actualizar el archivo .env? (s/n)${NC}"
read -r update_env
if [ "$update_env" = "s" ] || [ "$update_env" = "S" ]; then
	if [ -f ".env" ]; then
		scp -i "${SSH_KEY}" .env "${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/.env"
		echo -e "${GREEN}✓ Archivo .env actualizado${NC}"
	else
		echo -e "${RED}✗ No se encontró archivo .env local${NC}"
	fi
else
	echo -e "${YELLOW}⚠ Usando .env existente en el servidor${NC}"
fi

# 3. Reinstalar dependencias y rebuild
echo -e "\n${YELLOW}[3/4] Instalando dependencias y recompilando...${NC}"
ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "
	cd ${REMOTE_PATH}
	npm install
	npm run build
	echo 'Build completado'
"
echo -e "${GREEN}✓ Aplicación recompilada${NC}"

# 4. Limpiar cache de nginx y recargar
echo -e "\n${YELLOW}[4/4] Recargando nginx...${NC}"
remote_sudo "systemctl reload nginx"
echo -e "${GREEN}✓ Nginx recargado${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ¡Actualización completada! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${GREEN}Verifica en: https://${DOMAIN}${NC}"
echo -e "${YELLOW}Tip: Limpia la caché del navegador con Ctrl+Shift+R${NC}"
