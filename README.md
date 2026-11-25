# EasyRPG Multiplayer Frontend

This folder contains the web frontend for EasyRPG Multiplayer.

## Important URL scheme

Games are accessed with:

```
https://example.com/?game=gamename
```

When no `?game=` parameter is present, `index.html` shows the game picker.
When `?game=` is present, it shows the game UI and loads the EasyRPG Player.

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

This JSON file is read by `gamepicker.js` to render the picker cards.

## Configuration

Edit `frontend/src/settings.js` or set global window variables before the scripts load:

```html
<script>
  window.__SERVER_URL__ = "wss://example.com";
  window.__API_BASE_URL__ = "https://example.com";
</script>
```

By default the frontend auto-detects the current origin for both WebSocket and REST API calls.
