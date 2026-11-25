
/**
 * Loads a character sprite and creates an animated canvas.
 *
 * @param {string} spriteFile - Sprite sheet filename
 * @param {number} spriteIndex - Character index (0-7)
 * @param {HTMLElement} container - Canvas parent element
 * @param {object} options - Animation options
 *
 * @returns {{ canvas: HTMLCanvasElement, stop: Function }}
 */
async function createAnimatedSprite(
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

    // Load sprite sheet
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

    // Full sheet dimensions
    const sheetWidth = sheet.width;
    const sheetHeight = sheet.height;

    // 8 sprites arranged in 4x2
    const spriteWidth = sheetWidth / 4;
    const spriteHeight = sheetHeight / 2;

    // Each sprite has 3x4 frames
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

    // Character position in the 4x2 grid
    const spriteX = (spriteIndex % 4) * spriteWidth;
    const spriteY = Math.floor(spriteIndex / 4) * spriteHeight;

    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = frameWidth * scale;
    canvas.height = frameHeight * scale;

    canvas.style.imageRendering = "pixelated";
    canvas.style.background = background;

    container.appendChild(canvas);

    // Directions correspond to frame rows
    // 0 = up, 1 = right, 2 = down, 3 = left
    let direction = 0;
    let frame = 0;

    let lastFrameTime = 0;
    let lastDirectionTime = 0;
    let animationId;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Source frame position
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

        // Advance walking animation
        if (timestamp - lastFrameTime >= frameDuration) {
            frame = (frame + 1) % 3;
            lastFrameTime = timestamp;
        }

        // Rotate through directions
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