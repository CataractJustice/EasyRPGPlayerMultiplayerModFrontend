/**
 * Safe localStorage helpers that silently fail when storage is unavailable.
 */

export function loadItem(key) {
	try {
		return localStorage.getItem(key) || null;
	} catch (_) {
		return null;
	}
}

export function saveItem(key, value) {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch (_) {
		return false;
	}
}

export function removeItem(key) {
	try {
		localStorage.removeItem(key);
		return true;
	} catch (_) {
		return false;
	}
}
