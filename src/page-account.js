import { getApiBaseUrl } from "./config.js";

/**
 * Format a number of seconds as a compact human readable duration.
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatPlaytime(totalSeconds) {
	const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	if (minutes > 0) {
		return `${minutes}m`;
	}
	return `${seconds}s`;
}

/**
 * Resolve the account id to display.
 *
 * Priority: `?id=` query parameter, then a `/account/<id>` path segment.
 * Returns null when viewing your own account.
 *
 * @returns {string|null}
 */
function getTargetAccountId() {
	const params = new URLSearchParams(window.location.search);
	const queryId = params.get("id");
	if (queryId) {
		return queryId;
	}

	const segments = window.location.pathname.replace(/\/+$/, "").split("/");
	const last = segments.pop();
	if (last && last !== "account") {
		return decodeURIComponent(last);
	}
	return null;
}

async function fetchJson(url, options) {
	const response = await fetch(url, options);
	const data = await response.json().catch(() => ({}));
	return { ok: response.ok, data };
}

function renderRows(rows) {
	const container = document.getElementById("profile-rows");
	if (!container) {
		return;
	}

	container.replaceChildren();
	for (const row of rows) {
		const rowEl = document.createElement("div");
		rowEl.className = "profile-row";

		const label = document.createElement("span");
		label.className = "profile-label";
		label.textContent = row.label;

		const value = document.createElement("span");
		value.className = "profile-value";
		value.textContent = row.value ?? "—";

		rowEl.append(label, value);
		container.appendChild(rowEl);
	}
}

/**
 * Render the account page: your own profile at /account, or the public
 * profile of another player at /account/<id>.
 */
export async function initAccountPage() {
	const title = document.getElementById("profile-title");
	const errorEl = document.getElementById("profile-error");
	const targetId = getTargetAccountId();

	try {
		if (targetId) {
			// Public profile — never exposes the private guest UUID.
			const { ok, data } = await fetchJson(
				`${getApiBaseUrl()}/api/users/${encodeURIComponent(targetId)}`
			);

			if (!ok) {
				title.textContent = "Account";
				errorEl.textContent = data.error || "Account not found.";
				renderRows([]);
				return;
			}

			title.textContent = data.username || "Player";
			renderRows([
				{ label: "Username", value: data.username },
				{ label: "Account type", value: data.accountType },
				{ label: "Total playtime", value: formatPlaytime(data.playtimeTotal) }
			]);
			return;
		}

		// Own profile.
		const { ok, data } = await fetchJson(`${getApiBaseUrl()}/api/auth/me`, {
			credentials: "include"
		});

		if (!ok || !data.authenticated) {
			title.textContent = "Account";
			errorEl.textContent = "You are not signed in.";
			renderRows([]);
			return;
		}

		title.textContent = data.username || "Your account";

		const rows = [
			{ label: "Username", value: data.username },
			{ label: "Account type", value: data.accountType },
			{ label: "Account ID", value: data.accountId },
			{ label: "Total playtime", value: formatPlaytime(data.playtimeTotal) }
		];

		// The guest UUID is private and only ever shown to its owner.
		if (data.accountType === "guest" && data.guestUuid) {
			rows.push({ label: "Guest UUID (private)", value: data.guestUuid });
		}

		renderRows(rows);
	} catch (error) {
		console.error("Failed to load account page:", error);
		errorEl.textContent = "Failed to load account info.";
	}
}