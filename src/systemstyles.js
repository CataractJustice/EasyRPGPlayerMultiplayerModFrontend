

async function getSystemImageURL(systemName) 
{
	const basePath = `/games/${gameId}`;
	const response = await fetch(`${basePath}/index.json`);
	const index = await response.json();
	const filename = index.cache.system[systemName];
	const url = `${basePath}/System/${filename}`;
	if (filename.endsWith(".xyz")) {
		return (await loadXYZ(url)).toDataURL("image/png")
	} else if (filename.endsWith(".png")) {
		return url;
	}
}

async function setSystemImageStyles(system) {
	const imageUrl = await getSystemImageURL(system);

	const img = new Image();
	img.crossOrigin = 'anonymous';
	console.log(imageUrl);

	await new Promise((resolve, reject) => {
		img.onload = resolve;
		img.onerror = reject;
		img.src = imageUrl;
	});

	function crop(x, y, width, height) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		ctx.drawImage(
			img,
			x, y, width, height,
			0, 0, width, height
		);

		return canvas.toDataURL('image/png');
	}

	const background = crop(0, 0, 32, 32);
	const border = crop(32, 0, 32, 32);
	const textBackground = crop(0, 48, 16, 16);

	const root = document.documentElement;

    root.style.setProperty('--system-background-image', `url("${background}")`);
    root.style.setProperty('--system-border-image', `url("${border}") 8 repeat`);
	root.style.setProperty('--system-text-background-image', `url("${textBackground}")`);
}