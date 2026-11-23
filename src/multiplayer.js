"use strict";

let isConnected = false;

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

	player.src = `/easyrpg-player.html?game=${encodeURIComponent(game)}`;

	/* ----------------------------------------
	   Chat elements
	   ---------------------------------------- */

	const chatMessages = document.getElementById("chat-messages");
	const chatForm = document.getElementById("chat-form");
	const chatInput = document.getElementById("chat-input");
	const chatScopeToggle = document.getElementById("chat-scope-toggle");
	const showGlobalToggle = document.getElementById("show-global-toggle");
	const connectionStatusElement = document.getElementById("connection-status");

	/* ----------------------------------------
	   Username prompt elements
	   ---------------------------------------- */

	const usernamePrompt = document.getElementById("username-prompt");
	const usernameForm = document.getElementById("username-form");
	const usernameInput = document.getElementById("username-input");
	const usernameError = document.getElementById("username-error");
	const usernameSubmit = document.getElementById("username-submit");
	usernameSubmit.disabled = true;

	/* ----------------------------------------
	   User info elements
	   ---------------------------------------- */

	const userInfoName = document.getElementById("user-info-name");
	const userInfoBadge = document.getElementById("user-info-badge");

	/* ----------------------------------------
	   Chat scope state
	   ---------------------------------------- */

	/**
	 * True when the user wants to send to the global (game-wide) chat.
	 * False means local (same-map) chat.
	 *
	 * @type {boolean}
	 */
	let isGlobalChat = false;

	/**
	 * True when global messages should be shown in the chat log.
	 *
	 * @type {boolean}
	 */
	let showGlobalMessages = true;

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
		if (isConnected === false) return;

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
	   Chat scope helpers
	   ---------------------------------------- */

	/**
	 * Update the scope toggle button to reflect isGlobalChat.
	 */
	function updateChatScopeButton() {
		if (!chatScopeToggle) return;

		if (isGlobalChat) {
			chatScopeToggle.textContent = "[G]";
			chatScopeToggle.title = "Global chat (click to switch to local)";
			chatScopeToggle.setAttribute("aria-pressed", "true");
			chatScopeToggle.classList.add("chat-scope-toggle--global");
			chatScopeToggle.classList.remove("chat-scope-toggle--local");
		} else {
			chatScopeToggle.textContent = "[L]";
			chatScopeToggle.title = "Local chat (click to switch to global)";
			chatScopeToggle.setAttribute("aria-pressed", "false");
			chatScopeToggle.classList.add("chat-scope-toggle--local");
			chatScopeToggle.classList.remove("chat-scope-toggle--global");
		}
	}

	/**
	 * Toggle the chat input between local and global scope.
	 */
	function toggleChatScope() {
		isGlobalChat = !isGlobalChat;
		updateChatScopeButton();
	}

	/**
	 * Show or hide existing global messages based on showGlobalMessages.
	 */
	function refreshMessageVisibility() {
		const messages = chatMessages.querySelectorAll(".chat-message");
		for (let i = 0; i < messages.length; i++) {
			const isGlobal = messages[i].dataset.global === "true";
			if (isGlobal && !showGlobalMessages) {
				messages[i].setAttribute("hidden", "");
			} else {
				messages[i].removeAttribute("hidden");
			}
		}
	}

	if (chatScopeToggle) {
		updateChatScopeButton();
		chatScopeToggle.addEventListener("click", toggleChatScope);
	}

	if (showGlobalToggle) {
		showGlobalToggle.checked = showGlobalMessages;
		showGlobalToggle.addEventListener("change", function () {
			showGlobalMessages = showGlobalToggle.checked;
			refreshMessageVisibility();
		});
	}

	/* ----------------------------------------
	   Multiplayer API
	   ---------------------------------------- */

	let sendMessageCallback = function () {
		// Intentionally empty.
		// The player/server integration must provide this callback.
	};

	const MultiplayerAPI = {

		/**
		 * Update the displayed connection status.
		 *
		 * @param {boolean} status
		 */
		setConnection: function (status) {
			connectionStatusElement.textContent = status ? "Connected" : "Disconnected";
			isConnected = status;
			usernameSubmit.disabled = !status;
			chatInput.disabled = status;
			if (!status && chatScopeToggle) {
				chatScopeToggle.disabled = true;
			} else if (chatScopeToggle) {
				chatScopeToggle.disabled = false;
			}
		},

		/**
		 * Register the callback used when a user sends a message.
		 *
		 * The callback receives `(message, username, isGlobal)`.
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
		 * Set the scope used for outgoing chat messages.
		 *
		 * @param {boolean} global
		 */
		setChatScope: function (global) {
			isGlobalChat = !!global;
			updateChatScopeButton();
		},

		/**
		 * Returns true if the chat is currently set to global scope.
		 *
		 * @returns {boolean}
		 */
		isGlobalChatScope: function () {
			return isGlobalChat;
		},

		/**
		 * Toggle visibility of global chat messages.
		 *
		 * @param {boolean} show
		 */
		setShowGlobalMessages: function (show) {
			showGlobalMessages = !!show;
			if (showGlobalToggle) {
				showGlobalToggle.checked = showGlobalMessages;
			}
			refreshMessageVisibility();
		},

		/**
		 * Receive a message broadcast from the server.
		 *
		 * Expected format:
		 * {
		 *   author:  "Player",
		 *   message: "Hello!",
		 *   isGlobal: false   // optional, defaults to local
		 * }
		 *
		 * @param {Object} data
		 */
		receiveMessage: function (data) {
			if (!data || typeof data.message !== "string") {
				return;
			}

			const isGlobal = !!data.isGlobal;
			const messageElement = document.createElement("div");
			messageElement.className = "chat-message" +
				(isGlobal ? " chat-message--global" : " chat-message--local");
			messageElement.dataset.global = String(isGlobal);

			const scopeElement = document.createElement("span");
			scopeElement.className = "message-scope";
			scopeElement.textContent = isGlobal ? "[G] " : "[L] ";
			scopeElement.title = isGlobal ? "Global" : "Local";

			const authorElement = document.createElement("span");
			authorElement.className = "message-author";
			authorElement.textContent = (data.author || "Unknown") + ": ";

			const textElement = document.createElement("span");
			textElement.className = "message-text";
			textElement.textContent = data.message;

			messageElement.appendChild(scopeElement);
			messageElement.appendChild(authorElement);
			messageElement.appendChild(textElement);

			chatMessages.appendChild(messageElement);

			refreshMessageVisibility();

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

		// Invoke the callback with the currently selected scope.
		sendMessageCallback(message, currentUsername, isGlobalChat);

		chatInput.value = "";
		chatInput.focus();
	});

	/* ----------------------------------------
	   Start
	   ---------------------------------------- */

	initAuth();

})();
