/**
 * Public API exposed on window.EasyRPGMultiplayer for the player iframe.
 *
 * External callers register callbacks; the chat/auth controllers consume them.
 */
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
 */
export function forwardName(playerFrame, username) {
	playerFrame.contentWindow?.easyrpgPlayer?.sendName?.(username);
}
