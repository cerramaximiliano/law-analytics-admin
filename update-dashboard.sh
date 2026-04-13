#!/bin/bash

# Script de actualización para dashboard.lawanalytics.app
# Actualiza el código y reconstruye la aplicación
# Puede ejecutarse desde la máquina local O desde el servidor remoto

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

# Detectar si estamos en el servidor o en local
CURRENT_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
IS_REMOTE=false

# Verificar si estamos en el servidor (por path o por IP interna AWS)
if [ -d "/var/www/${PROJECT_NAME}" ] && [ "$PWD" = "/var/www/${PROJECT_NAME}" ] || [[ "$CURRENT_IP" == 10.0.* ]]; then
	IS_REMOTE=true
	echo -e "${YELLOW}⚠ Detectado: Ejecutando DESDE el servidor${NC}"
else
	echo -e "${YELLOW}⚠ Detectado: Ejecutando desde máquina LOCAL${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Actualizando ${DOMAIN}${NC}"
echo -e "${GREEN}========================================${NC}"

# Función para ejecutar comandos con sudo en el servidor
remote_sudo() {
	ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "echo '988703za' | sudo -S bash -c '$1'"
}

# Función para ejecutar comandos localmente con sudo
local_sudo() {
	echo '988703za' | sudo -S bash -c "$1"
}

# 1. Actualizar código
echo -e "\n${YELLOW}[1/4] Obteniendo últimos cambios de Git...${NC}"
CODE_CHANGED=true
if [ "$IS_REMOTE" = true ]; then
	# Ejecutando en el servidor
	cd ${REMOTE_PATH}
	BEFORE=$(git rev-parse HEAD)
	git fetch origin
	git reset --hard origin/main
	AFTER=$(git rev-parse HEAD)
	if [ "$BEFORE" = "$AFTER" ]; then
		CODE_CHANGED=false
	fi
	echo 'Código actualizado'
else
	# Ejecutando desde local
	BEFORE_AFTER=$(ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "
		cd ${REMOTE_PATH}
		BEFORE=\$(git rev-parse HEAD)
		git fetch origin
		git reset --hard origin/main
		AFTER=\$(git rev-parse HEAD)
		echo \"\${BEFORE} \${AFTER}\"
	")
	BEFORE=$(echo "$BEFORE_AFTER" | tail -1 | awk '{print $1}')
	AFTER=$(echo "$BEFORE_AFTER" | tail -1 | awk '{print $2}')
	if [ "$BEFORE" = "$AFTER" ]; then
		CODE_CHANGED=false
	fi
	echo 'Código actualizado'
fi
echo -e "${GREEN}✓ Código actualizado${NC}"

# 2. Preguntar si actualizar .env (solo si estamos en local)
if [ "$IS_REMOTE" = false ]; then
	echo -e "\n${YELLOW}[2/4] ¿Deseas actualizar el archivo .env? (s/n)${NC}"
	read -r update_env
	if [ "$update_env" = "s" ] || [ "$update_env" = "S" ]; then
		if [ -f ".env.production" ]; then
			scp -i "${SSH_KEY}" .env.production "${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/.env"
			echo -e "${GREEN}✓ Archivo .env actualizado${NC}"
		else
			echo -e "${RED}✗ No se encontró archivo .env.production local${NC}"
		fi
	else
		echo -e "${YELLOW}⚠ Usando .env existente en el servidor${NC}"
	fi
else
	echo -e "\n${YELLOW}[2/4] Omitiendo actualización de .env (ejecutando en servidor)${NC}"
fi

# 3. Reinstalar dependencias y rebuild
echo -e "\n${YELLOW}[3/4] Instalando dependencias y recompilando...${NC}"
if [ "$CODE_CHANGED" = false ]; then
	echo -e "${YELLOW}⚠ Sin cambios en el código — omitiendo build${NC}"
else
	if [ "$IS_REMOTE" = true ]; then
		# Ejecutando en el servidor
		cd ${REMOTE_PATH}
		npm install
		npm run build
		echo 'Build completado'
	else
		# Ejecutando desde local
		ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "
			cd ${REMOTE_PATH}
			npm install
			npm run build
			echo 'Build completado'
		"
	fi
	echo -e "${GREEN}✓ Aplicación recompilada${NC}"
fi

# 4. Limpiar cache de nginx y recargar
echo -e "\n${YELLOW}[4/4] Recargando nginx...${NC}"
if [ "$CODE_CHANGED" = false ]; then
	echo -e "${YELLOW}⚠ Sin cambios — omitiendo reload de nginx${NC}"
else
	if [ "$IS_REMOTE" = true ]; then
		# Ejecutando en el servidor
		local_sudo "systemctl reload nginx"
	else
		# Ejecutando desde local
		remote_sudo "systemctl reload nginx"
	fi
	echo -e "${GREEN}✓ Nginx recargado${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ¡Actualización completada! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${GREEN}Verifica en: https://${DOMAIN}${NC}"
echo -e "${YELLOW}Tip: Limpia la caché del navegador con Ctrl+Shift+R${NC}"
