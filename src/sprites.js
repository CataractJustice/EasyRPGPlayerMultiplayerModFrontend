import { loadXYZ } from "./xyz-loader.js";
import { SPRITES_PER_PAGE } from "./config.js";

/**
 * Loads a character sprite and creates an animated canvas.
 *
 * @param {string} spriteFile - Sprite sheet filename or URL.
 * @param {number} spriteIndex - Character index (0-7).
 * @param {HTMLElement} container - Canvas parent element.
 * @param {object} options - Animation options.
 * @returns {Promise<{ canvas: HTMLCanvasElement, stop: Function, setDirection: Function, setFrame: Function }>}
 */
export async function createAnimatedSprite(
    spriteFile,
    spriteIndex = 0,
    container = document.body,
    options = {}
) {
    const {
        scale = 1,
        frameDuration = 150,
        directionDuration = 1500,
        background = "transparent",
        autoSpin = true
    } = options;

    let sheet;

    if (spriteFile.toLowerCase().endsWith(".xyz")) {
        sheet = await loadXYZ(spriteFile);
    } else {
        sheet = new Image();
        sheet.src = spriteFile;

        await new Promise((resolve, reject) => {
            sheet.onload = resolve;
            sheet.onerror = reject;
        });
    }

    const sheetWidth = sheet.width;
    const sheetHeight = sheet.height;

    const spriteWidth = sheetWidth / 4;
    const spriteHeight = sheetHeight / 2;

    const frameWidth = spriteWidth / 3;
    const frameHeight = spriteHeight / 4;

    if (
        !Number.isInteger(frameWidth) ||
        !Number.isInteger(frameHeight) ||
        spriteIndex < 0 ||
        spriteIndex > 7
    ) {
        throw new Error("Invalid sprite sheet dimensions or sprite index.");
    }

    const spriteX = (spriteIndex % 4) * spriteWidth;
    const spriteY = Math.floor(spriteIndex / 4) * spriteHeight;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = frameWidth * scale;
    canvas.height = frameHeight * scale;

    canvas.style.imageRendering = "pixelated";
    canvas.style.background = background;

    container.appendChild(canvas);

    let direction = 0;
let frame = 0;

let lastFrameTime = 0;
let lastDirectionTime = 0;
let animationId;

let animationEnabled = options.animate !== false;
let stopped = false;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sx = spriteX + frame * frameWidth;
    const sy = spriteY + direction * frameHeight;

    ctx.drawImage(
        sheet,
        sx,
        sy,
        frameWidth,
        frameHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );
}

function animate(timestamp) {
    if (stopped || !animationEnabled) return;

    if (!lastFrameTime) {
        lastFrameTime = timestamp;
        lastDirectionTime = timestamp;
    }

    if (timestamp - lastFrameTime >= frameDuration) {
        frame = (frame + 1) % 3;
        lastFrameTime = timestamp;
    }

    if (
        autoSpin &&
        timestamp - lastDirectionTime >= directionDuration
    ) {
        direction = (direction + 1) % 4;
        lastDirectionTime = timestamp;
    }

    draw();

    animationId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (stopped || animationEnabled === false) return;

    if (animationId !== undefined) return;

    lastFrameTime = 0;
    lastDirectionTime = 0;

    animationId = requestAnimationFrame(timestamp => {
        animationId = undefined;
        animate(timestamp);
    });
}

function stopAnimation() {
    if (animationId !== undefined) {
        cancelAnimationFrame(animationId);
        animationId = undefined;
    }
}

draw();

if (animationEnabled) {
    startAnimation();
}

return {
    canvas,

    stop() {
        stopped = true;
        stopAnimation();
    },

    setAnimationEnabled(enabled) {
        animationEnabled = enabled;

        if (enabled) {
            startAnimation();
        } else {
            stopAnimation();
        }
    },

    setDirection(newDirection) {
        direction = ((newDirection % 4) + 4) % 4;
        draw();
    },

    setFrame(newFrame) {
        frame = ((newFrame % 3) + 3) % 3;
        draw();
    }
};
}

/**
 * Controller for the character sprite picker modal.
 */
export class SpritePickerController {
    #gameId = null;
    #gameIndex = null;
    #pageIndex = 0;
    #selected = null;
    #items = [];
    #animations = [];
    #renderId = 0;
    #elements = {};
    #getPlayerFrame = null;
    #animationEnabled = true;
    #animationToggle = null;
    #category = "all";
    #favorites = new Set();

    /**
     * @param {Object} elements - DOM element references.
     * @param {HTMLElement} elements.modal
     * @param {HTMLElement} elements.grid
     * @param {HTMLElement} elements.page
     * @param {HTMLButtonElement} elements.prev
     * @param {HTMLButtonElement} elements.next
     * @param {HTMLButtonElement} elements.close
     * @param {HTMLButtonElement} elements.remove
     * @param {Function} getPlayerFrame - Returns the player iframe element.
     */
    constructor(elements, getPlayerFrame) {
        this.#elements = elements;
        this.#getPlayerFrame = getPlayerFrame;

        this.#elements.prev.addEventListener("click", () => this.#prevPage());
        this.#elements.next.addEventListener("click", () => this.#nextPage());
        this.#elements.close.addEventListener("click", () => this.close());
        this.#elements.remove.addEventListener("click", () => this.#removeSelection());

        const pageInput = this.#elements.page?.querySelector("#sprite-page-input");
        if (pageInput) {
            const navigateFromInput = () => {
                const value = parseInt(pageInput.value, 10) || 1;
                const max = parseInt(pageInput.getAttribute("max"), 10) || 1;
                const page = Math.min(Math.max(value, 1), max) - 1;
                if (page !== this.#pageIndex) {
                    this.#pageIndex = page;
                    this.#renderPage();
                }
            };
            pageInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    navigateFromInput();
                }
            });
            pageInput.addEventListener("blur", navigateFromInput);
        }

        this.#elements.categoryAll = document.getElementById("sprite-category-all");

        this.#elements.categoryFavorites =
            document.getElementById("sprite-category-favorites");

        this.#elements.categoryAll.addEventListener("click", () => {
            this.#setCategory("all");
        });

        this.#elements.categoryFavorites.addEventListener("click", () => {
            this.#setCategory("favorites");
        });

        this.#elements.modal.addEventListener("click", (event) => {
            if (event.target === this.#elements.modal) {
                this.close();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !this.#elements.modal.hidden) {
                this.close();
            }
        });
        this.#animationToggle = document.getElementById("sprite-animation-toggle");

        if (this.#animationToggle) {
            const savedPreference = localStorage.getItem("sprite-animation-enabled");
        
            this.#animationEnabled = savedPreference === null
                ? true
                : savedPreference === "true";
        
            this.#animationToggle.checked = this.#animationEnabled;
        
            this.#animationToggle.addEventListener("change", () => {
    this.#animationEnabled = this.#animationToggle.checked;

    localStorage.setItem(
        "sprite-animation-enabled",
        String(this.#animationEnabled)
    );

    // Update existing animations instead of re-rendering sprites.
    for (const animation of this.#animations) {
        animation.setAnimationEnabled(this.#animationEnabled);
    }
});
        }
    }

    async open(gameId, gameIndexPromise) {
        this.#gameId = gameId;

        this.#loadFavorites();

        this.#elements.modal.hidden = false;

        try {
            this.#gameIndex = await gameIndexPromise;
            const charset = this.#gameIndex?.cache?.charset || {};

            this.#items = Object.entries(charset).flatMap(
                ([sheet, filename]) =>
                    Array.from({ length: 8 }, (_, index) => ({
                        sheet,
                        filename,
                        index
                    }))
            );

            const totalPages = Math.max(1, Math.ceil(this.#items.length / SPRITES_PER_PAGE));
            this.#pageIndex = Math.min(this.#pageIndex, totalPages - 1);

            await this.#renderPage();
        } catch (error) {
            this.#cleanup();

            const message = document.createElement("p");
            message.textContent = "Unable to load character sprites.";
            this.#elements.grid.appendChild(message);

            console.error(error);
        }
    }

    close() {
        this.#elements.modal.hidden = true;
        this.#cleanup();
    }

    #cleanup() {
        this.#renderId++;

        for (const animation of this.#animations) {
            try {
                animation.stop();
                animation.canvas.remove();
            } catch (e) {
                console.warn("Sprite cleanup failed:", e);
            }
        }

        this.#animations = [];
        this.#elements.grid.replaceChildren();
    }

    #updateSelection() {
        this.#elements.grid.querySelectorAll(".sprite-item").forEach(item => {
            const selected =
                this.#selected &&
                item.dataset.sheet === this.#selected.sheet &&
                Number(item.dataset.index) === this.#selected.index;

            const button = item.querySelector(".sprite-select");

            button?.classList.toggle("selected", !!selected);

            button?.setAttribute(
                "aria-pressed",
                String(!!selected)
            );
        });
    }

    #updatePagination() 
    {
        const items = this.#getVisibleItems();

        const totalPages = Math.max(
            1,
            Math.ceil(items.length / SPRITES_PER_PAGE)
        );

        this.#pageIndex = Math.min(
            this.#pageIndex,
            totalPages - 1
        );

        this.#elements.prev.disabled = this.#pageIndex === 0;

        this.#elements.next.disabled =
            this.#pageIndex >= totalPages - 1;

        const pageInput = this.#elements.page?.querySelector("#sprite-page-input");
        const pageTotal = this.#elements.page?.querySelector("#sprite-page-total");
        if (pageInput) {
            pageInput.setAttribute("max", String(totalPages));
            pageInput.value = String(this.#pageIndex + 1);
        }
        if (pageTotal) {
            pageTotal.textContent = ` / ${totalPages}`;
        }
    }
    async #renderPage() {
    this.#cleanup();

    const renderId = this.#renderId;

    const visibleItems = this.#getVisibleItems();

    const totalPages = Math.max(
        1,
        Math.ceil(visibleItems.length / SPRITES_PER_PAGE)
    );

    this.#pageIndex = Math.min(
        this.#pageIndex,
        totalPages - 1
    );

    const start = this.#pageIndex * SPRITES_PER_PAGE;

    const items = visibleItems.slice(
        start,
        start + SPRITES_PER_PAGE
    );

    this.#updatePagination();

    if (!items.length) {
        const empty = document.createElement("p");

        empty.textContent =
            this.#category === "favorites"
                ? "No favorite sprites yet."
                : "No character sprites available.";

        this.#elements.grid.appendChild(empty);
        return;
    }

    // Store references to boxes and their sprite information.
    const spriteElements = [];

    // =====================================
    // PHASE 1: CREATE ALL SPRITE BOXES
    // =====================================

    for (const sprite of items) {
        const { sheet, filename, index } = sprite;

        const item = document.createElement("div");

        item.className = "sprite-item";
        item.dataset.sheet = sheet;
        item.dataset.index = String(index);

        const selectButton = document.createElement("button");

        selectButton.type = "button";
        selectButton.className = "sprite-select";
        selectButton.setAttribute("aria-pressed", "false");

        const label = document.createElement("span");

        label.className = "sprite-label";
        label.textContent = `${sheet} #${index}`;

        const star = document.createElement("button");

        const favorite = this.#isFavorite(sheet, index);

        star.type = "button";
        star.className = "sprite-favorite";
        star.textContent = favorite ? "★" : "☆";

        star.classList.toggle("favorited", favorite);

        star.setAttribute(
            "aria-label",
            favorite ? "Remove from favorites" : "Add to favorites"
        );

        star.setAttribute("aria-pressed", String(favorite));

        star.addEventListener("click", event => {
            event.stopPropagation();

            this.#toggleFavorite(sheet, index, star);
        });

        selectButton.addEventListener("click", () => {
            if (
                this.#selected &&
                this.#selected.sheet === sheet &&
                this.#selected.index === index
            ) {
                return;
            }

            this.#selected = { sheet, index };

            this.#updateSelection();

            const player = this.#getPlayerFrame();

            player?.contentWindow?.easyrpgPlayer
                ?.setOwnSprite?.(sheet, index);
        });

        selectButton.appendChild(label);

        item.appendChild(selectButton);
        item.appendChild(star);

        // Append every box immediately.
        this.#elements.grid.appendChild(item);

        spriteElements.push({
            item,
            selectButton,
            sprite
        });
    }

    // =====================================
    // PHASE 2: LOAD SPRITES
    // =====================================

    const loadSprite = async ({ item, selectButton, sprite }) => {
        if (renderId !== this.#renderId) return;

        const { sheet, filename, index } = sprite;

        try {
            const spriteFile =
                `/games/${encodeURIComponent(this.#gameId)}/CharSet/${filename}`;

            const result = await createAnimatedSprite(
                spriteFile,
                index,
                selectButton,
                {
                    animate: this.#animationEnabled
                }
            );

            // Prevent stale asynchronous results.
            if (renderId !== this.#renderId || !item.isConnected) {
                result.stop();
                result.canvas.remove();
                return;
            }

            this.#animations.push(result);

            result.canvas.classList.add("sprite-preview");
            result.canvas.setAttribute("aria-hidden", "true");

            selectButton.insertBefore(
                result.canvas,
                selectButton.firstChild
            );

        } catch (error) {
            console.warn(
                `Could not load sprite ${sheet} #${index}:`,
                error
            );

            if (renderId === this.#renderId && item.isConnected) {
                const errorLabel = document.createElement("small");

                errorLabel.textContent = "Preview unavailable";

                selectButton.appendChild(errorLabel);
            }
        }
    };

    // Load all sprites concurrently, after all boxes exist.
    await Promise.all(spriteElements.map(loadSprite));

    if (renderId !== this.#renderId) return;

    this.#updateSelection();
}

    #prevPage() {
        if (this.#pageIndex > 0) {
            this.#pageIndex--;
            this.#renderPage();
        }
    }

    #nextPage() {
        const totalPages = Math.ceil(
            this.#getVisibleItems().length / SPRITES_PER_PAGE
        );

        if (this.#pageIndex < totalPages - 1) {
            this.#pageIndex++;
            this.#renderPage();
        }
    }

    #removeSelection() {
        if (!this.#selected) return;

        this.#selected = null;
        this.#updateSelection();

        const player = this.#getPlayerFrame();
        player?.contentWindow?.easyrpgPlayer?.unsetOwnSprite?.();
    }

    #getFavoritesKey() {
        return `sprite-favorites:${this.#gameId}`;
    }

    #loadFavorites() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(this.#getFavoritesKey()) || "[]"
            );

            this.#favorites = new Set(
                saved.map(sprite => `${sprite.sheet}:${sprite.index}`)
            );
        } catch {
            this.#favorites = new Set();
        }
    }

    #saveFavorites() {
        localStorage.setItem(
            this.#getFavoritesKey(),
            JSON.stringify(
                [...this.#favorites].map(key => {
                    const separator = key.lastIndexOf(":");

                    return {
                        sheet: key.substring(0, separator),
                        index: Number(key.substring(separator + 1))
                    };
                })
            )
        );
    }

    #isFavorite(sheet, index) {
        return this.#favorites.has(`${sheet}:${index}`);
    }

    #toggleFavorite(sheet, index, star) {
    const key = `${sheet}:${index}`;

    if (this.#favorites.has(key)) {
        this.#favorites.delete(key);
    } else {
        this.#favorites.add(key);
    }

    this.#saveFavorites();

    const isFavorite = this.#favorites.has(key);

    // Update only the clicked star.
    star.textContent = isFavorite ? "★" : "☆";
    star.classList.toggle("favorited", isFavorite);

    star.setAttribute(
        "aria-label",
        isFavorite
            ? "Remove from favorites"
            : "Add to favorites"
    );

    star.setAttribute("aria-pressed", String(isFavorite));

    // If we're viewing Favorites and the sprite was unfavorited,
    // remove only that sprite from the grid.
    if (this.#category === "favorites" && !isFavorite) {
        const item = star.closest(".sprite-item");

        const animation = this.#animations.find(
            animation => item?.contains(animation.canvas)
        );

        if (animation) {
            animation.stop();
            animation.canvas.remove();

            this.#animations = this.#animations.filter(
                current => current !== animation
            );
        }

        item?.remove();

        this.#updatePagination();

        // Show empty message if necessary.
        if (!this.#elements.grid.querySelector(".sprite-item")) {
            const empty = document.createElement("p");
            empty.textContent = "No favorite sprites yet.";
            this.#elements.grid.appendChild(empty);
        }
    }
}

    #getVisibleItems() {
        if (this.#category === "favorites") {
            return this.#items.filter(sprite =>
                this.#isFavorite(sprite.sheet, sprite.index)
            );
        }

        return this.#items;
    }

    #setCategory(category) {
        this.#category = category;
        this.#pageIndex = 0;

        this.#elements.categoryAll.classList.toggle(
            "active", category === "all"
        );

        this.#elements.categoryFavorites.classList.toggle(
            "active", category === "favorites"
        );

        this.#renderPage();
    }
}
