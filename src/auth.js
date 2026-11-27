import { 
    STORAGE_KEY_GUEST_USERNAME, 
    STORAGE_KEY_GUEST_UUID, 
    STORAGE_KEY_ACCOUNT_ID, 
    STORAGE_KEY_ACCOUNT_TYPE, 
    STORAGE_KEY_AUTH_TOKEN 
} from "./config.js";
import { loadItem, saveItem, removeItem } from "./storage.js";
import { getApiBaseUrl } from "./config.js";

export class AuthController {
    #username = null;
    #accountId = null;
    #accountType = null;
    #guestUuid = null;
    #authToken = null;
    #isAuthenticated = false;
    #onChange = null;
    #expiresAt = null;

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
     * @param {HTMLElement} elements.guestNotice
     * @param {HTMLButtonElement} elements.guestNoticeCopy
     * @param {HTMLElement} elements.guestNoticeUuid
     * @param {Function} onChange - Called when the auth state changes.
     */
    constructor(elements, onChange) {
        this.#elements = elements;
        this.#onChange = onChange;

        this.#elements.usernameSubmit.disabled = true;
        this.#elements.chatInput.disabled = true;
        this.#elements.chatForm.querySelector("button[type='submit']").disabled = true;

        this.#elements.usernameForm.addEventListener("submit", (event) => this.#onSubmit(event));
        
        if (this.#elements.guestNoticeCopy) {
            this.#elements.guestNoticeCopy.addEventListener("click", () => this.#copyGuestUuid());
        }
    }

    get username() {
        return this.#username;
    }

    get accountId() {
        return this.#accountId;
    }

    get accountType() {
        return this.#accountType;
    }

    get guestUuid() {
        return this.#guestUuid;
    }

    get authToken() {
        return this.#authToken;
    }

    get isAuthenticated() {
        return this.#isAuthenticated;
    }

    get expiresAt() {
        return this.#expiresAt;
    }

    async init() {
        const savedToken = loadItem(STORAGE_KEY_AUTH_TOKEN);
        const savedAccountId = loadItem(STORAGE_KEY_ACCOUNT_ID);
        const savedAccountType = loadItem(STORAGE_KEY_ACCOUNT_TYPE);
        const savedGuestUuid = loadItem(STORAGE_KEY_GUEST_UUID);
        // Older builds persisted the literal string "null" for guests without
        // a name; treat that as "no saved name" so it can be re-entered.
        const rawSavedUsername = loadItem(STORAGE_KEY_GUEST_USERNAME);
        const savedUsername =
            rawSavedUsername && rawSavedUsername !== "null" ? rawSavedUsername : null;

        if (savedToken && savedAccountId) {
            this.#authToken = savedToken;
            this.#accountId = savedAccountId;
            this.#accountType = savedAccountType;
            this.#guestUuid = savedGuestUuid;
            this.#username = savedUsername;

            const result = await this.#validateSession(savedToken);
            if (result.valid) {
                // Guest accounts have no server-side username (the display
                // name is stored locally), so restore the saved one instead
                // of overwriting it with the null returned by the server.
                const isGuest = result.accountType === "guest";
                const username = result.username || (isGuest ? savedUsername : null);
                this.#setUser({ ...result, username });

                if (username) {
                    this.#showChat();
                } else {
                    // No name yet (e.g. storage was cleared): let the guest
                    // pick one instead of trapping them in a broken chat.
                    this.#showGuestUsernamePrompt(savedUsername);
                }

                this.#notify(this.#buildAuthResult(this.#isAuthenticated));
                return;
            } else {
                this.#clearStorage();
            }
        }

        if (savedGuestUuid) {
            const result = await this.#recoverGuestAccount(savedGuestUuid);
            if (result.success) {
                this.#setUser(result);
                this.#showGuestUsernamePrompt(savedUsername);
                this.#notify(this.#buildAuthResult(false));
                return;
            } else {
                this.#clearStorage();
            }
        }

        const guestResult = await this.#createGuestAccount();
        if (guestResult.success) {
            this.#setUser(guestResult);
            this.#showGuestUsernamePrompt(savedUsername);
            this.#notify(this.#buildAuthResult(false));
        } else {
            this.#showPrompt();
            this.#elements.usernameError.textContent = "Failed to create guest account. Please try again.";
        }
    }

    async #createGuestAccount() {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/guest`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" }
            });
            const data = await response.json();
            if (data.accountId && data.guestUuid) {
                return {
                    success: true,
                    accountId: data.accountId,
                    accountType: data.accountType,
                    username: data.username || null,
                    guestUuid: data.guestUuid
                };
            }
            return { success: false, error: data.error };
        } catch (error) {
            console.error("Failed to create guest account:", error);
            return { success: false, error: error.message };
        }
    }

    async #loadGuestAccount(guestUuid) {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/guest/load`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestUuid })
            });
            const data = await response.json();
            if (data.accountId && data.guestUuid) {
                return {
                    success: true,
                    accountId: data.accountId,
                    accountType: data.accountType,
                    username: data.username || null,
                    guestUuid: data.guestUuid,
                    authToken: data.authToken
                };
            }
            return { success: false, error: data.error };
        } catch (error) {
            console.error("Failed to load guest account:", error);
            return { success: false, error: error.message };
        }
    }

    async #recoverGuestAccount(guestUuid) {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/guest/recover`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestUuid })
            });
            const data = await response.json();
            if (data.accountId && data.guestUuid) {
                return {
                    success: true,
                    accountId: data.accountId,
                    accountType: data.accountType,
                    username: data.username || `Guest${data.accountId.slice(-6)}`,
                    guestUuid: data.guestUuid,
                    authToken: data.authToken,
                    expiresAt: data.expiresAt,
                    ttlDays: data.ttlDays
                };
            }
            return { success: false, error: data.error };
        } catch (error) {
            console.error("Failed to recover guest account:", error);
            return { success: false, error: error.message };
        }
    }

    async #validateSession(token) {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
                credentials: "include",
                headers: { "Content-Type": "application/json" }
            });
            const data = await response.json();
            if (data.authenticated && data.accountId) {
                return {
                    valid: true,
                    accountId: data.accountId,
                    accountType: data.accountType,
                    username: data.username,
                    guestUuid: data.guestUuid,
                    authToken: data.authToken,
                    achievements: data.achievements,
                    items: data.items,
                    progress: data.progress,
                    customData: data.customData
                };
            }
            return { valid: false };
        } catch (error) {
            console.error("Failed to validate session:", error);
            return { valid: false };
        }
    }

    #setUser(data) {
        this.#accountId = data.accountId;
        this.#accountType = data.accountType;
        this.#username = data.username;
        this.#guestUuid = data.guestUuid;
        this.#authToken = data.authToken;
        this.#expiresAt = data.expiresAt;
        this.#isAuthenticated = data.accountType === "registered";

        this.#elements.userInfoName.textContent = this.#username || "—";

        if (this.#isAuthenticated) {
            this.#elements.userInfoBadge.textContent = "Logged in";
            this.#elements.userInfoBadge.className = "user-info-badge user-info-badge--auth";
            this.#hideGuestNotice();
        } else {
            this.#elements.userInfoBadge.textContent = "Guest";
            this.#elements.userInfoBadge.className = "user-info-badge user-info-badge--guest";
            this.#showGuestNotice(data.guestUuid);
        }

        this.#saveToStorage(data);
    }

    #saveToStorage(data) {
        saveItem(STORAGE_KEY_AUTH_TOKEN, data.authToken || "");
        saveItem(STORAGE_KEY_ACCOUNT_ID, data.accountId);
        saveItem(STORAGE_KEY_ACCOUNT_TYPE, data.accountType);
        saveItem(STORAGE_KEY_GUEST_UUID, data.guestUuid || "");

        // Only persist a real guest display name. Storing null/"" would write
        // the literal string "null" and corrupt the saved name on reload.
        if (data.accountType === "guest" && typeof data.username === "string" && data.username) {
            saveItem(STORAGE_KEY_GUEST_USERNAME, data.username);
        } else {
            removeItem(STORAGE_KEY_GUEST_USERNAME);
        }
    }

    #clearStorage() {
        removeItem(STORAGE_KEY_AUTH_TOKEN);
        removeItem(STORAGE_KEY_ACCOUNT_ID);
        removeItem(STORAGE_KEY_ACCOUNT_TYPE);
        removeItem(STORAGE_KEY_GUEST_UUID);
        removeItem(STORAGE_KEY_GUEST_USERNAME);
    }

    #buildAuthResult(authenticated) {
        return {
            authenticated,
            username: this.#username,
            accountId: this.#accountId,
            accountType: this.#accountType,
            guestUuid: this.#guestUuid,
            authToken: this.#authToken,
            expiresAt: this.#expiresAt
        };
    }

    #showPrompt() {
        this.#elements.usernamePrompt.removeAttribute("hidden");
        this.#elements.chatForm.setAttribute("hidden", "");
        this.#elements.usernameError.textContent = "";
        this.#elements.usernameInput.focus();
    }

    #showGuestUsernamePrompt(savedUsername) {
        const prefill = savedUsername || this.#username || "";
        this.#elements.usernameInput.value = prefill;
        this.#showPrompt();
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

    async #onSubmit(event) {
        event.preventDefault();

        const username = this.#elements.usernameInput.value.trim();

        if (!username) {
            this.#elements.usernameError.textContent = "Please enter a username.";
            return;
        }

        if (!/^[A-Za-z0-9_-]+$/.test(username)) {
            this.#elements.usernameError.textContent =
                "Username may only contain letters, numbers, dashes (-) and underscores (_).";
            return;
        }

        this.#username = username;
        this.#isAuthenticated = false;
        saveItem(STORAGE_KEY_GUEST_USERNAME, username);
        this.#elements.userInfoName.textContent = username;

        // Persist the name on the server so it survives reloads. This is
        // best-effort: the local copy above keeps things working offline.
        await this.setGuestUsername(username);

        this.#showChat();
        this.#enableChat();

        this.#notify({
            authenticated: false,
            username,
            accountId: this.#accountId,
            accountType: this.#accountType,
            guestUuid: this.#guestUuid
        });

        this.#elements.chatInput.focus();
    }

    #showGuestNotice(guestUuid) {
        if (!this.#elements.guestNotice || !this.#elements.guestNoticeUuid) return;
        
        this.#elements.guestNoticeUuid.textContent = guestUuid;
        
        this.#elements.guestNotice.removeAttribute("hidden");
    }

    #hideGuestNotice() {
        if (this.#elements.guestNotice) {
            this.#elements.guestNotice.setAttribute("hidden", "");
        }
    }

    #maskUuid(uuid) {
        if (!uuid) return "";
        const parts = uuid.split("-");
        if (parts.length !== 5) return "****";
        return `${parts[0]}-****-****-****-${parts[4]}`;
    }

    #copyGuestUuid() {
        const fullUuid = this.#elements.guestNoticeUuid?.dataset?.fullUuid;
        if (!fullUuid) return;
        
        navigator.clipboard.writeText(fullUuid).then(() => {
            const originalText = this.#elements.guestNoticeCopy.textContent;
            this.#elements.guestNoticeCopy.textContent = "Copied!";
            setTimeout(() => {
                this.#elements.guestNoticeCopy.textContent = originalText;
            }, 2000);
        });
    }

    #notify(payload) {
        if (typeof this.#onChange === "function") {
            this.#onChange(payload);
        }
    }

    setConnection(connected) {
        this.#setConnectionStatus(connected);
    }

    hideGuestNotice() {
        this.#hideGuestNotice();
    }

    async register(username, password, guestUuid = null) {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestUuid: guestUuid || null, username, password })
            });
            const data = await response.json();
            if (data.accountId) {
                this.#setUser({
                    accountId: data.accountId,
                    accountType: "registered",
                    username: data.username,
                    guestUuid: null,
                    authToken: data.authToken,
                    expiresAt: null,
                    ttlDays: null
                });
                this.#notify(this.#buildAuthResult(true));
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (error) {
            console.error("Registration failed:", error);
            return { success: false, error: error.message };
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (data.accountId) {
                this.#setUser({
                    accountId: data.accountId,
                    accountType: "registered",
                    username: data.username,
                    guestUuid: null,
                    authToken: data.authToken,
                    expiresAt: null,
                    ttlDays: null
                });
                this.#notify(this.#buildAuthResult(true));
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error("Logout failed:", error);
        }
        
        this.#clearStorage();
        this.#authToken = null;
        this.#accountId = null;
        this.#accountType = null;
        this.#username = null;
        this.#guestUuid = null;
        this.#isAuthenticated = false;
        this.#expiresAt = null;
        
        this.#showPrompt();
        this.#elements.usernameError.textContent = "";
        this.#elements.chatInput.disabled = true;
        this.#elements.chatForm.querySelector("button[type='submit']").disabled = true;
        
        this.#notify({ authenticated: false });
    }

    async recoverGuest(guestUuid) {
        const result = await this.#recoverGuestAccount(guestUuid);
        if (result.success) {
            this.#setUser(result);
            this.#showChat();
            this.#notify(this.#buildAuthResult(false));
            return { success: true };
        }
        return { success: false, error: result.error };
    }

    async loadGuest(guestUuid) {
        const result = await this.#loadGuestAccount(guestUuid);
        if (!result.success) {
            return { success: false, error: result.error };
        }

        this.#setUser(result);
        if (this.#username) {
            this.#showChat();
        } else {
            this.#showGuestUsernamePrompt(null);
        }
        this.#notify(this.#buildAuthResult(false));
        return { success: true };
    }

    async setGuestUsername(username) {
        if (!this.#guestUuid) {
            return { success: false, error: "No guest account" };
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/guest/name`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            if (data.accountId) {
                this.#username = data.username;
                this.#saveToStorage({
                    accountId: this.#accountId,
                    accountType: this.#accountType,
                    username: data.username,
                    guestUuid: this.#guestUuid,
                    authToken: this.#authToken
                });
                return { success: true, username: data.username };
            }
            return { success: false, error: data.error };
        } catch (error) {
            console.error("Failed to persist guest name:", error);
            return { success: false, error: error.message };
        }
    }
}