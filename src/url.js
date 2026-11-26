/**
 * Detect the current game from the URL.
 *
 * Priority:
 *   1. The ?game= query parameter, for backward compatibility.
 *   2. The last path segment of a /game-name/ style URL.
 *
 * @returns {string}
 */
export function getGameName() {
	const params = new URLSearchParams(window.location.search);
	const gameParam = params.get("game");

	if (gameParam) {
		return gameParam;
	}

	const path = window.location.pathname.replace(/\/+$/, "");
	const segments = path.split("/");

	return decodeURIComponent(segments.pop() || "");
}
