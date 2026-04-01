# April Fools Maze

A tiny browser game where the maze is fair, but the controls are not.

## What it does

- Lets the player clear 3 procedural 2D maze levels
- Reverses the arrow keys and `WASD` controls for an April Fools twist
- Ends with a fake reward screen that turns into a playful jump-scare gag
- Can run as a Render web service with a tiny Node server

## Run it locally

### Browser only

Open `index.html` in a browser.

### Node web server

```bash
npm start
```

Then open `http://localhost:3000`.

## Deploy to Render as a Web Service

This repo now includes:

- `server.js` to serve the game files
- `package.json` with the Render start script
- `render.yaml` for a simple Render Blueprint

### Dashboard setup

Create a new `Web Service` in Render and use:

- Build Command: `npm install`
- Start Command: `npm start`

Render will provide the `PORT` environment variable automatically, and `server.js` uses it.

### Blueprint setup

If you create the service from the repo's `render.yaml`, it will use the free Node web service settings already included.

## Files

- `index.html` - layout and UI
- `style.css` - visuals, responsive styling, and prank effects
- `script.js` - maze generation, game logic, reversed controls, and finale
- `server.js` - tiny Node server for Render web service deployment
- `render.yaml` - optional Render Blueprint config
