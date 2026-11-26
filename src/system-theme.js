import { loadXYZ } from "./xyz-loader.js";

/**
 * Load the system theme images for a game and apply them as CSS variables.
 *
 * @param {string} gameId
 * @param {string} systemName
 */
export async function setSystemImageStyles(gameId, systemName) {
	try {
		const basePath = `/games/${encodeURIComponent(gameId)}`;
		const response = await fetch(`${basePath}/index.json`);
		const index = await response.json();
		const filename = index.cache.system[systemName];
		const url = `${basePath}/System/${filename}`;

		let imageUrl;
		if (filename.endsWith(".xyz")) {
			imageUrl = (await loadXYZ(url)).toDataURL("image/png");
		} else if (filename.endsWith(".png")) {
			imageUrl = url;
		} else {
			return;
		}

		const img = new Image();
		img.crossOrigin = "anonymous";

		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = imageUrl;
		});

		function crop(x, y, width, height) {
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

			return canvas.toDataURL("image/png");
		}

		const background = crop(0, 0, 32, 32);
		const border = crop(32, 0, 32, 32);
		const textBackground = crop(0, 48, 16, 16);

		const root = document.documentElement;
		root.style.setProperty("--system-background-image", `url("${background}")`);
		root.style.setProperty("--system-border-image", `url("${border}") 8 repeat`);
		root.style.setProperty("--system-text-background-image", `url("${textBackground}")`);
	} catch (error) {
		console.warn("Could not apply system theme images", error);
	}
}
