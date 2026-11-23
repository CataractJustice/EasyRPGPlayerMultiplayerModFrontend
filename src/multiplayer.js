
"use strict";

(function () {

	/* ----------------------------------------
	   Game identification
	   ---------------------------------------- */

	function getGameName() {
		const params = new URLSearchParams(window.location.search);

		const gameParam = params.get("game");

		if (gameParam) {
			return gameParam;
		}

		const path = window.location.pathname
			.replace(/\/+$/, "");

		const segments = path.split("/");

		return decodeURIComponent(segments.pop() || "");
	}

	const game = getGameName();

	/* ----------------------------------------
	   Player initialization
	   ---------------------------------------- */

	const player = document.getElementById("Player");

	player.src = `/easyrpg-player?game=${encodeURIComponent(game)}`;

	/* ----------------------------------------
	   Chat elements
	   ---------------------------------------- */

	const chatMessages = document.getElementById("chat-messages");
	const chatForm = document.getElementById("chat-form");
	const chatInput = document.getElementById("chat-input");
	const connectionIdElement = document.getElementById("connection-id");

	/* ----------------------------------------
	   Username prompt elements
	   ---------------------------------------- */

	const usernamePrompt = document.getElementById("username-prompt");
	const usernameForm = document.getElementById("username-form");
	const usernameInput = document.getElementById("username-input");
	const usernameError = document.getElementById("username-error");

	/* ----------------------------------------
	   User info elements
	   ---------------------------------------- */

	const userInfoName = document.getElementById("user-info-name");
	const userInfoBadge = document.getElementById("user-info-badge");

	/* ----------------------------------------
	   Local storage
	   ---------------------------------------- */

	const STORAGE_KEY = "easyrpg_guest_username";

	/**
	 * Load a previously saved guest username from localStorage.
	 *
	 * @returns {string|null}
	 */
	function loadSavedGuestUsername() {
		try {
			return localStorage.getItem(STORAGE_KEY) || null;
		} catch (_) {
			return null;
		}
	}

	/**
	 * Persist the guest username to localStorage so it is
	 * remembered on the next visit.
	 *
	 * @param {string} username
	 */
	function saveGuestUsername(username) {
		try {
			localStorage.setItem(STORAGE_KEY, username);
		} catch (_) {
			// localStorage unavailable (private mode, quota, etc.) — ignore.
		}
	}

	/* ----------------------------------------
	   Authentication
	   ---------------------------------------- */

	/**
	 * Current username for the session.
	 * Null until the user has identified themselves.
	 *
	 * @type {string|null}
	 */
	let currentUsername = null;

	/**
	 * Whether the current session is an authenticated one.
	 *
	 * @type {boolean}
	 */
	let currentlyAuthenticated = false;

	/**
	 * Callback invoked when authentication resolves.
	 *
	 * Receives one object:
	 * - Authenticated:   { authenticated: true,  username: string, credentials: any }
	 * - Guest:           { authenticated: false, username: string }
	 *
	 * @type {Function}
	 */
	let onAuthResolvedCallback = function () {
		// Intentionally empty.
		// Implement this callback to react to authentication results.
	};

	/**
	 * Callback invoked when the user submits a guest username.
	 * Receives the chosen username string.
	 * Implement to perform any extra validation or side effects.
	 *
	 * @type {Function}
	 */
	let onGuestUsernameCallback = function () {
		// Intentionally empty.
		// Implement this callback to handle guest username submission.
	};

	/**
	 * Check whether the current user is authenticated.
	 *
	 * NOT YET IMPLEMENTED — always resolves as unauthenticated.
	 *
	 * When implemented, resolve with one of:
	 *
	 *   Authenticated:
	 *   {
	 *     authenticated: true,
	 *     username:      string,  // Display name of the authenticated user.
	 *     credentials:   any      // Session token, JWT, or similar.
	 *   }
	 *
	 *   Not authenticated:
	 *   {
	 *     authenticated: false
	 *   }
	 *
	 * @returns {Promise<{ authenticated: boolean, username?: string, credentials?: any }>}
	 */
	function checkAuth() {
		return Promise.resolve({ authenticated: false });
	}

	/**
	 * Update the user info indicator in the chat header.
	 *
	 * @param {string}  username
	 * @param {boolean} authenticated
	 */
	function setUserInfo(username, authenticated) {
		userInfoName.textContent = username;

		if (authenticated) {
			userInfoBadge.textContent = "Logged in";
			userInfoBadge.className = "user-info-badge user-info-badge--auth";
		} else {
			userInfoBadge.textContent = "Guest";
			userInfoBadge.className = "user-info-badge user-info-badge--guest";
		}
	}

	/**
	 * Show the inline username prompt and keep chat form hidden.
	 */
	function showUsernamePrompt() {
		usernamePrompt.removeAttribute("hidden");
		chatForm.setAttribute("hidden", "");
		usernameInput.focus();
	}

	/**
	 * Hide the inline username prompt and reveal the chat form.
	 */
	function hideUsernamePrompt() {
		usernamePrompt.setAttribute("hidden", "");
		chatForm.removeAttribute("hidden");
		usernameError.textContent = "";
	}

	/**
	 * Enable the chat send form so the user can type and send messages.
	 */
	function enableChat() {
		chatInput.disabled = false;
		chatForm.querySelector("button[type='submit']").disabled = false;
	}

	/**
	 * Run authentication on startup.
	 * - If authenticated, use the returned username and credentials.
	 * - Otherwise, check for a saved guest username, then show the prompt.
	 *
	 * The game player is never blocked and chat messages remain visible —
	 * only sending messages requires choosing a username.
	 */
	function initAuth() {
		// Keep the chat send form disabled/hidden until a username is confirmed.
		chatInput.disabled = true;
		chatForm.querySelector("button[type='submit']").disabled = true;

		checkAuth().then(function (result) {
			if (result.authenticated) {
				currentUsername = result.username;
				currentlyAuthenticated = true;

				setUserInfo(result.username, true);
				hideUsernamePrompt();
				enableChat();

				onAuthResolvedCallback({
					authenticated: true,
					username: result.username,
					credentials: result.credentials
				});
			} else {
				// Pre-fill with any previously saved guest username.
				const saved = loadSavedGuestUsername();

				if (saved) {
					usernameInput.value = saved;
				}

				showUsernamePrompt();
			}
		});
	}

	/* ----------------------------------------
	   Guest username form
	   ---------------------------------------- */

	usernameForm.addEventListener("submit", function (event) {
		event.preventDefault();

		const username = usernameInput.value.trim();

		if (!username) {
			usernameError.textContent = "Please enter a username.";
			return;
		}

		currentUsername = username;
		currentlyAuthenticated = false;

		// Persist for future visits.
		saveGuestUsername(username);

		onGuestUsernameCallback(username);

		setUserInfo(username, false);
		hideUsernamePrompt();
		enableChat();

		onAuthResolvedCallback({
			authenticated: false,
			username: username
		});

		chatInput.focus();
	});

	/* ----------------------------------------
	   Multiplayer API
	   ---------------------------------------- */

	let sendMessageCallback = function () {
		// Intentionally empty.
		// The player/server integration must provide this callback.
	};

	const MultiplayerAPI = {

		/**
		 * Update the displayed connection identifier.
		 *
		 * @param {string} id
		 */
		setConnectionId: function (id) {
			connectionIdElement.textContent =
				id == null || id === ""
					? "Not connected"
					: String(id);
		},

		/**
		 * Register the callback used when a user sends a message.
		 *
		 * The callback receives `(message, username)`.
		 *
		 * @param {Function} callback
		 */
		setSendMessageCallback: function (callback) {
			if (typeof callback !== "function") {
				throw new TypeError(
					"Send message callback must be a function."
				);
			}

			sendMessageCallback = callback;
		},

		/**
		 * Register the callback invoked when authentication resolves.
		 *
		 * The callback receives:
		 * - Authenticated: { authenticated: true,  username: string, credentials: any }
		 * - Guest:         { authenticated: false, username: string }
		 *
		 * @param {Function} callback
		 */
		setOnAuthResolvedCallback: function (callback) {
			if (typeof callback !== "function") {
				throw new TypeError(
					"Auth resolved callback must be a function."
				);
			}

			onAuthResolvedCallback = callback;
		},

		/**
		 * Register the callback invoked when the user submits a guest username.
		 *
		 * The callback receives the chosen username string.
		 *
		 * @param {Function} callback
		 */
		setOnGuestUsernameCallback: function (callback) {
			if (typeof callback !== "function") {
				throw new TypeError(
					"Guest username callback must be a function."
				);
			}

			onGuestUsernameCallback = callback;
		},

		/**
		 * Returns the current username, or null if not yet set.
		 *
		 * @returns {string|null}
		 */
		getUsername: function () {
			return currentUsername;
		},

		/**
		 * Returns true if the current session is authenticated.
		 *
		 * @returns {boolean}
		 */
		isAuthenticated: function () {
			return currentlyAuthenticated;
		},

		/**
		 * Receive a message broadcast from the server.
		 *
		 * Expected format:
		 * {
		 *   author: "Player",
		 *   message: "Hello!"
		 * }
		 *
		 * @param {Object} data
		 */
		receiveMessage: function (data) {
			if (!data || typeof data.message !== "string") {
				return;
			}

			const messageElement = document.createElement("div");
			messageElement.className = "chat-message";

			const authorElement = document.createElement("span");
			authorElement.className = "message-author";
			authorElement.textContent =
				(data.author || "Unknown") + ": ";

			const textElement = document.createElement("span");
			textElement.className = "message-text";
			textElement.textContent = data.message;

			messageElement.appendChild(authorElement);
			messageElement.appendChild(textElement);

			chatMessages.appendChild(messageElement);

			// Scroll to the newest server-broadcast message.
			chatMessages.scrollTop = chatMessages.scrollHeight;
		},

		/**
		 * Clear the chat message history.
		 */
		clearMessages: function () {
			chatMessages.replaceChildren();
		}

	};

	/* ----------------------------------------
	   Expose API to the player iframe
	   ---------------------------------------- */

	window.EasyRPGMultiplayer = MultiplayerAPI;

	/* ----------------------------------------
	   Sending messages
	   ---------------------------------------- */

	chatForm.addEventListener("submit", function (event) {
		event.preventDefault();

		const message = chatInput.value.trim();

		if (!message) {
			return;
		}

		if (!currentUsername) {
			// Safety guard: should not happen because the form is
			// disabled until a username is confirmed.
			showUsernamePrompt();
			return;
		}

		// Only invoke the callback.
		// Do NOT add the message to the chat here.
		sendMessageCallback(message, currentUsername);

		chatInput.value = "";
		chatInput.focus();
	});

	/* ----------------------------------------
	   Start
	   ---------------------------------------- */

	initAuth();

})();
