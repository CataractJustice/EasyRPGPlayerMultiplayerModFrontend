/**
 * Return the WebSocket URL used by the EasyRPG multiplayer client.
 *
 * You can override this by setting window.__SERVER_URL__ before this script
 * loads, or by editing the value below.
 *
 * @returns {string}
 */
function getServerURL()
{
	if (typeof window !== "undefined" && window.__SERVER_URL__) {
		return window.__SERVER_URL__;
	}

	// Use wss:// for https pages, ws:// otherwise.
	if (typeof window !== "undefined" && window.location.protocol === "https:") {
		return "wss://" + window.location.host;
	}

	return "ws://localhost:4040";
}

/**
 * Return the REST API base URL used by the game picker and other UI features.
 *
 * You can override this by setting window.__API_BASE_URL__ before this script
 * loads, or by editing the value below.
 *
 * The special value "/" makes all API calls relative to the current origin.
 *
 * @returns {string}
 */
function getApiBaseURL()
{
	if (typeof window !== "undefined" && window.__API_BASE_URL__) {
		return window.__API_BASE_URL__;
	}

	if (typeof window !== "undefined") {
		// Default to same-origin so the picker works when the backend and
		// static frontend are served from the same host.
		return window.location.protocol + "//" + window.location.host;
	}

	return "http://localhost:4040";
}
