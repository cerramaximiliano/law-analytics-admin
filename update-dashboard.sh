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

# Función para ejecutar comandos con sudo en el servidor.
# Asume que el usuario remoto tiene NOPASSWD configurado (ver /etc/sudoers.d/).
# El -n es necesario, no cosmético: sin él ssh consume el stdin del script
# entero, y el `read` del paso 2 se encuentra con EOF. Bajo `set -e` eso mata
# el deploy en silencio justo despues de imprimir el prompt, dejando el server
# con código nuevo y build viejo.
remote_sudo() {
	ssh -n -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "sudo bash -c '$1'"
}

# Función para ejecutar comandos localmente con sudo.
local_sudo() {
	sudo bash -c "$1"
}

# 0. Defensa contra archivos root-owned en el repo.
# Si un deploy previo (o edición manual con sudo) dejó archivos del working
# tree owned por root, `git reset --hard` falla silenciosamente con
# "Permission denied" y el build queda con código viejo. Este chown se cura.
# No toca node_modules ni .git (los excluye para no perder ownership intencional).
echo -e "\n${YELLOW}[0/4] Verificando ownership del working tree...${NC}"
if [ "$IS_REMOTE" = true ]; then
	local_sudo "find ${REMOTE_PATH} -path ${REMOTE_PATH}/node_modules -prune -o -path ${REMOTE_PATH}/.git -prune -o -user root -exec chown ${SERVER_USER}:${SERVER_USER} {} + 2>/dev/null || true"
else
	remote_sudo "find ${REMOTE_PATH} -path ${REMOTE_PATH}/node_modules -prune -o -path ${REMOTE_PATH}/.git -prune -o -user root -exec chown ${SERVER_USER}:${SERVER_USER} {} + 2>/dev/null || true"
fi
echo -e "${GREEN}✓ Ownership verificado${NC}"

# 1. Actualizar código
echo -e "\n${YELLOW}[1/4] Obteniendo últimos cambios de Git...${NC}"
# Qué se compila se decide comparando HEAD contra el commit que produjo el
# build que está en disco (build/.built-commit), NO contra lo que trajo el pull.
# Con el criterio viejo, un deploy interrumpido después del pull dejaba al
# server con código nuevo y build viejo, y las corridas siguientes se negaban a
# recompilar porque "no hay cambios" — reportando éxito.
CODE_CHANGED=true
if [ "$IS_REMOTE" = true ]; then
	# Ejecutando en el servidor
	cd ${REMOTE_PATH}
	git fetch origin
	git reset --hard origin/main
	AFTER=$(git rev-parse HEAD)
	BUILT=$(cat build/.built-commit 2>/dev/null || echo "")
	echo 'Código actualizado'
else
	# Ejecutando desde local
	# El fetch NO se silencia: si falla —sin credenciales, sin red— el
	# `git reset --hard origin/main` que sigue resetea a un origin/main viejo y el
	# deploy continúa como si nada, publicando código que no es el de HEAD. Pasó
	# el 2026-09-02 con el pjn-api del hub.
	REMOTE_STATE=$(ssh -n -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "
		set -e
		cd ${REMOTE_PATH}
		git fetch origin || { echo 'FETCH_FALLIDO'; exit 1; }
		git reset --hard origin/main >/dev/null
		echo \"\$(git rev-parse HEAD) \$(cat build/.built-commit 2>/dev/null || echo none)\"
	") || { echo -e "${RED}✗ No se pudo actualizar el código en el servidor${NC}"; exit 1; }
	if echo "$REMOTE_STATE" | grep -q FETCH_FALLIDO; then
		echo -e "${RED}✗ git fetch falló en el servidor: el build usaría código viejo${NC}"
		exit 1
	fi
	AFTER=$(echo "$REMOTE_STATE" | tail -1 | awk '{print $1}')
	BUILT=$(echo "$REMOTE_STATE" | tail -1 | awk '{print $2}')
	echo 'Código actualizado'
fi
if [ -n "$AFTER" ] && [ "$BUILT" = "$AFTER" ]; then
	CODE_CHANGED=false
	echo -e "${YELLOW}⚠ El build en disco ya corresponde a ${AFTER:0:7}${NC}"
fi
echo -e "${GREEN}✓ Código actualizado${NC}"

# 2. Preguntar si actualizar .env (solo si estamos en local)
if [ "$IS_REMOTE" = false ]; then
	echo -e "\n${YELLOW}[2/4] ¿Deseas actualizar el archivo .env? (s/n)${NC}"
	# `|| true`: en una corrida no interactiva (cron, pipe, background) el read
	# recibe EOF y devuelve 1, que con set -e abortaría el deploy. Sin respuesta
	# se asume "n", que es conservar el .env del servidor.
	read -r update_env || update_env="n"
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
	# Copiar página de mantenimiento al servidor
	if [ -f "maintenance.html" ]; then
		scp -i "${SSH_KEY}" maintenance.html "${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/maintenance.html"
		echo -e "${GREEN}✓ Página de mantenimiento copiada${NC}"
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
		# Compilar a directorio temporal para no borrar el sitio activo durante el build
		rm -rf build.new
		if npm run build -- --outDir build.new; then
			# Swap atómico: reemplazar build solo cuando el nuevo está completo
			rm -rf build.old
			[ -d "build" ] && mv build build.old
			mv build.new build
			# Conservar los assets del build anterior: un usuario con la app abierta
			# sigue pidiendo chunks con el hash viejo y, si se borraron, la vista
			# queda en blanco (o fuerza recarga). Los nombres llevan hash de
			# contenido, así que conviven sin colisionar. Se podan a los 7 días.
			if [ -d build.old/assets ] && [ -d build/assets ]; then
				cp -pn build.old/assets/* build/assets/ 2>/dev/null || true
				find build/assets -type f -mtime +7 -delete 2>/dev/null || true
			fi
			rm -rf build.old
			# Sello del commit que produjo este build. Viaja dentro de build/, así el
			# swap atómico lo mueve junto con los assets que describe. Va DENTRO de
			# la rama de éxito: escribirlo siempre hacía que un build fallido se
			# reportara como exitoso y bloqueara los reintentos.
			echo "${AFTER}" > build/.built-commit
			echo 'Build completado'
		else
			# Si el build con outDir falla (ej. incompatibilidad), fallback directo
			rm -rf build.new
			if npm run build; then
				echo "${AFTER}" > build/.built-commit
				echo 'Build completado (fallback sin outDir)'
			else
				echo -e "${RED}✗ El build falló — el sitio sigue con el bundle anterior${NC}"
				exit 1
			fi
		fi
	else
		# Ejecutando desde local
		ssh -n -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "
			cd ${REMOTE_PATH}
			npm install
			rm -rf build.new
			if npm run build -- --outDir build.new; then
				rm -rf build.old
				[ -d 'build' ] && mv build build.old
				mv build.new build
				# Conservar assets del build anterior (ver comentario arriba): evita
				# la pantalla blanca de quien tenga la app abierta durante el deploy.
				if [ -d build.old/assets ] && [ -d build/assets ]; then
					cp -pn build.old/assets/* build/assets/ 2>/dev/null || true
					find build/assets -type f -mtime +7 -delete 2>/dev/null || true
				fi
				rm -rf build.old
				# El sello se escribe SOLO si el build salió bien, y dentro de la
				# rama de éxito. Estaba después del if/else, así que se escribía
				# incluso cuando el build fallaba: el deploy reportaba éxito con un
				# bundle viejo y las corridas siguientes se negaban a recompilar
				# porque "no hay cambios". Mordió dos veces el 2026-09-02/03.
				echo '${AFTER}' > build/.built-commit
				echo 'Build completado'
			else
				rm -rf build.new
				if npm run build; then
					echo '${AFTER}' > build/.built-commit
					echo 'Build completado (fallback sin outDir)'
				else
					echo 'BUILD_FALLIDO'
					exit 1
				fi
			fi
		" || { echo -e "${RED}✗ El build falló en el servidor — el sitio sigue con el bundle anterior${NC}"; exit 1; }
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
