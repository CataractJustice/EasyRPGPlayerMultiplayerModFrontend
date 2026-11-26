import { getApiBaseUrl } from "./config.js";

/**
 * Build the REST API URL for player counts.
 *
 * @param {string|null} game
 * @returns {string}
 */
function buildApiUrl(game) {
	const base = getApiBaseUrl();
	const query = game ? `?game=${encodeURIComponent(game)}` : "";

	if (!base || base === "/") {
		return `/api/players${query}`;
	}

	return `${base.replace(/\/$/, "")}/api/players${query}`;
}

/**
 * Fetch player counts from the server.
 *
 * @param {string|null} game
 * @returns {Promise<{total: number, games?: Record<string, number>}>}
 */
export async function fetchPlayerCounts(game = null) {
	const response = await fetch(buildApiUrl(game), {
		method: "GET",
		headers: { Accept: "application/json" }
	});

	if (!response.ok) {
		throw new Error(`Server returned ${response.status}`);
	}

	return response.json();
}
