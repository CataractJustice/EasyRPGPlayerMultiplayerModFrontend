
async function loadXYZ(url) {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to load XYZ: ${response.status}`);
	}

	const bytes = new Uint8Array(await response.arrayBuffer());

	const width = bytes[4] | (bytes[5] << 8);
	const height = bytes[6] | (bytes[7] << 8);

	if (!width || !height || bytes.length < 8) {
		throw new Error("Invalid XYZ dimensions");
	}

	const compressed = bytes.subarray(8);

	const raw = new Uint8Array(
		await new Response(
			new Blob([compressed])
				.stream()
				.pipeThrough(new DecompressionStream("deflate"))
		).arrayBuffer()
	);

	if (raw.length < 768 + width * height) {
		throw new Error("XYZ: insufficient image data");
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	const image = ctx.createImageData(width, height);

	for (let i = 0; i < width * height; i++) {
		const index = raw[768 + i];

		if (index !== 0) {
			const p = index * 3;
			const offset = i * 4;

			image.data[offset] = raw[p];
			image.data[offset + 1] = raw[p + 1];
			image.data[offset + 2] = raw[p + 2];
			image.data[offset + 3] = 255;
		}
	}

	ctx.putImageData(image, 0, 0);

	return canvas;
}
