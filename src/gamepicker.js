"use strict";

(function () {

	/* ----------------------------------------
	   DOM elements
	   ---------------------------------------- */

	const pickerList = document.getElementById("picker-list");
	const totalPlayersElement = document.getElementById("total-players");
	const errorElement = document.getElementById("picker-error");

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
	 * Static list of available games. Add your games here.
	 * Each entry needs a unique id and a display title.
	 *
	 * @type {{id: string, title: string, description?: string}[]}
	 */
	const GAMES = [
		// Example entries; replace with your real games.
		{ id: "yumenikki", title: "Yume Nikki" },
		{ id: "ib", title: "Ib" },
		{ id: "b2b", title: "B2B" }
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
		return base + "/api/players" + query;
	}

	/**
	 * Fetch player counts from the server.
	 *
	 * @returns {Promise<{total: number, games?: Record<string, number>, game?: string, count?: number}>}
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
		card.href = "/game.html?game=" + encodeURIComponent(game.id);
		card.setAttribute("role", "listitem");

		const title = document.createElement("h3");
		title.className = "picker-card-title";
		title.textContent = game.title;

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
		if (count === 0) return "No players online";
		if (count === 1) return "1 player online";
		return count + " players online";
	}

	/**
	 * Render the full list of games with current player counts.
	 *
	 * @param {{total: number, games?: Record<string, number>}} counts
	 */
	function render(counts) {
		clearError();

		totalPlayersElement.textContent = String(counts.total);

		pickerList.replaceChildren();

		for (const game of GAMES) {
			const count = counts.games && counts.games[game.id]
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
	 * Load counts once and update the UI.
	 */
	async function refresh() {
		try {
			const counts = await fetchPlayerCounts();
			render(counts);
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
