# EasyRPG Multiplayer Frontend

This folder contains the web frontend for EasyRPG Multiplayer.

It is intended to be served by the [hisui-gaming-server](https://github.com/hujle/hisui-gaming-server) backend, which handles HTTP routing, static assets, WebSocket multiplayer, and player counts.

## Important URL scheme

When served by the backend, games have their own dedicated pages:

```
https://example.com/                  -> Game selection page
https://example.com/yumenikki/      -> Yume Nikki player page
https://example.com/<game-name>/    -> Player page for that game
```

The game selection page is `index.html`. It does **not** load or initialize the EasyRPG player.

The player page is `game.html`. It initializes the player for the game discovered from the URL path (with `?game=` still supported as a fallback).

## Game folder layout

Place game folders under `frontend/games/`:

```
frontend/games/
  gamename/
    gamefiles/...
    meta.json
```

You can optionally add a `meta.json` inside a game folder to override the picker display:

```json
{
  "title": "My Fancy Game",
  "description": "A short tagline."
}
```

## Generating the game list

After adding/removing games, regenerate `frontend/games/games.json`:

```bash
cd frontend
node build-games-json.js
```

This JSON file is read by `gamepicker.js` to render the picker cards. The backend discovers available game routes from the same directory, so the generated list and backend routing stay in sync.

## Configuration

Edit `frontend/src/settings.js` or set global window variables before the scripts load:

```html
<script>
  window.__SERVER_URL__ = "wss://example.com";
  window.__API_BASE_URL__ = "https://example.com";
</script>
```

By default the frontend auto-detects the current origin for both WebSocket and REST API calls.
