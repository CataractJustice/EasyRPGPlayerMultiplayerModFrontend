import { getGameName } from "./url.js";
import { AuthController } from "./auth.js";
import { ChatController } from "./chat.js";
import { PlayerCountController } from "./player-count.js";
import { SaveDialogController } from "./save-dialog.js";
import { SpritePickerController } from "./sprites.js";
import { setSystemImageStyles } from "./system-theme.js";
import { createMultiplayerApi, forwardChatMessage, forwardName } from "./multiplayer-api.js";
import { getApiBaseUrl } from "./config.js";
import { formatPlaytime } from "./page-account.js";

/**
 * Entry point for the dedicated game/player page.
 *
 * Initializes the player iframe, chat, auth, save dialog, and sprite picker.
 */
export function initGamePage() {
	const gameId = getGameName();

	if (!gameId) {
		return;
	}

	window.gameId = gameId;

	const playerFrame = document.getElementById("Player");

	const playerCount = new PlayerCountController({
		count: document.getElementById("player-count"),
		toggle: document.getElementById("player-count-toggle")
	}, {
		gameId,
		getMapPlayerCount: () => playerFrame?.contentWindow?.easyrpgPlayer?.getMapPlayerCount?.()
	});

	const chat = new ChatController({
		chatMessages: document.getElementById("chat-messages"),
		chatForm: document.getElementById("chat-form"),
		chatInput: document.getElementById("chat-input"),
		chatScopeToggle: document.getElementById("chat-scope-toggle"),
		showGlobalToggle: document.getElementById("show-global-toggle"),
		connectionStatus: document.getElementById("connection-status"),
		mapIdStatus: document.getElementById("map-id")
	}, (message, isGlobal) => {
		forwardChatMessage(playerFrame, message, auth.username, isGlobal);
	});

	let currentUsername = null;
	const sendNameToPlayer = () => {
		if (currentUsername) {
			forwardName(playerFrame, currentUsername);
		}
	};

	const auth = new AuthController({
		usernameForm: document.getElementById("username-form"),
		usernameInput: document.getElementById("username-input"),
		usernameSubmit: document.getElementById("username-submit"),
		usernameError: document.getElementById("username-error"),
		usernamePrompt: document.getElementById("username-prompt"),
		chatForm: document.getElementById("chat-form"),
		chatInput: document.getElementById("chat-input"),
		userInfoName: document.getElementById("user-info-name"),
		userInfoBadge: document.getElementById("user-info-badge"),
		guestNotice: document.getElementById("guest-notice-entry"),
		guestNoticeCopy: document.getElementById("guest-notice-copy"),
		guestNoticeUuid: document.getElementById("guest-notice-uuid"),
		guestNoticeTtl: document.getElementById("guest-notice-ttl")
	}, (result) => {
		currentUsername = result.username ?? null;
		sendNameToPlayer();
	});

	const saveDialog = new SaveDialogController({
		dialog: document.getElementById("saveFileDialog"),
		uploadForm: document.getElementById("uploadSaveForm"),
		downloadForm: document.getElementById("downloadSaveForm"),
		uploadFile: document.getElementById("uploadSaveFile"),
		uploadSlot: document.getElementById("uploadSaveSlot"),
		downloadSlot: document.getElementById("downloadSaveSlot"),
		status: document.getElementById("saveFileStatus")
	});

	const spritePicker = new SpritePickerController({
		modal: document.getElementById("sprite-modal"),
		grid: document.getElementById("sprite-grid"),
		page: document.getElementById("sprite-page"),
		prev: document.getElementById("sprite-prev"),
		next: document.getElementById("sprite-next"),
		close: document.getElementById("sprite-close"),
		remove: document.getElementById("sprite-remove")
	}, () => playerFrame);

	window.openSaveFileManager = (id) => saveDialog.open(id ?? gameId);
	window.closeSaveFileManager = () => saveDialog.close();
	window.openSpritePicker = () => spritePicker.open(gameId, gameIndexReady);

	window.EasyRPGMultiplayer = createMultiplayerApi(chat, auth, {
		onSendMessage: (message, username, isGlobal) => {
			forwardChatMessage(playerFrame, message, username, isGlobal);
		}
	});

	// Add account menu and dialog handlers
	setupAccountMenu(auth);
	setupAuthDialogs(auth);

	const gameIndexReady = (async () => {
		try {
			const response = await fetch(`/games/${encodeURIComponent(gameId)}/index.json`);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.warn("Could not load game index.json", error);
			return null;
		}
	})();

	if (playerFrame) {
		playerFrame.src = `/easyrpg-player.html?game=${encodeURIComponent(gameId)}`;
		// The player iframe only exposes `easyrpgPlayer` after its wasm runtime
		// boots, which happens after `auth.init()` resolves. Re-send the name
		// once it is ready so reloads (logged in or guest) keep the nametag.
		whenPlayerReady(playerFrame, sendNameToPlayer);
	}

	auth.init();
	playerCount.start();
	startPlaytimeTracker(auth, gameId);

	document.getElementById("guest-notice-dismiss")?.addEventListener("click", () => auth.hideGuestNotice());

	// Apply the first available system theme automatically.
	gameIndexReady.then((index) => {
		const systemName = index?.cache?.system && Object.keys(index.cache.system)[0];
		if (systemName) {
			setSystemImageStyles(gameId, systemName);
		}
	});
}

function setupAccountMenu(auth) {
	const menuToggle = document.getElementById("account-menu-toggle");
	const menu = document.getElementById("account-menu");
	const accountInfoBtn = document.getElementById("account-info-btn");
	const registerBtn = document.getElementById("register-btn");
	const loginBtn = document.getElementById("login-btn");
	const loadGuestBtn = document.getElementById("load-guest-btn");
	const logoutBtn = document.getElementById("logout-btn");

	if (!menuToggle || !menu) return;

	menuToggle.addEventListener("click", (e) => {
		e.stopPropagation();
		const isOpen = menu.classList.contains("account-menu--open");
		menu.classList.toggle("account-menu--open", !isOpen);
		menu.hidden = isOpen;
		menuToggle.setAttribute("aria-expanded", String(!isOpen));
		updateAccountMenu(auth);
	});

	document.addEventListener("click", (e) => {
		if (!menu.contains(e.target) && e.target !== menuToggle) {
			menu.classList.remove("account-menu--open");
			menu.hidden = true;
			menuToggle.setAttribute("aria-expanded", "false");
		}
	});

	// Close the menu when any menu item is activated.
	menu.addEventListener("click", () => {
		menu.classList.remove("account-menu--open");
		menu.hidden = true;
		menuToggle.setAttribute("aria-expanded", "false");
	});

	accountInfoBtn?.addEventListener("click", () => openAccountInfoDialog(auth));
	registerBtn?.addEventListener("click", () => openRegisterDialog(auth));
	loginBtn?.addEventListener("click", () => openLoginDialog(auth));
	loadGuestBtn?.addEventListener("click", () => openLoadGuestDialog(auth));
	logoutBtn?.addEventListener("click", async () => {
		await auth.logout();
		reloadPage();
	});
}

function updateAccountMenu(auth) {
	const registerBtn = document.getElementById("register-btn");
	const loginBtn = document.getElementById("login-btn");
	const loadGuestBtn = document.getElementById("load-guest-btn");
	const logoutBtn = document.getElementById("logout-btn");

	if (auth.isAuthenticated) {
		registerBtn?.setAttribute("hidden", "");
		loginBtn?.setAttribute("hidden", "");
		loadGuestBtn?.setAttribute("hidden", "");
		logoutBtn?.removeAttribute("hidden");
	} else if (auth.accountType === "guest") {
		registerBtn?.removeAttribute("hidden");
		loginBtn?.removeAttribute("hidden");
		loadGuestBtn?.removeAttribute("hidden");
		logoutBtn?.removeAttribute("hidden");
	} else {
		registerBtn?.setAttribute("hidden", "");
		loginBtn?.removeAttribute("hidden");
		loadGuestBtn?.removeAttribute("hidden");
		logoutBtn?.setAttribute("hidden", "");
	}
}

function setupAuthDialogs(auth) {
	// Register dialog
	const registerDialog = document.getElementById("register-dialog");
	const registerForm = document.getElementById("register-form");
	const registerError = document.getElementById("register-error");
	
	window.openRegisterDialog = () => {
		registerError.textContent = "";
		registerForm.reset();
		registerDialog.showModal();
	};
	window.closeRegisterDialog = () => registerDialog.close();
	
	registerForm?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const username = document.getElementById("register-username").value.trim();
		const password = document.getElementById("register-password").value;
		const confirm = document.getElementById("register-password-confirm").value;
		const guestUuid = document.getElementById("register-guest-uuid").value.trim();
		
		if (password !== confirm) {
			registerError.textContent = "Passwords do not match.";
			return;
		}
		if (!/^[A-Za-z0-9_-]+$/.test(username)) {
			registerError.textContent = "Username may only contain letters, numbers, dashes (-) and underscores (_).";
			return;
		}
		if (password.length < 8) {
			registerError.textContent = "Password must be at least 8 characters.";
			return;
		}
		
		const result = await auth.register(username, password, guestUuid || null);
		if (result.success) {
			registerDialog.close();
			reloadPage();
		} else {
			registerError.textContent = result.error || "Registration failed.";
		}
	});

	// Login dialog
	const loginDialog = document.getElementById("login-dialog");
	const loginForm = document.getElementById("login-form");
	const loginError = document.getElementById("login-error");
	
	window.openLoginDialog = () => {
		loginError.textContent = "";
		loginForm.reset();
		loginDialog.showModal();
	};
	window.closeLoginDialog = () => loginDialog.close();
	
	loginForm?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const username = document.getElementById("login-username").value.trim();
		const password = document.getElementById("login-password").value;
		
		const result = await auth.login(username, password);
		if (result.success) {
			loginDialog.close();
			reloadPage();
		} else {
			loginError.textContent = result.error || "Login failed.";
		}
	});

	document.getElementById("login-to-load")?.addEventListener("click", (e) => {
		e.preventDefault();
		loginDialog.close();
		openLoadGuestDialog(auth);
	});
	
	document.getElementById("login-to-register")?.addEventListener("click", (e) => {
		e.preventDefault();
		loginDialog.close();
		openRegisterDialog(auth);
	});

	// Load guest dialog
	const loadGuestDialog = document.getElementById("load-guest-dialog");
	const loadGuestForm = document.getElementById("load-guest-form");
	const loadGuestError = document.getElementById("load-guest-error");
	
	window.openLoadGuestDialog = () => {
		loadGuestError.textContent = "";
		loadGuestForm.reset();
		loadGuestDialog.showModal();
	};
	window.closeLoadGuestDialog = () => loadGuestDialog.close();
	
	loadGuestForm?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const guestUuid = document.getElementById("load-guest-uuid").value.trim();
		
		const result = await auth.loadGuest(guestUuid);
		if (result.success) {
			loadGuestDialog.close();
			reloadPage();
		} else {
			loadGuestError.textContent = result.error || "Failed to load guest account.";
		}
	});

	// Account info dialog
	const accountInfoDialog = document.getElementById("account-info-dialog");
	
	window.openAccountInfoDialog = () => {
		updateAccountInfoDialog(auth);
		accountInfoDialog.showModal();
	};
	window.closeAccountInfoDialog = () => accountInfoDialog.close();
}

function openAccountInfoDialog(auth) {
	updateAccountInfoDialog(auth);
	document.getElementById("account-info-dialog").showModal();
}

function updateAccountInfoDialog(auth) {
	document.getElementById("account-info-type").textContent = auth.accountType || "—";
	document.getElementById("account-info-id").textContent = auth.accountId || "—";
	document.getElementById("account-info-username").textContent = auth.username || "—";

	const profileLink = document.getElementById("account-info-profile-link");
	if (profileLink) {
		profileLink.href = auth.accountId
			? `/account/${encodeURIComponent(auth.accountId)}`
			: "/account";
	}

	loadAccountPlaytime(auth);
	
	const guestRow = document.getElementById("account-info-guest-row");
	const guestUuidEl = document.getElementById("account-info-guest-uuid");
	const expiresRow = document.getElementById("account-info-expires-row");
	const expiresEl = document.getElementById("account-info-expires");
	
	if (auth.accountType === "guest" && auth.guestUuid) {
		guestRow.hidden = false;
		guestUuidEl.textContent = auth.guestUuid;
		
		if (auth.expiresAt) {
			expiresRow.hidden = false;
			const date = new Date(auth.expiresAt);
			expiresEl.textContent = date.toLocaleString();
		} else {
			expiresRow.hidden = true;
		}
	} else {
		guestRow.hidden = true;
		expiresRow.hidden = true;
	}
}

async function loadAccountPlaytime(auth) {
	const el = document.getElementById("account-info-playtime");
	if (!el) {
		return;
	}
	if (!auth.accountId) {
		el.textContent = "—";
		return;
	}

	try {
		const response = await fetch(
			`${getApiBaseUrl()}/api/users/${encodeURIComponent(auth.accountId)}`
		);
		if (!response.ok) {
			el.textContent = "—";
			return;
		}
		const data = await response.json();
		el.textContent = formatPlaytime(data.playtimeTotal);
	} catch (_) {
		el.textContent = "—";
	}
}

function openRegisterDialog(auth) {
	document.getElementById("register-dialog").showModal();
}

function openLoginDialog(auth) {
	document.getElementById("login-dialog").showModal();
}

function openLoadGuestDialog(auth) {
	document.getElementById("load-guest-dialog").showModal();
}

/**
 * Reload the page after the account identity changes (register, login, load
 * guest, logout) so the player iframe reconnects with the new credentials.
 */
function reloadPage() {
	window.location.reload();
}

/**
 * Invoke `callback` once the player iframe has exposed its `easyrpgPlayer`
 * runtime. The iframe sets that global asynchronously after the wasm module
 * boots, so a plain call right after setting `src` would be too early.
 *
 * @param {HTMLIFrameElement} playerFrame
 * @param {() => void} callback
 */
function whenPlayerReady(playerFrame, callback) {
	if (!playerFrame) {
		return;
	}

	const isReady = () => {
		const player = playerFrame.contentWindow?.easyrpgPlayer;
		return player && typeof player.sendName === "function";
	};

	if (isReady()) {
		callback();
		return;
	}

	let attempts = 0;
	const timer = setInterval(() => {
		if (isReady()) {
			clearInterval(timer);
			callback();
			return;
		}
		// Give up after ~60s so a broken iframe cannot poll forever.
		if (++attempts > 600) {
			clearInterval(timer);
		}
	}, 100);
}

/**
 * Accumulate time spent playing and periodically flush it to the server.
 *
 * The server stores the total (shown in account info) and a per-game
 * breakdown (recorded but not displayed yet). Because playtime is keyed by
 * account id, it is preserved automatically when a guest is converted into a
 * registered account.
 */
function startPlaytimeTracker(auth, gameId) {
	let pendingSeconds = 0;
	let lastTick = Date.now();

	const flush = (useBeacon = false) => {
		const accountId = auth.accountId;
		const seconds = Math.floor(pendingSeconds);
		pendingSeconds = 0;

		if (!accountId || seconds <= 0) {
			return;
		}

		const body = JSON.stringify({ gameId, seconds });
		const url = `${getApiBaseUrl()}/api/account/playtime`;

		if (useBeacon && typeof navigator.sendBeacon === "function") {
			navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
		} else {
			fetch(url, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body
			}).catch(() => {});
		}
	};

	setInterval(() => {
		const now = Date.now();
		const delta = (now - lastTick) / 1000;
		lastTick = now;

		if (document.visibilityState === "visible" && auth.accountId) {
			pendingSeconds += delta;
		}

		if (pendingSeconds >= 30) {
			flush();
		}
	}, 5000);

	document.addEventListener("visibilitychange", () => {
		lastTick = Date.now();
		if (document.visibilityState === "hidden") {
			flush(true);
		}
	});

	window.addEventListener("pagehide", () => flush(true));
}