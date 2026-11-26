import { fetchGameList } from "./api-games.js";
import { fetchPlayerCounts } from "./api-players.js";
import { PLAYER_COUNT_REFRESH_MS } from "./config.js";

/**
 * Entry point for the game selection page.
 *
 * Renders the game cards and refreshes player counts.
 */
export function initPickerPage() {
	const pickerMain = document.getElementById("picker-main");
	const pickerList = document.getElementById("picker-list");
	const totalPlayersElement = document.getElementById("total-players");
	const errorElement = document.getElementById("picker-error");

	if (!pickerMain || !pickerList) {
		return;
	}

	function showError(message) {
		errorElement.textContent = message;
	}

	function clearError() {
		errorElement.textContent = "";
	}

	function buildGameUrl(gameId) {
		return `/${encodeURIComponent(gameId)}/`;
	}

	function formatPlayerCount(count) {
		if (typeof count !== "number") return "Players: —";
		if (count === 0) return "No players online";
		if (count === 1) return "1 player online";
		return `${count} players online`;
	}

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

		card.append(title, count);

		if (game.description) {
			const desc = document.createElement("p");
			desc.className = "picker-card-description";
			desc.textContent = game.description;
			card.appendChild(desc);
		}

		return card;
	}

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
			const count =
				counts.games && typeof counts.games[game.id] === "number"
					? counts.games[game.id]
					: 0;

			pickerList.appendChild(renderGameCard({
				id: game.id,
				title: game.title,
				description: game.description,
				count
			}));
		}
	}

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

	refresh();
	setInterval(refresh, PLAYER_COUNT_REFRESH_MS);
}
