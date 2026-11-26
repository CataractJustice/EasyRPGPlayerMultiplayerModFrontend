/**
 * Centralized application configuration.
 *
 * Override any runtime value by setting the corresponding global
 * `window.__<NAME>__` before the modules load.
 */

export const STORAGE_KEY_GUEST_USERNAME = "easyrpg_guest_username";

export const PLAYER_COUNT_REFRESH_MS = 10_000;

export const SPRITES_PER_PAGE = 16;

/**
 * Return the WebSocket URL used by the EasyRPG multiplayer client.
 *
 * Override priority:
 *  1. window.__SERVER_URL__
 *  2. The data-ws-path attribute on the <html> element
 *  3. The current page origin, switching the protocol to ws:// / wss://.
 *
 * @returns {string}
 */
export function getServerUrl() {
	if (typeof window !== "undefined" && window.__SERVER_URL__) {
		return window.__SERVER_URL__;
	}

	if (typeof window === "undefined") {
		return "ws://localhost:4040";
	}

	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	const host = window.location.host;
	const wsPath = document.documentElement.dataset.wsPath;

	if (wsPath && wsPath !== "/") {
		return `${protocol}//${host}/${wsPath.replace(/^\/+/, "")}`;
	}

	return `${protocol}//${host}`;
}

/**
 * Return the REST API base URL used by the game picker and other UI features.
 *
 * Override priority:
 *  1. window.__API_BASE_URL__
 *  2. The current page origin (http:// or https:// + host).
 *
 * @returns {string}
 */
export function getApiBaseUrl() {
	if (typeof window !== "undefined" && window.__API_BASE_URL__) {
		return window.__API_BASE_URL__;
	}

	if (typeof window === "undefined") {
		return "http://localhost:4040";
	}

	return `${window.location.protocol}//${window.location.host}`;
}
