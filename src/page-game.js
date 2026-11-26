import { getGameName } from "./url.js";
import { AuthController } from "./auth.js";
import { ChatController } from "./chat.js";
import { SaveDialogController } from "./save-dialog.js";
import { SpritePickerController } from "./sprites.js";
import { setSystemImageStyles } from "./system-theme.js";
import { createMultiplayerApi, forwardChatMessage, forwardName } from "./multiplayer-api.js";

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

	const auth = new AuthController({
		usernameForm: document.getElementById("username-form"),
		usernameInput: document.getElementById("username-input"),
		usernameSubmit: document.getElementById("username-submit"),
		usernameError: document.getElementById("username-error"),
		usernamePrompt: document.getElementById("username-prompt"),
		chatForm: document.getElementById("chat-form"),
		chatInput: document.getElementById("chat-input"),
		userInfoName: document.getElementById("user-info-name"),
		userInfoBadge: document.getElementById("user-info-badge")
	}, (result) => {
		forwardName(playerFrame, result.username);
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
	}

	auth.init();

	// Apply the first available system theme automatically.
	gameIndexReady.then((index) => {
		const systemName = index?.cache?.system && Object.keys(index.cache.system)[0];
		if (systemName) {
			setSystemImageStyles(gameId, systemName);
		}
	});
}
