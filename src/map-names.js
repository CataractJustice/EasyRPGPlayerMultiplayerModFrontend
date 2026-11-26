const mapNamesCache = new Map();

export async function getMapNameByGameIdAndMapId(gameId, mapId) {
	if(typeof mapId !== "number") return "";
	if (!mapNamesCache.has(gameId)) {
		const promise = fetch(`/games/${gameId}/map-names.json`)
			.then(response => {
				if (!response.ok) {
					throw new Error(`Failed to load map names for game ${gameId}`);
				}
				return response.json();
			});

		mapNamesCache.set(gameId, promise);
	}

	try {
		const mapNames = await mapNamesCache.get(gameId);
		return mapNames[mapId] ?? `map #${mapId}`;
	} catch {
		return `map #${mapId}`;
	}
}