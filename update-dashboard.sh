#!/bin/bash

# Script de actualización para dashboard.lawanalytics.app
# Compila el panel ACÁ y sube el resultado ya hecho al servidor.
#
# El build NO corre más en el hub. El 2026-09-16 un `npm run build` remoto tiró
# producción entera: el hub es un t2.large de 2 vCPU que además sirve nginx,
# Hydra, Postgres y ~27 procesos PM2, y la fase "rendering chunks" lo dejó
# aceptando TCP en 22/80/443 sin responder un solo handshake — sin SSH para
# entrar a arreglarlo. Hubo que reiniciar la instancia desde la consola de AWS.
# Como el hub emite los JWT de todo el ecosistema, ahogarlo no afecta al panel:
# los tira a todos.
#
# Compilar local cuesta ~35s y sube 2,7 MB. El servidor solo extrae y hace el
# swap, que es trabajo de disco, no de CPU.
#
# Puede ejecutarse desde la máquina local O desde el servidor remoto (en el
# servidor no queda otra que compilar ahí; ver el aviso del paso 3).

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

# Opciones de SSH comunes a todas las llamadas.
#
# El -n es necesario, no cosmético: sin él ssh consume el stdin del script
# entero, y el `read` del paso 2 se encuentra con EOF. Bajo `set -e` eso mata
# el deploy en silencio justo despues de imprimir el prompt, dejando el server
# con código nuevo y build viejo.
#
# El keepalive es lo que hace que un parpadeo de red no aborte el deploy. El
# build remoto tarda ~3 minutos sobre una única conexión; sin ServerAlive*, un
# corte de pocos segundos la mata y el deploy falla a mitad de camino. Con
# 15s × 8 tolera dos minutos de silencio antes de rendirse.
SSH_OPTS=(
	-n
	-o BatchMode=yes
	-o ConnectTimeout=15
	-o ServerAliveInterval=15
	-o ServerAliveCountMax=8
)

# ssh con reintento, distinguiendo QUÉ falló.
#
# ssh reserva el código 255 para sus propios errores —"No route to host",
# "Connection refused", timeout— y devuelve tal cual el código del comando
# remoto en cualquier otro caso. Esa distinción es la que permite reintentar
# sin hacer daño: una conexión caída se reintenta, un build que falló NO (eso
# sería esconder un error de compilación detrás de tres intentos idénticos).
ssh_retry() {
	local intentos=3 n=1 rc
	while :; do
		ssh "${SSH_OPTS[@]}" -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" "$@" && return 0
		rc=$?
		if [ "$rc" -ne 255 ]; then
			return "$rc"  # el comando remoto falló por su cuenta
		fi
		if [ "$n" -ge "$intentos" ]; then
			echo -e "${RED}✗ Sin conexión al servidor tras ${intentos} intentos${NC}" >&2
			return "$rc"
		fi
		echo -e "${YELLOW}⚠ Conexión caída (intento ${n}/${intentos}); reintentando en $((n * 10))s${NC}" >&2
		sleep $((n * 10))
		n=$((n + 1))
	done
}

# Función para ejecutar comandos con sudo en el servidor.
# Asume que el usuario remoto tiene NOPASSWD configurado (ver /etc/sudoers.d/).
remote_sudo() {
	ssh_retry "sudo bash -c '$1'"
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
echo -e "\n${YELLOW}[0/5] Verificando ownership del working tree...${NC}"
if [ "$IS_REMOTE" = true ]; then
	local_sudo "find ${REMOTE_PATH} -path ${REMOTE_PATH}/node_modules -prune -o -path ${REMOTE_PATH}/.git -prune -o -user root -exec chown ${SERVER_USER}:${SERVER_USER} {} + 2>/dev/null || true"
else
	remote_sudo "find ${REMOTE_PATH} -path ${REMOTE_PATH}/node_modules -prune -o -path ${REMOTE_PATH}/.git -prune -o -user root -exec chown ${SERVER_USER}:${SERVER_USER} {} + 2>/dev/null || true"
fi
echo -e "${GREEN}✓ Ownership verificado${NC}"

# 1. Actualizar código
echo -e "\n${YELLOW}[1/5] Obteniendo últimos cambios de Git...${NC}"
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
	REMOTE_STATE=$(ssh_retry "
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
	echo -e "\n${YELLOW}[2/5] ¿Deseas actualizar el archivo .env? (s/n)${NC}"
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
	echo -e "\n${YELLOW}[2/5] Omitiendo actualización de .env (ejecutando en servidor)${NC}"
fi

# 3. Reinstalar dependencias y rebuild
echo -e "\n${YELLOW}[3/5] Compilando acá y subiendo el resultado...${NC}"
if [ "$CODE_CHANGED" = false ]; then
	echo -e "${YELLOW}⚠ Sin cambios en el código — omitiendo build${NC}"
else
	if [ "$IS_REMOTE" = true ]; then
		# Corriendo DENTRO del servidor no hay a dónde delegar: se compila acá.
		# Es el camino que tiró producción el 2026-09-16 (ver encabezado), así que
		# usarlo sólo si no hay manera de correr el script desde una máquina de
		# desarrollo, y mirando la memoria del box mientras compila.
		echo -e "${YELLOW}⚠ Compilando EN el servidor: es la vía que ahogó el hub en 2026-09-16${NC}"
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
		# Compilar ACÁ. El servidor solo recibe el resultado.
		#
		# El artefacto tiene que corresponder al commit que el server acaba de
		# checkoutear: si el árbol local está sucio o en otro commit, lo que se
		# publicaría no sería lo que dice el sello, y el deploy quedaría mintiendo
		# sobre qué versión está en producción.
		LOCAL_HEAD=$(git rev-parse HEAD)
		if [ "$LOCAL_HEAD" != "$AFTER" ]; then
			echo -e "${RED}✗ El repo local está en ${LOCAL_HEAD:0:7} y el servidor en ${AFTER:0:7}${NC}"
			echo -e "${RED}  Hacé pull/push hasta que coincidan antes de deployar.${NC}"
			exit 1
		fi
		if [ -n "$(git status --porcelain)" ]; then
			echo -e "${RED}✗ Hay cambios sin commitear: el build no correspondería a ${AFTER:0:7}${NC}"
			exit 1
		fi

		# `npm install` en vez de saltarlo: si otra sesión bumpeó una dependencia,
		# compilar con el node_modules viejo produce un bundle que no es el del
		# lock, y eso no se ve hasta que rompe en producción. Con todo satisfecho
		# tarda segundos.
		npm install
		rm -rf build
		if ! npm run build; then
			echo -e "${RED}✗ El build local falló — no se tocó el servidor${NC}"
			exit 1
		fi
		test -f build/index.html || { echo -e "${RED}✗ El build no dejó index.html${NC}"; exit 1; }

		TARBALL="/tmp/la-admin-build-${AFTER:0:7}.tgz"
		tar -czf "$TARBALL" -C build .
		echo -e "${GREEN}✓ Build local listo ($(du -h "$TARBALL" | cut -f1))${NC}"

		scp "${SSH_OPTS[@]:1}" -i "${SSH_KEY}" "$TARBALL" "${SERVER_USER}@${SERVER_IP}:/tmp/" \
			|| { echo -e "${RED}✗ No se pudo subir el build${NC}"; rm -f "$TARBALL"; exit 1; }
		rm -f "$TARBALL"

		# El candado sigue haciendo falta: dos deploys simultáneos podrían pisarse
		# el swap aunque ya no compilen acá.
		ssh_retry "
			cd ${REMOTE_PATH}
			exec 9>.deploy.lock
			flock -w 900 9 || { echo 'LOCK_TIMEOUT'; exit 1; }
			rm -rf build.new && mkdir build.new
			tar -xzf /tmp/$(basename "$TARBALL") -C build.new || { echo 'EXTRACCION_FALLIDA'; exit 1; }
			test -f build.new/index.html || { echo 'PAQUETE_INVALIDO'; exit 1; }
			rm -rf build.old
			[ -d build ] && mv build build.old
			mv build.new build
			# Conservar assets del build anterior: quien tenga la app abierta sigue
			# pidiendo chunks con el hash viejo. Se podan a los 7 días.
			if [ -d build.old/assets ] && [ -d build/assets ]; then
				cp -pn build.old/assets/* build/assets/ 2>/dev/null || true
				find build/assets -type f -mtime +7 -delete 2>/dev/null || true
			fi
			rm -rf build.old
			echo '${AFTER}' > build/.built-commit
			rm -f /tmp/$(basename "$TARBALL")
			echo 'SWAP_OK'
		" || { echo -e "${RED}✗ Falló el swap en el servidor — el sitio sigue con el bundle anterior${NC}"; exit 1; }
	fi
	echo -e "${GREEN}✓ Aplicación recompilada${NC}"
fi

# 4. Limpiar cache de nginx y recargar
echo -e "\n${YELLOW}[4/5] Recargando nginx...${NC}"
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

# 5. Verificar que el sitio sirve efectivamente el build nuevo.
#
# Hasta acá el script anunciaba "¡Actualización completada!" sin haber
# comprobado nada: alcanzaba con que ningún comando devolviera error. Pero los
# modos de falla que importan son silenciosos —el sello quedó de un commit
# viejo, el swap dejó un build/ sin index.html, nginx sirve un index que
# referencia un chunk que no existe— y en todos ellos el script felicitaba y
# el sitio estaba roto. Dos veces esta semana hubo que verificar a mano.
echo -e "\n${YELLOW}[5/5] Verificando que el sitio sirve el build nuevo...${NC}"
VERIF=$(ssh_retry "
	cd ${REMOTE_PATH}
	sello=\$(cat build/.built-commit 2>/dev/null || echo none)
	head=\$(git rev-parse HEAD)
	# El index.html referencia el bundle por hash de contenido; si ese archivo
	# no está en disco, la app carga en blanco.
	chunk=\$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' build/index.html 2>/dev/null | head -1)
	if [ -z \"\$chunk\" ]; then echo \"FALLA sin-chunk \$sello \$head\"; exit 0; fi
	if [ ! -f \"build/\$chunk\" ]; then echo \"FALLA chunk-ausente \$sello \$head\"; exit 0; fi
	if [ \"\$sello\" != \"\$head\" ]; then echo \"FALLA sello-viejo \$sello \$head\"; exit 0; fi
	echo \"OK \$chunk \$sello \$head\"
") || { echo -e "${RED}✗ No se pudo verificar el estado del servidor${NC}"; exit 1; }

if echo "$VERIF" | grep -q '^OK '; then
	echo -e "${GREEN}✓ Sirviendo $(echo "$VERIF" | awk '{print $2}') desde el commit $(echo "$VERIF" | awk '{print substr($4,1,7)}')${NC}"
else
	MOTIVO=$(echo "$VERIF" | awk '{print $2}')
	echo -e "${RED}✗ El servidor NO está sirviendo el build esperado (${MOTIVO})${NC}"
	echo -e "${RED}  sello=$(echo "$VERIF" | awk '{print $3}') HEAD=$(echo "$VERIF" | awk '{print $4}')${NC}"
	exit 1
fi

# Que el dominio responda: el build puede estar perfecto en disco y nginx caído.
HTTP=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://${DOMAIN}/" || echo "000")
if [ "$HTTP" = "200" ]; then
	echo -e "${GREEN}✓ https://${DOMAIN}/ responde 200${NC}"
else
	echo -e "${RED}✗ https://${DOMAIN}/ respondió ${HTTP}${NC}"
	exit 1
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ¡Actualización completada! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${GREEN}Verifica en: https://${DOMAIN}${NC}"
echo -e "${YELLOW}Tip: Limpia la caché del navegador con Ctrl+Shift+R${NC}"
