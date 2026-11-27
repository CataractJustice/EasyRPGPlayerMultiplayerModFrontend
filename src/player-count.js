import { fetchPlayerCounts } from "./api-players.js";
import { MAP_PLAYER_COUNT_REFRESH_MS, PLAYER_COUNT_REFRESH_MS } from "./config.js";

/**
 * Controller for the player count display in the chat info panel.
 *
 * Shows either the total player count for the current game (fetched from the
 * REST API, like the game list page) or the player count for the current map
 * (read from the player iframe). Defaults to the game count and can be toggled.
 */
export class PlayerCountController {
	#elements = {};
	#gameId = null;
	#getMapPlayerCount = null;
	#scope = "game";
	#timer = null;

	/**
	 * @param {Object} elements
	 * @param {HTMLElement} elements.count - Element that displays the number.
	 * @param {HTMLButtonElement} elements.toggle - Button that switches scope.
	 * @param {Object} options
	 * @param {string} options.gameId
	 * @param {Function} options.getMapPlayerCount - Returns the current map count.
	 */
	constructor(elements, options = {}) {
		this.#elements = elements;
		this.#gameId = options.gameId ?? null;
		this.#getMapPlayerCount = options.getMapPlayerCount ?? null;

		this.#elements.toggle?.addEventListener("click", () => this.toggleScope());

		this.#updateToggle();
		this.#render(null);
	}

	/** Begin periodic refresh. Safe to call more than once. */
	start() {
		this.#refresh();
		this.#restartTimer();
	}

	/** Stop periodic refresh. */
	stop() {
		if (this.#timer) {
			clearInterval(this.#timer);
			this.#timer = null;
		}
	}

	/** Switch between the game total and the current map count. */
	toggleScope() {
		this.#scope = this.#scope === "game" ? "map" : "game";
		this.#updateToggle();
		this.#restartTimer();
		this.#refresh();
	}

	#restartTimer() {
		this.stop();
		this.#timer = setInterval(() => this.#refresh(), this.#currentInterval());
	}

	#currentInterval() {
		return this.#scope === "map"
			? MAP_PLAYER_COUNT_REFRESH_MS
			: PLAYER_COUNT_REFRESH_MS;
	}

	async #refresh() {
		try {
			if (this.#scope === "map") {
				const count = await this.#getMapPlayerCount?.();
				this.#render(typeof count === "number" ? count : null);
				return;
			}

			const counts = await fetchPlayerCounts(this.#gameId);
			this.#render(typeof counts?.total === "number" ? counts.total : null);
		} catch (error) {
			console.warn("Could not load player count", error);
			this.#render(null);
		}
	}

	#render(count) {
		if (!this.#elements.count) {
			return;
		}

		this.#elements.count.textContent = typeof count === "number" ? String(count) : "—";
	}

	#updateToggle() {
		const toggle = this.#elements.toggle;
		if (!toggle) {
			return;
		}

		const isMap = this.#scope === "map";
		toggle.textContent = isMap ? "Map" : "Game";
		toggle.setAttribute("aria-pressed", String(isMap));
		toggle.title = isMap
			? "Showing current map players (click to show game total)"
			: "Showing game players (click to show current map)";
	}
}