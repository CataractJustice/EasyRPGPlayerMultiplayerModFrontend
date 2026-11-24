/**
 * Uploads an RPG Maker save file to the game's IndexedDB storage.
 *
 * Validates the selected file, reads its contents as an ArrayBuffer,
 * and stores it in the FILE_DATA object store under the specified
 * save slot.
 *
 * The Promise resolves to:
 * - true if the save file is successfully stored.
 * - false if validation, file reading, database access, or the
 *	 IndexedDB transaction fails.
 *
 * @param {string} gameId - Identifier of the game whose save data is being modified.
 * @param {File} file - The selected .lsd save file to upload.
 * @param {number|string} saveSlot - Target save slot number.
 * @returns {Promise<boolean>} Whether the save file was successfully uploaded.
 */
function uploadSaveFile(gameId, file, saveSlot) {
	saveSlot = "" + saveSlot;
	if(saveSlot.length == 1) saveSlot = "0" + saveSlot;
	return new Promise(resolve => {
		if (!file || !saveSlot)
			return resolve(false);

		if (!/\.lsd$/i.test(file.name)) {
			alert("Invalid file format");
			document.getElementById('uploadButton').click();
			return resolve(false);
		}

		const request = indexedDB.open(`/easyrpg/${gameId}/Save`);

		request.onerror = () => resolve(false);
		request.onblocked = () => resolve(false);

		request.onsuccess = () => {
			const db = request.result;
			const reader = new FileReader();

			const closeDatabase = () => db.close();

			reader.onerror = () => {
				closeDatabase();
				resolve(false);
			};

			reader.onload = event => {
				try {
					const saveFile = {
						timestamp: new Date(),
						mode: 33206,
						contents: new Uint8Array(event.target.result)
					};

					const transaction = db.transaction(
						['FILE_DATA'],
						'readwrite'
					);

					transaction.oncomplete = () => {
						closeDatabase();
						resolve(true);
					};

					transaction.onerror = () => {
						closeDatabase();
						resolve(false);
					};

					transaction.onabort = () => {
						closeDatabase();
						resolve(false);
					};

					transaction
						.objectStore('FILE_DATA')
						.put(
							saveFile,
							`/easyrpg/${gameId}/Save/Save${saveSlot}.lsd`
						);

				} catch (error) {
					closeDatabase();
					resolve(false);
				}
			};

			reader.readAsArrayBuffer(file);
		};
	});
}


/**
 * Downloads an RPG Maker save file from the game's IndexedDB storage.
 *
 * Retrieves the specified save slot from the FILE_DATA object store,
 * creates a downloadable Blob, and triggers a browser download.
 * The downloaded filename includes the game ID, save slot, and
 * original save timestamp.
 *
 * The Promise resolves to:
 * - true if the save file is successfully retrieved and the download
 *	 is triggered.
 * - false if validation, database access, retrieval, or download
 *	 preparation fails.
 *
 * @param {string} gameId - Identifier of the game whose save data is being accessed.
 * @param {number|string} saveSlot - Save slot number to download.
 * @returns {Promise<boolean>} Whether the download was successfully triggered.
 */
function downloadSaveFile(gameId, saveSlot) {
	saveSlot = "" + saveSlot;
	if(saveSlot.length == 1) saveSlot = "0" + saveSlot;
	console.log(`Downloading save file ${saveSlot} form game ${gameId}`);
	return new Promise(resolve => {
		if (!saveSlot)
			return resolve(false);

		const request = indexedDB.open(`/easyrpg/${gameId}/Save`);

		request.onerror = () => resolve(false);
		request.onblocked = () => resolve(false);

		request.onsuccess = () => {
			const db = request.result;

			try {
				const transaction = db.transaction(
					['FILE_DATA'],
					'readonly'
				);

				const objectStore = transaction.objectStore('FILE_DATA');

				const objectStoreRequest = objectStore.get(
					`/easyrpg/${gameId}/Save/Save${saveSlot}.lsd`
				);

				objectStoreRequest.onsuccess = () => {
					try {
						const record = objectStoreRequest.result;

						if (!record) {
							alert("Trying to download an empty slot");
							db.close();
							return resolve(false);
						}

						const blob = new Blob(
							[record.contents],
							{ type: 'application/octet-stream' }
						);

						const date = new Date(record.timestamp);

						const formattedDate = [
							date.getFullYear(),
							(date.getMonth() + 1).toString().padStart(2, '0'),
							date.getDate().toString().padStart(2, '0')
						].join('-') + '-' + [
							date.getHours().toString().padStart(2, '0') + 'h',
							date.getMinutes().toString().padStart(2, '0') + 'm',
							date.getSeconds().toString().padStart(2, '0') + 's'
						].join('');

						const link = document.createElement('a');
						const url = URL.createObjectURL(blob);

						link.href = url;
						link.download = `${gameId}_Save${saveSlot}_${formattedDate}.lsd`;

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

