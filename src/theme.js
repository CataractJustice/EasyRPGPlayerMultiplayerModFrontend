/**
 * Theme toggle controller.
 *
 * Mirrors Yumebooru's approach: persist the choice in localStorage under
 * `site-theme` and toggle the `html.light` class accordingly. Defaults to
 * dark mode. The toggle is theme-aware: sun for light mode (click to switch
 * to light) and moon for dark mode (click to switch to dark), matching the
 * common icon convention used by the reference site.
 */

const STORAGE_KEY = "site-theme";

export function initTheme() {
	const saved = localStorage.getItem(STORAGE_KEY);
	const prefersLight = saved === "light";

	if (prefersLight) {
		document.documentElement.classList.add("light");
	}

	const button = document.getElementById("theme-toggle");
	if (!button) {
		return;
	}

	button.setAttribute("aria-pressed", String(prefersLight));
	button.setAttribute("aria-label", prefersLight ? "Switch to dark theme" : "Switch to light theme");

	button.addEventListener("click", () => {
		const root = document.documentElement;
		const isLight = root.classList.toggle("light");

		localStorage.setItem(STORAGE_KEY, isLight ? "light" : "dark");
		button.setAttribute("aria-pressed", String(isLight));
		button.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
	});
}
