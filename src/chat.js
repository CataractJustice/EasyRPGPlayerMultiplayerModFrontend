/**
 * Chat UI controller.
 *
 * Manages the chat message list, the message input form, the local/global
 * scope toggle, and the global chat visibility toggle.
 */
export class ChatController {
	#isGlobal = false;
	#showGlobal = true;
	#elements = {};
	#onSend = null;

	/**
	 * @param {Object} elements - DOM element references.
	 * @param {HTMLElement} elements.chatMessages
	 * @param {HTMLFormElement} elements.chatForm
	 * @param {HTMLInputElement} elements.chatInput
	 * @param {HTMLButtonElement} elements.chatScopeToggle
	 * @param {HTMLInputElement} elements.showGlobalToggle
	 * @param {HTMLElement} elements.connectionStatus
	 * @param {HTMLElement} elements.mapIdStatus
	 * @param {Function} onSend - Called with (message, isGlobal) when the user submits a message.
	 */
	constructor(elements, onSend) {
		this.#elements = elements;
		this.#onSend = onSend;

		this.#elements.chatForm.addEventListener("submit", (event) => this.#onSubmit(event));
		this.#elements.chatScopeToggle?.addEventListener("click", () => this.toggleScope());
		this.#elements.showGlobalToggle?.addEventListener("change", () => {
			this.#showGlobal = this.#elements.showGlobalToggle.checked;
			this.#refreshVisibility();
		});

		this.#updateScopeButton();
	}

	setConnection(connected) {
		this.#elements.connectionStatus.textContent = connected ? "Connected" : "Disconnected";
		this.#elements.chatInput.disabled = !connected;
		this.#elements.chatForm.querySelector("button[type='submit']").disabled = !connected;

		if (this.#elements.chatScopeToggle) {
			this.#elements.chatScopeToggle.disabled = !connected;
		}
	}

	setMapId(id) {
		this.#elements.mapIdStatus.textContent = id ?? "none";
	}

	toggleScope() {
		this.#isGlobal = !this.#isGlobal;
		this.#updateScopeButton();
	}

	setScope(isGlobal) {
		this.#isGlobal = !!isGlobal;
		this.#updateScopeButton();
	}

	setShowGlobal(show) {
		this.#showGlobal = !!show;
		if (this.#elements.showGlobalToggle) {
			this.#elements.showGlobalToggle.checked = this.#showGlobal;
		}
		this.#refreshVisibility();
	}

	get isGlobal() {
		return this.#isGlobal;
	}

	receiveMessage(data) {
		if (!data || typeof data.message !== "string") {
			return;
		}

		const isGlobal = !!data.isGlobal;
		const messageElement = document.createElement("div");
		messageElement.className = `chat-message ${isGlobal ? "chat-message--global" : "chat-message--local"}`;
		messageElement.dataset.global = String(isGlobal);

		const scopeElement = document.createElement("span");
		scopeElement.className = "message-scope";
		scopeElement.textContent = isGlobal ? "[G] " : "[L] ";
		scopeElement.title = isGlobal ? "Global" : "Local";

		const authorElement = document.createElement("span");
		authorElement.className = "message-author";
		authorElement.textContent = `${data.author || "Unknown"}: `;

		const textElement = document.createElement("span");
		textElement.className = "message-text";
		textElement.textContent = data.message;

		messageElement.append(scopeElement, authorElement, textElement);
		this.#elements.chatMessages.appendChild(messageElement);

		this.#refreshVisibility();
		this.#elements.chatMessages.scrollTop = this.#elements.chatMessages.scrollHeight;
	}

	clearMessages() {
		this.#elements.chatMessages.replaceChildren();
	}

	#onSubmit(event) {
		event.preventDefault();

		const message = this.#elements.chatInput.value.trim();
		if (!message) return;

		if (typeof this.#onSend === "function") {
			this.#onSend(message, this.#isGlobal);
		}

		this.#elements.chatInput.value = "";
		this.#elements.chatInput.focus();
	}

	#updateScopeButton() {
		const toggle = this.#elements.chatScopeToggle;
		if (!toggle) return;

		if (this.#isGlobal) {
			toggle.textContent = "[G]";
			toggle.title = "Global chat (click to switch to local)";
			toggle.setAttribute("aria-pressed", "true");
			toggle.classList.add("chat-scope-toggle--global");
			toggle.classList.remove("chat-scope-toggle--local");
		} else {
			toggle.textContent = "[L]";
			toggle.title = "Local chat (click to switch to global)";
			toggle.setAttribute("aria-pressed", "false");
			toggle.classList.add("chat-scope-toggle--local");
			toggle.classList.remove("chat-scope-toggle--global");
		}
	}

	#refreshVisibility() {
		const messages = this.#elements.chatMessages.querySelectorAll(".chat-message");
		for (const message of messages) {
			const isGlobal = message.dataset.global === "true";
			if (isGlobal && !this.#showGlobal) {
				message.setAttribute("hidden", "");
			} else {
				message.removeAttribute("hidden");
			}
		}
	}
}
