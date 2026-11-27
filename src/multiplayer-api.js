/**
 * Public API exposed on window.EasyRPGMultiplayer for the player iframe.
 *
 * External callers register callbacks; the chat/auth controllers consume them.
 */
import { fetchUsernameById } from "./api-users.js";

export function createMultiplayerApi(chat, auth, options = {}) {
	let sendMessageCallback = options.onSendMessage || (() => {});
	let authResolvedCallback = options.onAuthResolved || (() => {});
	let guestUsernameCallback = options.onGuestUsername || (() => {});

	return {
		setMapIdStatus(id) {
			chat.setMapId(id);
		},

		setConnection(status) {
			chat.setConnection(status);
			auth.setConnection(status);
		},

		setSendMessageCallback(callback) {
			if (typeof callback !== "function") {
				throw new TypeError("Send message callback must be a function.");
			}
			sendMessageCallback = callback;
		},

		setOnAuthResolvedCallback(callback) {
			if (typeof callback !== "function") {
				throw new TypeError("Auth resolved callback must be a function.");
			}
			authResolvedCallback = callback;
		},

		setOnGuestUsernameCallback(callback) {
			if (typeof callback !== "function") {
				throw new TypeError("Guest username callback must be a function.");
			}
			guestUsernameCallback = callback;
		},

		getUsername() {
			return auth.username;
		},

		isAuthenticated() {
			return auth.isAuthenticated;
		},

		getAuthToken() {
			return auth.authToken;
		},

		getAccountId() {
			return auth.accountId;
		},

		getAccountType() {
			return auth.accountType;
		},

		getGuestUuid() {
			return auth.guestUuid;
		},

		getUsernameById(accountId) {
			return fetchUsernameById(accountId);
		},

		setChatScope(global) {
			chat.setScope(global);
		},

		isGlobalChatScope() {
			return chat.isGlobal ?? false;
		},

		setShowGlobalMessages(show) {
			chat.setShowGlobal(show);
		},

		receiveMessage(data) {
			chat.receiveMessage(data);
		},

		clearMessages() {
			chat.clearMessages();
		}
	};
}

/**
 * Convenience function to forward a chat message to the player iframe.
 */
export function forwardChatMessage(playerFrame, message, username, isGlobal) {
	playerFrame.contentWindow?.easyrpgPlayer?.sendChatMessage?.(message, username, !!isGlobal);
}

/**
 * Convenience function to send the user name to the player iframe.
 *
 * No-ops until the player iframe has finished loading (its `easyrpgPlayer`
 * global is only available after the wasm runtime boots) and for empty names.
 */
export function forwardName(playerFrame, username) {
	if (typeof username !== "string" || username.length === 0) {
		return;
	}
	playerFrame.contentWindow?.easyrpgPlayer?.sendName?.(username);
}
