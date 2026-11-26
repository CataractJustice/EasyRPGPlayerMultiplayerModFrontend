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
        scale = 3,
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

    animationId = requestAnimationFrame(animate);

    return {
        canvas,

        stop() {
            cancelAnimationFrame(animationId);
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
    }

    async open(gameId, gameIndexPromise) {
        this.#gameId = gameId;
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

            item.classList.toggle("selected", !!selected);
            item.setAttribute("aria-pressed", String(!!selected));
        });
    }

    #updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.#items.length / SPRITES_PER_PAGE));
        this.#elements.page.textContent = `Page ${this.#pageIndex + 1} / ${totalPages}`;
        this.#elements.prev.disabled = this.#pageIndex === 0;
        this.#elements.next.disabled = this.#pageIndex >= totalPages - 1;
    }

    async #renderPage() {
        this.#cleanup();

        const renderId = this.#renderId;
        const start = this.#pageIndex * SPRITES_PER_PAGE;
        const items = this.#items.slice(start, start + SPRITES_PER_PAGE);

        this.#updatePagination();

        if (!items.length) {
            const empty = document.createElement("p");
            empty.textContent = "No character sprites available.";
            this.#elements.grid.appendChild(empty);
            return;
        }

        for (const sprite of items) {
            if (renderId !== this.#renderId) return;

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
            this.#elements.grid.appendChild(item);

            item.addEventListener("click", () => {
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
                player?.contentWindow?.easyrpgPlayer?.setOwnSprite?.(sheet, index);
            });

            try {
                const spriteFile = `/games/${encodeURIComponent(this.#gameId)}/CharSet/${filename}`;
                const result = await createAnimatedSprite(spriteFile, index, item, {});

                if (renderId !== this.#renderId || !item.isConnected) {
                    result.stop();
                    result.canvas.remove();
                    continue;
                }

                this.#animations.push(result);

                result.canvas.classList.add("sprite-preview");
                result.canvas.setAttribute("aria-hidden", "true");
                item.insertBefore(result.canvas, label);
            } catch (error) {
                console.warn(`Could not load sprite ${sheet} #${index}:`, error);

                if (renderId === this.#renderId) {
                    const errorLabel = document.createElement("small");
                    errorLabel.textContent = "Preview unavailable";
                    item.appendChild(errorLabel);
                }
            }
        }

        this.#updateSelection();
    }

    #prevPage() {
        if (this.#pageIndex > 0) {
            this.#pageIndex--;
            this.#renderPage();
        }
    }

    #nextPage() {
        const totalPages = Math.ceil(this.#items.length / SPRITES_PER_PAGE);
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
}
