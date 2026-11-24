
let activeSaveGameId = null;

const saveFileDialog = document.getElementById('saveFileDialog');
const uploadSaveForm = document.getElementById('uploadSaveForm');
const downloadSaveForm = document.getElementById('downloadSaveForm');
const saveFileStatus = document.getElementById('saveFileStatus');

/**
 * Opens the save file manager for the specified game.
 *
 * @param {string} gameId - Identifier of the game.
 */
function openSaveFileManager(gameId) {
	if (!gameId)
		return;

	activeSaveGameId = gameId;
	saveFileStatus.textContent = '';

	if (!saveFileDialog.open)
		saveFileDialog.showModal();
}

/**
 * Closes the save file manager.
 */
function closeSaveFileManager() {
	if (saveFileDialog.open)
		saveFileDialog.close();
}

/**
 * Displays a status message in the save file manager.
 *
 * @param {string} message - Message to display.
 */
function setSaveFileStatus(message) {
	saveFileStatus.textContent = message;
}

/**
 * Handles save file uploads.
 *
 * @param {SubmitEvent} event - Form submission event.
 */
async function submitUploadSaveFile(event) {
	event.preventDefault();

	const form = event.currentTarget;
	const submitButton = form.querySelector('[type="submit"]');
	const file = document.getElementById('uploadSaveFile').files[0];
	const saveSlot = document.getElementById('uploadSaveSlot').value;

	if (!activeSaveGameId || !file || !saveSlot)
		return;

	submitButton.disabled = true;
	setSaveFileStatus('Uploading save file...');

	try {
		const success = await uploadSaveFile(
			activeSaveGameId,
			file,
			saveSlot
		);

		if (success) {
			setSaveFileStatus('Save file uploaded successfully.');
			form.reset();
		} else {
			setSaveFileStatus('Failed to upload save file.');
		}
	} catch (error) {
		setSaveFileStatus('An error occurred while uploading the save file.');
		console.error(error);
	} finally {
		submitButton.disabled = false;
	}
}

/**
 * Handles save file downloads.
 *
 * @param {SubmitEvent} event - Form submission event.
 */
async function submitDownloadSaveFile(event) {
	event.preventDefault();

	const form = event.currentTarget;
	const submitButton = form.querySelector('[type="submit"]');
	const saveSlot = document.getElementById('downloadSaveSlot').value;

	if (!activeSaveGameId || !saveSlot)
		return;

	submitButton.disabled = true;
	setSaveFileStatus('Preparing save file download...');

	try {
		const success = await downloadSaveFile(
			activeSaveGameId,
			saveSlot
		);

		if (success) {
			setSaveFileStatus('Save file download started.');
		} else {
			setSaveFileStatus('Failed to download save file.');
		}
	} catch (error) {
		setSaveFileStatus('An error occurred while downloading the save file.');
		console.error(error);
	} finally {
		submitButton.disabled = false;
	}
}

// Register form submission handlers.
uploadSaveForm.addEventListener('submit', submitUploadSaveFile);
downloadSaveForm.addEventListener('submit', submitDownloadSaveFile);

// Close the dialog when clicking outside its content.
saveFileDialog.addEventListener('click', event => {
	if (event.target === saveFileDialog)
		closeSaveFileManager();
});
