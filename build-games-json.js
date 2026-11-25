"use strict";

/**
 * build-games-json.js
 *
 * Scans the frontend/games/ directory and writes a games.json file describing
 * every available game for the game picker. Each sub-directory is treated as
 * one game. The directory name is used as the game ID.
 *
 * Run from the frontend directory:
 *
 *   node build-games-json.js
 *
 * The generated frontend/games/games.json looks like:
 *
 *   {
 *     "games": [
 *       { "id": "mygame", "title": "My Game", "description": "" }
 *     ]
 *   }
 *
 * You can add a "meta.json" file inside each game folder to override the
 * generated title or description, e.g.:
 *
 *   { "title": "My Fancy Game", "description": "A short tagline." }
 */

const fs = require("fs");
const path = require("path");

const GAMES_DIR = path.join(__dirname, "games");
const OUTPUT_FILE = path.join(GAMES_DIR, "games.json");

function readMeta(gamePath) {
	const metaPath = path.join(gamePath, "meta.json");
	try {
		const raw = fs.readFileSync(metaPath, { encoding: "utf8" });
		return JSON.parse(raw);
	} catch (e) {
		return {};
	}
}

function listGameFolders() {
	if (!fs.existsSync(GAMES_DIR)) {
		return [];
	}

	return fs.readdirSync(GAMES_DIR, { withFileTypes: true })
		.filter(entry => entry.isDirectory())
		.map(entry => entry.name)
		.sort();
}

function buildGameList() {
	const folders = listGameFolders();
	return folders.map(id => {
		const meta = readMeta(path.join(GAMES_DIR, id));
		return {
			id,
			title: meta.title || id,
			description: meta.description || ""
		};
	});
}

function main() {
	if (!fs.existsSync(GAMES_DIR)) {
		fs.mkdirSync(GAMES_DIR, { recursive: true });
	}

	const games = buildGameList();
	const output = { games };

	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, "\t") + "\n");

	console.log("Wrote %d game(s) to %s", games.length, OUTPUT_FILE);
	for (const game of games) {
		console.log("  - %s (%s)", game.title, game.id);
	}
}

main();
