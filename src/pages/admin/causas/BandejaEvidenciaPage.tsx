import { useEffect, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { Alert, Breadcrumbs, Link, Stack, Typography } from "@mui/material";
import MainCard from "components/MainCard";
import CopyButton from "components/CopyButton";
import pjnCredentialsService, { PjnCredential } from "api/pjnCredentials";
import { BandejaEvidenciaContent } from "./BandejaEvidenciaDialog";

// Ruta propia de la evidencia de bandeja de una credencial: es el destino del
// link del correo de alertas (`?at=` resalta el fallo que disparó la alerta).
const BandejaEvidenciaPage = () => {
	const { credentialId } = useParams<{ credentialId: string }>();
	const [searchParams] = useSearchParams();
	const [cred, setCred] = useState<PjnCredential | null>(null);

	useEffect(() => {
		if (!credentialId) return;
		let alive = true;
		pjnCredentialsService
			.getCredentialById(credentialId)
			.then((r) => alive && setCred(r.data))
			.catch((e) => console.error("Error cargando credencial:", e));
		return () => {
			alive = false;
		};
	}, [credentialId]);

	if (!credentialId || !/^[a-f0-9]{24}$/i.test(credentialId)) {
		return <Alert severity="error">ID de credencial inválido.</Alert>;
	}

	return (
		<Stack spacing={2}>
			<Breadcrumbs>
				<Link component={RouterLink} to="/admin/causas/credentials" underline="hover" color="inherit">
					Credenciales PJN
				</Link>
				{cred?.userEmail ? (
					<Link
						component={RouterLink}
						to={`/admin/causas/credentials?search=${encodeURIComponent(cred.userEmail)}`}
						underline="hover"
						color="inherit"
					>
						{cred.userEmail}
					</Link>
				) : null}
				<Typography color="text.primary">Bandeja</Typography>
			</Breadcrumbs>
			<MainCard
				title="Bandeja — evidencia de fallos"
				secondary={
					<Stack direction="row" spacing={0.5} alignItems="center">
						<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
							{credentialId}
						</Typography>
						<CopyButton value={credentialId} label="ID de credencial" />
					</Stack>
				}
			>
				{cred && (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{cred.userName} · {cred.userEmail} · {cred.cuilMasked}
					</Typography>
				)}
				<BandejaEvidenciaContent credentialId={credentialId} highlightAt={searchParams.get("at")} userEmail={cred?.userEmail} />
			</MainCard>
		</Stack>
	);
};

export default BandejaEvidenciaPage;
