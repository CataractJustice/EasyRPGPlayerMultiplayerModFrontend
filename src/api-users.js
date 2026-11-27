import { getApiBaseUrl } from "./config.js";

/**
 * Build the REST API URL for a single user lookup.
 *
 * @param {string|number} accountId - 64-bit account id.
 * @returns {string}
 */
function buildUserUrl(accountId) {
	const base = getApiBaseUrl();
	const id = encodeURIComponent(String(accountId));

	if (!base || base === "/") {
		return `/api/users/${id}`;
	}

	return `${base.replace(/\/$/, "")}/api/users/${id}`;
}

/**
 * Look up a user's public profile by their 64-bit account id.
 *
 * The server only exposes non-sensitive fields (id, username, accountType).
 * Guest accounts have a `null` username until they pick a display name.
 *
 * @param {string|number} accountId - The 64-bit account id, as returned by
 *   `EasyRPGMultiplayer.getAccountId()`.
 * @returns {Promise<{id: string, username: string|null, accountType: string}>}
 * @throws {Error} If the server responds with a non-2xx status.
 */
export async function fetchUsernameById(accountId) {
	const response = await fetch(buildUserUrl(accountId), {
		method: "GET",
		headers: { Accept: "application/json" }
	});

	if (!response.ok) {
		throw new Error(`Server returned ${response.status}`);
	}

	return response.json();
}