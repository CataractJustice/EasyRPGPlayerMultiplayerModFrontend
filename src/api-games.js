import { getApiBaseUrl } from "./config.js";

const FALLBACK_GAMES = [];

/**
 * Fetch the list of available games from the static games folder.
 *
 * @returns {Promise<{id: string, title: string, description?: string}[]>}
 */
export async function fetchGameList() {
	try {
		const response = await fetch("/games/games.json", {
			method: "GET",
			headers: { Accept: "application/json" }
		});

		if (response.ok) {
			const data = await response.json();
			if (Array.isArray(data.games)) {
				return data.games;
			}
			if (Array.isArray(data)) {
				return data;
			}
		}
	} catch (e) {
		console.warn("Could not load /games/games.json, using fallback game list", e);
	}

	return FALLBACK_GAMES;
}
