import { uploadSaveFile, downloadSaveFile } from "./save-storage.js";

/**
 * Controller for the save file upload/download dialog.
 */
export class SaveDialogController {
	#gameId = null;
	#elements = {};

	/**
	 * @param {Object} elements - DOM element references.
	 * @param {HTMLDialogElement} elements.dialog
	 * @param {HTMLFormElement} elements.uploadForm
	 * @param {HTMLFormElement} elements.downloadForm
	 * @param {HTMLInputElement} elements.uploadFile
	 * @param {HTMLSelectElement} elements.uploadSlot
	 * @param {HTMLSelectElement} elements.downloadSlot
	 * @param {HTMLElement} elements.status
	 */
	constructor(elements) {
		this.#elements = elements;

		this.#elements.uploadForm.addEventListener("submit", (event) =>
			this.#onUpload(event)
		);
		this.#elements.downloadForm.addEventListener("submit", (event) =>
			this.#onDownload(event)
		);

		this.#elements.dialog.addEventListener("click", (event) => {
			if (event.target === this.#elements.dialog) {
				this.close();
			}
		});
	}

	open(gameId) {
		if (!gameId) return;

		this.#gameId = gameId;
		this.#setStatus("");

		if (!this.#elements.dialog.open) {
			this.#elements.dialog.showModal();
		}
	}

	close() {
		if (this.#elements.dialog.open) {
			this.#elements.dialog.close();
		}
	}

	#setStatus(message) {
		this.#elements.status.textContent = message;
	}

	async #onUpload(event) {
		event.preventDefault();

		const file = this.#elements.uploadFile.files[0];
		const slot = this.#elements.uploadSlot.value;

		if (!this.#gameId || !file || !slot) return;

		const button = this.#elements.uploadForm.querySelector("[type='submit']");
		button.disabled = true;
		this.#setStatus("Uploading save file...");

		try {
			const success = await uploadSaveFile(this.#gameId, file, slot);

			if (success) {
				this.#setStatus("Save file uploaded successfully.");
				this.#elements.uploadForm.reset();
			} else {
				this.#setStatus("Failed to upload save file.");
			}
		} catch (error) {
			this.#setStatus("An error occurred while uploading the save file.");
			console.error(error);
		} finally {
			button.disabled = false;
		}
	}

	async #onDownload(event) {
		event.preventDefault();

		const slot = this.#elements.downloadSlot.value;

		if (!this.#gameId || !slot) return;

		const button = this.#elements.downloadForm.querySelector("[type='submit']");
		button.disabled = true;
		this.#setStatus("Preparing save file download...");

		try {
			const success = await downloadSaveFile(this.#gameId, slot);

			if (success) {
				this.#setStatus("Save file download started.");
			} else {
				this.#setStatus("Failed to download save file.");
			}
		} catch (error) {
			this.#setStatus("An error occurred while downloading the save file.");
			console.error(error);
		} finally {
			button.disabled = false;
		}
	}
}
