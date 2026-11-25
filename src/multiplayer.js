let isConnected = false;
let gameId = "";
let gameIndexFile;

(function () {

	/* ----------------------------------------
	   Game identification
	   ---------------------------------------- */

	/**
	 * Detect the current game from the URL.
	 *
	 * Priority:
	 *   1. The ?game= query parameter, for backward compatibility.
	 *   2. The last path segment of a /game-name/ style URL.
	 *
	 * @returns {string}
	 */
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
	gameId = game;

	/* ----------------------------------------
	   Picker mode: no game selected
	   ---------------------------------------- */

	if (!game) {
		return;
	}

	/* ----------------------------------------
	   Game data index
	   ---------------------------------------- */

	const gameIndexReady = (async () => {
	try {
		const response = await fetch(`/games/${gameId}/index.json`);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		gameIndexFile = await response.json();
	} catch (e) {
		console.warn("Could not load game index.json", e);
		throw e;
	}
	})();

	/* ----------------------------------------
	   Player initialization
	   ---------------------------------------- */

	const player = document.getElementById("Player");

	if (player) {
		player.src = `/easyrpg-player.html?game=${encodeURIComponent(game)}`;
	}

	/* ----------------------------------------
	   Chat elements
	   ---------------------------------------- */

	const chatMessages = document.getElementById("chat-messages");
	const chatForm = document.getElementById("chat-form");
	const chatInput = document.getElementById("chat-input");
	const chatScopeToggle = document.getElementById("chat-scope-toggle");
	const showGlobalToggle = document.getElementById("show-global-toggle");
	const connectionStatusElement = document.getElementById("connection-status");
	const mapIdStatus = document.getElementById("map-id");
	const showOwnNametagToggle = document.getElementById("show-ownnametag-toggle");

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
	 * - Guest:		   { authenticated: false, username: string }
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
		console.log("A");
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

	if(showOwnNametagToggle) 
	{
		showOwnNametagToggle.addEventListener("change", function() {
			document.getElementById('Player').contentWindow.easyrpgPlayer.setShowOwnNametag(showOwnNametagToggle.checked);
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
		 * Update the displayed map id
		 * @param {string} id
		 */
		setMapIdStatus: function(id) 
		{
			mapIdStatus.innerText = id;
		},
		/**
		 * Update the displayed connection status.
		 *
		 * @param {boolean} status
		 */
		setConnection: function (status) {
			connectionStatusElement.textContent = status ? "Connected" : "Disconnected";
			isConnected = status;
			usernameSubmit.disabled = !status;
			chatInput.disabled = !status;
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



/* ----------------------------------------
   Character Sprite Picker
   ---------------------------------------- */

const spriteModal = document.getElementById("sprite-modal");
const spriteGrid = document.getElementById("sprite-grid");
const spritePage = document.getElementById("sprite-page");
const spritePrev = document.getElementById("sprite-prev");
const spriteNext = document.getElementById("sprite-next");
const spriteClose = document.getElementById("sprite-close");
const spriteRemove = document.getElementById("sprite-remove");

const SPRITES_PER_PAGE = 24;

let spritePageIndex = 0;
let selectedSprite = null;
let spriteAnimations = [];
let spriteRenderId = 0;
let spriteItems = [];

// Stop every active animation and remove its canvas.
function cleanupSpritePreviews() {
	spriteRenderId++;

	for (const animation of spriteAnimations) {
		try {
			animation.stop();
			animation.canvas.remove();
		} catch (e) {
			console.warn("Sprite cleanup failed:", e);
		}
	}

	spriteAnimations = [];
	spriteGrid.replaceChildren();
}

function updateSpriteSelection() {
	spriteGrid.querySelectorAll(".sprite-item").forEach(item => {
		const selected =
			selectedSprite &&
			item.dataset.sheet === selectedSprite.sheet &&
			Number(item.dataset.index) === selectedSprite.index;

		item.classList.toggle("selected", !!selected);
		item.setAttribute("aria-pressed", String(!!selected));
	});
}

function updateSpritePagination() {
	const totalPages = Math.max(
		1,
		Math.ceil(spriteItems.length / SPRITES_PER_PAGE)
	);

	spritePage.textContent =
		`Page ${spritePageIndex + 1} / ${totalPages}`;

	spritePrev.disabled = spritePageIndex === 0;
	spriteNext.disabled = spritePageIndex >= totalPages - 1;
}

async function renderSpritePage() {
	cleanupSpritePreviews();

	const renderId = spriteRenderId;

	const start = spritePageIndex * SPRITES_PER_PAGE;
	const items = spriteItems.slice(
		start,
		start + SPRITES_PER_PAGE
	);

	updateSpritePagination();

	if (!items.length) {
		const empty = document.createElement("p");
		empty.textContent = "No character sprites available.";
		spriteGrid.appendChild(empty);
		return;
	}

	for (const sprite of items) {
		if (renderId !== spriteRenderId) return;

		const { sheet, filename, index } = sprite;

		const item = document.createElement("button");
		item.type = "button";
		item.className = "sprite-item";
		item.dataset.sheet = sheet;
		item.dataset.index = String(index);
		item.setAttribute("aria-pressed", "false");

		const label = document.createElement("span");
		label.textContent = `${sheet} #${index}`;

		item.appendChild(label);
		spriteGrid.appendChild(item);

		// Prevent duplicate callbacks and ignore already selected items.
		item.addEventListener("click", () => {
			if (
				selectedSprite &&
				selectedSprite.sheet === sheet &&
				selectedSprite.index === index
			) {
				return;
			}

			selectedSprite = { sheet, index };

			updateSpriteSelection();
			document.getElementById("Player").contentWindow.easyrpgPlayer.setOwnSprite(sheet, index);
		});

		try {
			const spriteFile =
				`/games/${encodeURIComponent(gameId)}/CharSet/${filename}`;

			const result = await createAnimatedSprite(
				spriteFile,
				index,
				item,
				{}
			);

			// The page may have changed while the sprite was loading.
			if (
				renderId !== spriteRenderId ||
				!item.isConnected
			) {
				result.stop();
				result.canvas.remove();
				continue;
			}

			spriteAnimations.push(result);

			result.canvas.classList.add("sprite-preview");
			result.canvas.setAttribute("aria-hidden", "true");

			// Keep the label after the canvas.
			item.insertBefore(result.canvas, label);

		} catch (error) {
			console.warn(
				`Could not load sprite ${sheet} #${index}:`,
				error
			);

			if (renderId === spriteRenderId) {
				const errorLabel = document.createElement("small");
				errorLabel.textContent = "Preview unavailable";
				item.appendChild(errorLabel);
			}
		}
	}

	updateSpriteSelection();
}

async function openSpritePicker() {
	spriteModal.hidden = false;

	try {
		await gameIndexReady;

		const charset = gameIndexFile?.cache?.charset || {};

		spriteItems = Object.entries(charset).flatMap(
			([sheet, filename]) =>
				Array.from({ length: 8 }, (_, index) => ({
					sheet,
					filename,
					index
				}))
		);

		// Keep the current page valid if the catalogue changes.
		const totalPages = Math.max(
			1,
			Math.ceil(spriteItems.length / SPRITES_PER_PAGE)
		);

		spritePageIndex = Math.min(
			spritePageIndex,
			totalPages - 1
		);

		await renderSpritePage();

	} catch (error) {
		cleanupSpritePreviews();

		const message = document.createElement("p");
		message.textContent = "Unable to load character sprites.";
		spriteGrid.appendChild(message);

		console.error(error);
	}
}

function closeSpritePicker() {
	spriteModal.hidden = true;
	cleanupSpritePreviews();
}

spritePrev.addEventListener("click", () => {
	if (spritePageIndex > 0) {
		spritePageIndex--;
		renderSpritePage();
	}
});

spriteNext.addEventListener("click", () => {
	const totalPages = Math.ceil(
		spriteItems.length / SPRITES_PER_PAGE
	);

	if (spritePageIndex < totalPages - 1) {
		spritePageIndex++;
		renderSpritePage();
	}
});

spriteRemove.addEventListener("click", () => {
	if (!selectedSprite) return;

	selectedSprite = null;

	updateSpriteSelection();
	document.getElementById("Player").contentWindow.easyrpgPlayer.unsetOwnSprite();
});

spriteClose.addEventListener("click", closeSpritePicker);

spriteModal.addEventListener("click", event => {
	if (event.target === spriteModal) {
		closeSpritePicker();
	}
});

document.addEventListener("keydown", event => {
	if (event.key === "Escape" && !spriteModal.hidden) {
		closeSpritePicker();
	}
});

// Expose the opener to the existing frontend.
window.openSpritePicker = openSpritePicker;

})();
