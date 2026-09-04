import { useMemo, useState } from "react";
import { Autocomplete, Box, Chip, InputAdornment, Stack, TextField, Typography, alpha, useTheme } from "@mui/material";
import { SearchNormal1 } from "iconsax-react";
import { InfraBox, InfraProcess } from "api/infrastructure";
import { BRAND_BLUE, LIVE_GREEN } from "themes/dashboardTokens";

/**
 * "¿Dónde corre este repo?" — la pregunta que la vista no contestaba.
 *
 * El inventario listaba diez boxes y, dentro de cada uno, sus procesos. Para
 * saber dónde vive `pjn-escritos-worker` había que abrir los boxes de a uno y
 * mirar la tabla. Peor con los que corren en varios: `la-log-shipper` y
 * `worker-monitoring` están en todos, y `legal-scraping-api` en dos —el hub y
 * worker_01—, cosa que no se ve por ningún lado hasta que uno los cuenta a mano.
 *
 * El catálogo NO se escribe acá. Sale del mismo inventario que la vista ya
 * pide, agrupando `processes[].repo` por box. Una lista hardcodeada de repos
 * envejecería en silencio: el día que se agrega un worker, el buscador seguiría
 * diciendo que no existe. Derivándolo, un repo nuevo aparece solo.
 *
 * Cada opción es un par (repo, box), no un repo suelto, porque el destino tiene
 * que ser inequívoco: buscar un repo que corre en cinco lados y llevarte a uno
 * arbitrario sería peor que no llevarte a ninguno. Agrupadas por repo, las
 * cinco filas SON la respuesta a "dónde corre".
 *
 * Con el campo vacío se lista todo el ecosistema. No es un estado de relleno:
 * es el índice de qué hay y dónde, que es justamente lo que no existía.
 */

export interface RepoHit {
	repo: string;
	boxKey: string;
}

interface Opcion {
	id: string;
	repo: string;
	boxKey: string;
	boxNombre: string;
	boxGrupo: string;
	viva: boolean;
	procesos: InfraProcess[];
	/** Todo lo buscable de este par, en minúsculas y ya concatenado. */
	haystack: string;
}

const SIN_REPO = "(sin repo declarado)";

export default function RepoSearch({ boxes, onPick }: { boxes: InfraBox[]; onPick: (hit: RepoHit) => void }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [input, setInput] = useState("");

	const opciones = useMemo<Opcion[]>(() => {
		const out: Opcion[] = [];
		for (const box of boxes) {
			const porRepo = new Map<string, InfraProcess[]>();
			for (const p of box.processes) {
				const repo = p.repo || SIN_REPO;
				if (!porRepo.has(repo)) porRepo.set(repo, []);
				porRepo.get(repo)!.push(p);
			}
			for (const [repo, procesos] of porRepo) {
				out.push({
					id: `${repo}::${box.key}`,
					repo,
					boxKey: box.key,
					boxNombre: box.name,
					boxGrupo: box.group,
					viva: box.live.reachable,
					procesos,
					// El haystack incluye los datos del box —hostname, IPs, proveedor,
					// zona— para que buscar una IP o un hostname también conteste qué
					// corre ahí, que es la misma pregunta al revés.
					haystack: [
						repo,
						box.name,
						box.label,
						box.hostname,
						box.publicIp,
						box.tailscaleIp,
						box.privateIp,
						box.provider,
						box.zone,
						box.role,
						box.group,
						...procesos.map((p) => `${p.name} ${p.role ?? ""}`),
					]
						.filter(Boolean)
						.join(" ")
						.toLowerCase(),
				});
			}
		}
		return out.sort((a, b) => a.repo.localeCompare(b.repo, "es") || a.boxNombre.localeCompare(b.boxNombre, "es"));
	}, [boxes]);

	const cantidadPorRepo = useMemo(() => {
		const m = new Map<string, number>();
		for (const o of opciones) m.set(o.repo, (m.get(o.repo) || 0) + 1);
		return m;
	}, [opciones]);

	const repos = cantidadPorRepo.size;

	return (
		<Autocomplete
			options={opciones}
			groupBy={(o) => o.repo}
			getOptionLabel={(o) => `${o.repo} · ${o.boxNombre}`}
			isOptionEqualToValue={(a, b) => a.id === b.id}
			inputValue={input}
			onInputChange={(_, v, reason) => reason !== "reset" && setInput(v)}
			// El campo queda vacío tras elegir: es un buscador, no un selector de
			// estado. Lo elegido ya se ve en la pestaña que se abrió.
			value={null}
			onChange={(_, o) => {
				if (o) {
					onPick({ repo: o.repo, boxKey: o.boxKey });
					setInput("");
				}
			}}
			// Todos los términos tienen que aparecer (AND): "log worker_01" filtra
			// mucho mejor que quedarse con lo que matchea cualquiera de los dos.
			filterOptions={(opts, state) => {
				const terminos = state.inputValue.toLowerCase().split(/\s+/).filter(Boolean);
				if (!terminos.length) return opts;
				return opts.filter((o) => terminos.every((t) => o.haystack.includes(t)));
			}}
			openOnFocus
			blurOnSelect
			clearOnBlur
			handleHomeEndKeys
			noOptionsText="Ningún repo, proceso, host o IP coincide"
			ListboxProps={{ sx: { maxHeight: 380 } }}
			renderGroup={(params) => (
				<Box key={params.key} component="li" sx={{ listStyle: "none" }}>
					<Stack
						direction="row"
						spacing={1}
						alignItems="baseline"
						sx={{
							px: 1.5,
							py: 0.75,
							position: "sticky",
							top: 0,
							zIndex: 1,
							bgcolor: theme.palette.background.paper,
							borderBottom: `1px solid ${theme.palette.divider}`,
						}}
					>
						<Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace", color: BRAND_BLUE }}>
							{params.group}
						</Typography>
						{/* El conteo es el dato que no estaba en ningún lado: cuántos
						    boxes corren este repo. */}
						<Typography variant="caption" color="text.secondary">
							{cantidadPorRepo.get(params.group) === 1 ? "1 box" : `${cantidadPorRepo.get(params.group)} boxes`}
						</Typography>
					</Stack>
					<Box component="ul" sx={{ p: 0, m: 0 }}>
						{params.children}
					</Box>
				</Box>
			)}
			renderOption={(props, o) => {
				const { key, ...rest } = props as any;
				return (
					<Box component="li" key={key} {...rest} sx={{ display: "block !important", py: 0.75 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Box sx={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, bgcolor: o.viva ? LIVE_GREEN : "#94A3B8" }} />
							<Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
								{o.boxNombre}
							</Typography>
							<Chip size="small" variant="outlined" label={o.boxGrupo} sx={{ height: 17, fontSize: "0.6rem" }} />
						</Stack>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", pl: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
						>
							{o.procesos.map((p) => p.name).join(" · ")}
						</Typography>
					</Box>
				);
			}}
			renderInput={(params) => (
				<TextField
					{...params}
					size="small"
					placeholder={`Buscar dónde corre un repo, proceso, host o IP — ${repos} repos en ${boxes.length} boxes`}
					InputProps={{
						...params.InputProps,
						startAdornment: (
							<InputAdornment position="start">
								<SearchNormal1 size={16} color={theme.palette.text.secondary} />
							</InputAdornment>
						),
					}}
					sx={{
						"& .MuiOutlinedInput-root": {
							bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.035),
						},
					}}
				/>
			)}
		/>
	);
}
