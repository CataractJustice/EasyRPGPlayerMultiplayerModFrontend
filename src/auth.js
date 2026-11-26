import { STORAGE_KEY_GUEST_USERNAME } from "./config.js";
import { loadItem, saveItem } from "./storage.js";

export class AuthController {
	#username = null;
	#isAuthenticated = false;
	#onChange = null;

	#elements = {};

	/**
	 * @param {Object} elements - DOM element references.
	 * @param {HTMLFormElement} elements.usernameForm
	 * @param {HTMLInputElement} elements.usernameInput
	 * @param {HTMLButtonElement} elements.usernameSubmit
	 * @param {HTMLElement} elements.usernameError
	 * @param {HTMLElement} elements.usernamePrompt
	 * @param {HTMLFormElement} elements.chatForm
	 * @param {HTMLInputElement} elements.chatInput
	 * @param {HTMLElement} elements.userInfoName
	 * @param {HTMLElement} elements.userInfoBadge
	 * @param {Function} onChange - Called when the auth state changes.
	 */
	constructor(elements, onChange) {
		this.#elements = elements;
		this.#onChange = onChange;

		this.#elements.usernameSubmit.disabled = true;
		this.#elements.chatInput.disabled = true;
		this.#elements.chatForm.querySelector("button[type='submit']").disabled = true;

		this.#elements.usernameForm.addEventListener("submit", (event) => this.#onSubmit(event));
	}

	get username() {
		return this.#username;
	}

	get isAuthenticated() {
		return this.#isAuthenticated;
	}

	async init() {
		const result = await this.#checkAuth();

		if (result.authenticated) {
			this.#setUser(result.username, true);
			this.#showChat();
			this.#notify({
				authenticated: true,
				username: result.username,
				credentials: result.credentials
			});
		} else {
			const saved = loadItem(STORAGE_KEY_GUEST_USERNAME);
			if (saved) {
				this.#elements.usernameInput.value = saved;
			}
			this.#showPrompt();
		}
	}

	#setUser(username, authenticated) {
		this.#username = username;
		this.#isAuthenticated = authenticated;

		this.#elements.userInfoName.textContent = username;

		if (authenticated) {
			this.#elements.userInfoBadge.textContent = "Logged in";
			this.#elements.userInfoBadge.className = "user-info-badge user-info-badge--auth";
		} else {
			this.#elements.userInfoBadge.textContent = "Guest";
			this.#elements.userInfoBadge.className = "user-info-badge user-info-badge--guest";
		}
	}

	#showPrompt() {
		this.#elements.usernamePrompt.removeAttribute("hidden");
		this.#elements.chatForm.setAttribute("hidden", "");
		this.#elements.usernameError.textContent = "";
		this.#elements.usernameInput.focus();
	}

	#showChat() {
		this.#elements.usernamePrompt.setAttribute("hidden", "");
		this.#elements.chatForm.removeAttribute("hidden");
		this.#elements.usernameError.textContent = "";
	}

	#enableChat() {
		this.#elements.chatInput.disabled = false;
		this.#elements.chatForm.querySelector("button[type='submit']").disabled = false;
	}

	#setConnectionStatus(connected) {
		this.#elements.usernameSubmit.disabled = !connected;
		if (!connected) {
			this.#elements.chatInput.disabled = true;
		}
	}

	#onSubmit(event) {
		event.preventDefault();

		const username = this.#elements.usernameInput.value.trim();

		if (!username) {
			this.#elements.usernameError.textContent = "Please enter a username.";
			return;
		}

		this.#setUser(username, false);
		saveItem(STORAGE_KEY_GUEST_USERNAME, username);
		this.#showChat();
		this.#enableChat();

		this.#notify({
			authenticated: false,
			username
		});

		this.#elements.chatInput.focus();
	}

	#checkAuth() {
		return Promise.resolve({ authenticated: false });
	}

	#notify(payload) {
		if (typeof this.#onChange === "function") {
			this.#onChange(payload);
		}
	}

	/**
	 * External hook for the multiplayer connection state.
	 * @param {boolean} connected
	 */
	setConnection(connected) {
		this.#setConnectionStatus(connected);
	}
}
