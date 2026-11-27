/**
 * Map/location lookup helpers backed by each game's `maps.json`.
 *
 * The JSON file is keyed by map id and each entry looks like:
 *   {
 *     "name": "Debug Room",
 *     "wiki": "https://yume.wiki/yume/Debug_Room",
 *     "mapIds": [1],
 *     ...
 *   }
 *
 * Results are fetched once per game and cached in memory.
 */

/** @type {Map<string, Promise<Object>>} */
const cache = new Map();

/**
 * Load (and cache) the maps.json index for a game.
 *
 * @param {string} gameId
 * @returns {Promise<Object>}
 */
function loadMaps(gameId) {
	if (cache.has(gameId)) {
		return cache.get(gameId);
	}

	const promise = (async () => {
		try {
			const response = await fetch(`/games/${encodeURIComponent(gameId)}/maps.json`);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.warn("Could not load maps.json", error);
			return {};
		}
	})();

	cache.set(gameId, promise);

	return promise;
}

/**
 * Resolve the location entry for a given map id.
 *
 * @param {string} gameId
 * @param {number|string|null|undefined} mapId
 * @returns {Promise<Object|null>} The location entry, or null when unknown.
 */
export async function getMapLocationByGameIdAndMapId(gameId, mapId) {
	if (!gameId || mapId === null || mapId === undefined || mapId === "") {
		return null;
	}

	const maps = await loadMaps(gameId);

	return maps[mapId] ?? maps[String(mapId)] ?? null;
}

/**
 * Resolve just the display name for a given map id.
 *
 * @param {string} gameId
 * @param {number|string|null|undefined} mapId
 * @returns {Promise<string|null>} The location name, or null when unknown.
 */
export async function getMapNameByGameIdAndMapId(gameId, mapId) {
	const location = await getMapLocationByGameIdAndMapId(gameId, mapId);

	return location?.name ?? null;
}