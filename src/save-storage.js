/**
 * Upload an RPG Maker save file to the game's IndexedDB storage.
 *
 * @param {string} gameId
 * @param {File} file
 * @param {number|string} saveSlot
 * @returns {Promise<boolean>}
 */
export function uploadSaveFile(gameId, file, saveSlot) {
	let slot = String(saveSlot);
	if (slot.length === 1) slot = "0" + slot;

	return new Promise((resolve) => {
		if (!file || !slot) {
			return resolve(false);
		}

		if (!/\.lsd$/i.test(file.name)) {
			alert("Invalid file format");
			return resolve(false);
		}

		const request = indexedDB.open(`/easyrpg/${gameId}/Save`);

		request.onerror = () => resolve(false);
		request.onblocked = () => resolve(false);

		request.onsuccess = () => {
			const db = request.result;
			const reader = new FileReader();

			reader.onerror = () => {
				db.close();
				resolve(false);
			};

			reader.onload = (event) => {
				try {
					const saveFile = {
						timestamp: new Date(),
						mode: 33206,
						contents: new Uint8Array(event.target.result)
					};

					const transaction = db.transaction(["FILE_DATA"], "readwrite");

					transaction.oncomplete = () => {
						db.close();
						resolve(true);
					};

					transaction.onerror = () => {
						db.close();
						resolve(false);
					};

					transaction.onabort = () => {
						db.close();
						resolve(false);
					};

					transaction
						.objectStore("FILE_DATA")
						.put(saveFile, `/easyrpg/${gameId}/Save/Save${slot}.lsd`);
				} catch (error) {
					db.close();
					resolve(false);
				}
			};

			reader.readAsArrayBuffer(file);
		};
	});
}

/**
 * Download an RPG Maker save file from the game's IndexedDB storage.
 *
 * @param {string} gameId
 * @param {number|string} saveSlot
 * @returns {Promise<boolean>}
 */
export function downloadSaveFile(gameId, saveSlot) {
	let slot = String(saveSlot);
	if (slot.length === 1) slot = "0" + slot;

	return new Promise((resolve) => {
		if (!slot) {
			return resolve(false);
		}

		const request = indexedDB.open(`/easyrpg/${gameId}/Save`);

		request.onerror = () => resolve(false);
		request.onblocked = () => resolve(false);

		request.onsuccess = () => {
			const db = request.result;

			try {
				const transaction = db.transaction(["FILE_DATA"], "readonly");
				const objectStore = transaction.objectStore("FILE_DATA");
				const objectStoreRequest = objectStore.get(`/easyrpg/${gameId}/Save/Save${slot}.lsd`);

				objectStoreRequest.onsuccess = () => {
					try {
						const record = objectStoreRequest.result;

						if (!record) {
							alert("Trying to download an empty slot");
							db.close();
							return resolve(false);
						}

						const blob = new Blob([record.contents], { type: "application/octet-stream" });
						const date = new Date(record.timestamp);

						const formattedDate = [
							date.getFullYear(),
							(date.getMonth() + 1).toString().padStart(2, "0"),
							date.getDate().toString().padStart(2, "0")
						].join("-") + "-" + [
							date.getHours().toString().padStart(2, "0") + "h",
							date.getMinutes().toString().padStart(2, "0") + "m",
							date.getSeconds().toString().padStart(2, "0") + "s"
						].join("");

						const link = document.createElement("a");
						const url = URL.createObjectURL(blob);

						link.href = url;
						link.download = `${gameId}_Save${slot}_${formattedDate}.lsd`;

						document.body.appendChild(link);
						link.click();
						link.remove();

						URL.revokeObjectURL(url);

						db.close();
						resolve(true);
					} catch (error) {
						db.close();
						resolve(false);
					}
				};

				objectStoreRequest.onerror = () => {
					db.close();
					resolve(false);
				};

				transaction.onabort = () => {
					db.close();
					resolve(false);
				};
			} catch (error) {
				db.close();
				resolve(false);
			}
		};
	});
}
