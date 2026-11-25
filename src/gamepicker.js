"use strict";

(function () {

	/* ----------------------------------------
	   DOM elements
	   ---------------------------------------- */

	const pickerMain = document.getElementById("picker-main");
	const pickerList = document.getElementById("picker-list");
	const totalPlayersElement = document.getElementById("total-players");
	const errorElement = document.getElementById("picker-error");

	/* ----------------------------------------
	   Only run on the picker page
	   ---------------------------------------- */

	if (!pickerMain || !pickerList) {
		return;
	}

	/* ----------------------------------------
	   Configuration
	   ---------------------------------------- */

	/**
	 * How often to refresh player counts (milliseconds).
	 *
	 * @type {number}
	 */
	const REFRESH_INTERVAL_MS = 10000;

	/**
	 * Fallback list of available games. Used when /games/games.json cannot be loaded.
	 * Each entry needs a unique id and a display title.
	 *
	 * @type {{id: string, title: string, description?: string}[]}
	 */
	const FALLBACK_GAMES = [
		// Replace with your real games or generate /games/games.json.
	];

	/* ----------------------------------------
	   Helpers
	   ---------------------------------------- */

	/**
	 * Show an error message under the picker title.
	 *
	 * @param {string} message
	 */
	function showError(message) {
		errorElement.textContent = message;
	}

	/**
	 * Clear any displayed error message.
	 */
	function clearError() {
		errorElement.textContent = "";
	}

	/**
	 * Build the REST API URL for player counts.
	 *
	 * @param {string|null} game
	 * @returns {string}
	 */
	function buildApiUrl(game) {
		const base = getApiBaseURL();
		const query = game ? "?game=" + encodeURIComponent(game) : "";
		// Use a relative path when the configured base is empty/same-origin.
		if (!base || base === "/") {
			return "/api/players" + query;
		}
		return base.replace(/\/$/, "") + "/api/players" + query;
	}

	/**
	 * Build the link URL for a game card.
	 *
	 * @param {string} gameId
	 * @returns {string}
	 */
	function buildGameUrl(gameId) {
		return "/" + encodeURIComponent(gameId) + "/";
	}

	/**
	 * Fetch the list of available games from the static games folder.
	 *
	 * @returns {Promise<{id: string, title: string, description?: string}[]>}
	 */
	async function fetchGameList() {
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

	/**
	 * Fetch player counts from the server.
	 *
	 * @returns {Promise<{total: number, games?: Record<string, number>}>}
	 */
	async function fetchPlayerCounts() {
		const response = await fetch(buildApiUrl(null), {
			method: "GET",
			headers: { Accept: "application/json" }
		});

		if (!response.ok) {
			throw new Error("Server returned " + response.status);
		}

		return response.json();
	}

	/**
	 * Render a card for a single game.
	 *
	 * @param {{id: string, title: string, description?: string, count: number}} game
	 */
	function renderGameCard(game) {
		const card = document.createElement("a");
		card.className = "picker-card";
		card.href = buildGameUrl(game.id);
		card.setAttribute("role", "listitem");

		const title = document.createElement("h3");
		title.className = "picker-card-title";
		title.textContent = game.title || game.id;

		const count = document.createElement("div");
		count.className = "picker-card-count";
		count.textContent = formatPlayerCount(game.count);

		card.appendChild(title);
		card.appendChild(count);

		if (game.description) {
			const desc = document.createElement("p");
			desc.className = "picker-card-description";
			desc.textContent = game.description;
			card.appendChild(desc);
		}

		return card;
	}

	/**
	 * Format a player count into readable text.
	 *
	 * @param {number} count
	 * @returns {string}
	 */
	function formatPlayerCount(count) {
		if (typeof count !== "number") return "Players: —";
		if (count === 0) return "No players online";
		if (count === 1) return "1 player online";
		return count + " players online";
	}

	/**
	 * Render the full list of games with current player counts.
	 *
	 * @param {{total: number, games?: Record<string, number>}} counts
	 * @param {{id: string, title: string, description?: string}[]} games
	 */
	function render(counts, games) {
		clearError();

		totalPlayersElement.textContent =
			typeof counts.total === "number" ? String(counts.total) : "—";

		pickerList.replaceChildren();

		if (games.length === 0) {
			showError("No games configured. Add games to /games/ and create /games/games.json.");
			return;
		}

		for (const game of games) {
			const count = counts.games && typeof counts.games[game.id] === "number"
				? counts.games[game.id]
				: 0;
			pickerList.appendChild(renderGameCard({
				id: game.id,
				title: game.title,
				description: game.description,
				count: count
			}));
		}
	}

	/**
	 * Load games and counts once and update the UI.
	 */
	async function refresh() {
		try {
			const [games, counts] = await Promise.all([
				fetchGameList(),
				fetchPlayerCounts().catch(() => ({ total: 0, games: {} }))
			]);
			render(counts, games);
		} catch (err) {
			showError("Could not load player counts: " + err.message);
		}
	}

	/* ----------------------------------------
	   Start
	   ---------------------------------------- */

	refresh();
	setInterval(refresh, REFRESH_INTERVAL_MS);

})();
