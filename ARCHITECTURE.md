# Frontend Architecture

The frontend is a vanilla-ES-module application served by the backend.

## Entry points

- `src/picker.js` — bootstraps the game selection page (`index.html`).
- `src/game.js` — bootstraps the dedicated player page (`game.html`).
- `src/account.js` — bootstraps the standalone account/profile page (`account.html`).

## Directory structure

```
src/
  config.js            # Centralized constants and URL helpers
  storage.js           # Safe localStorage wrapper
  url.js               # Game detection from URL path or ?game=
  api-games.js         # Fetch /games/games.json
  api-players.js       # Fetch /api/players
  api-users.js         # Fetch /api/users/<id> (username by account id)
  auth.js              # Auth state and username prompt controller
  chat.js              # Chat UI controller
  multiplayer-api.js   # window.EasyRPGMultiplayer API for the player iframe
  save-storage.js      # IndexedDB save upload/download
  save-dialog.js       # Save dialog controller
  xyz-loader.js        # RPG Maker XYZ decoder
  system-theme.js      # Apply game system theme images as CSS variables
  sprites.js           # Animated sprite loader + sprite picker controller
  page-picker.js       # Picker page implementation
  page-game.js         # Game page implementation
  page-account.js      # Account / public profile page implementation
```

Plus `account.html` at the frontend root (served at `/account` and `/account/<id>`).

## Module responsibilities

- **config** exposes `getServerUrl`, `getApiBaseUrl`, and constants such as refresh intervals.
- **api-*** modules own server communication.
- **api-users** resolves a user's public profile (username) from a 64-bit account id via `GET /api/users/<id>`; surfaced as `EasyRPGMultiplayer.getUsernameById()`.
- **auth** and **chat** are UI controllers instantiated by `page-game.js`.
- **multiplayer-api** builds the public API object exposed to the player iframe.
- **page-game** wires controllers together and forwards chat/name events to the player iframe. It also tracks playtime and flushes it to `POST /api/account/playtime`.
- **page-account** renders `/account` (own profile, incl. private guest UUID and total playtime) or `/account/<id>` (public profile via `GET /api/users/<id>`, never exposing the guest UUID).

## Styling

```
styles/
  variables.css        # Design tokens (colors, spacing, typography)
  base.css             # Reset, layout, header, footer, player iframe
  picker.css           # Game selection page
  chat.css             # Chat, username prompt, message list
  save-dialog.css      # Save file manager dialog
  sprite-picker.css    # Character sprite picker modal
  system.css           # System theme image classes
```

All color/spacing values are tokenized in `variables.css`. Feature sheets reference tokens with `var(--token)`.

## Generated files

`easyrpg-player.*` files are generated artifacts and are never edited by hand.
