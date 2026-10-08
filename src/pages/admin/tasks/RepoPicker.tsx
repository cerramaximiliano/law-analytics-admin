import React, { useMemo } from "react";
import { Autocomplete, Chip, TextField } from "@mui/material";
import { ECOSYSTEM_REPO_NAMES, repoGroup } from "utils/ecosystemRepos";

interface RepoPickerProps {
	value: string[];
	onChange: (repos: string[]) => void;
}

/** Selector múltiple con todos los repos del ecosistema, agrupados por subsistema. */
const RepoPicker: React.FC<RepoPickerProps> = ({ value, onChange }) => {
	// Si una tarea guardó un repo que ya no está en la lista, igual se muestra.
	const options = useMemo(() => Array.from(new Set([...ECOSYSTEM_REPO_NAMES, ...value])), [value]);

	return (
		<Autocomplete
			multiple
			size="small"
			options={options}
			value={value}
			onChange={(_, repos) => onChange(repos)}
			groupBy={repoGroup}
			disableCloseOnSelect
			renderTags={(selected, getTagProps) =>
				selected.map((name, index) => <Chip {...getTagProps({ index })} key={name} label={name} size="small" />)
			}
			renderInput={(params) => <TextField {...params} label="Repositorios de GitHub" placeholder={value.length ? "" : "Buscar repo…"} />}
		/>
	);
};

export default RepoPicker;
