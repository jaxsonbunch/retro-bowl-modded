# Contributing

Contributions are welcome. Please keep changes focused, follow the existing project structure, and avoid modifying unrelated parts of the game.

## Development Setup

1. Fork the repository.
2. Clone your fork.
3. Run `npm install` to install dependencies.
4. Run `npm start` to start the development server.

## Guidelines

### UI and Design

The mod menu should remain consistent with the existing Retro Bowl visual style.

- Keep the pixel-style typography.
- Keep the blue panel and white borders.
- Match the existing spacing, sizing, alignment, and proportions.
- Avoid modern UI patterns that do not fit the game.
- Do not replace the pixel-art style with generic web UI.
- Do not redesign unrelated parts of the game.

When modifying an existing interface, preserve its appearance unless the change specifically requires otherwise.

### Code and Project Structure

Keep the project organized and avoid adding unnecessary files to the repository root.

- Mod-specific code should remain with the other mod files.
- Game code and assets belong under `html5game/`.
- Starter save data belongs under `saves/`.
- Do not commit temporary files, editor files, build artifacts, or unrelated assets.
- Do not duplicate existing files without a specific reason.
- Keep changes focused and avoid unnecessary rewrites.

### Save Data

Changes involving saves should be handled carefully.

- Preserve compatibility with existing saves whenever possible.
- Validate imported save data before modifying it.
- Do not overwrite unrelated save data.
- Test changes with both existing saves and included starter saves.
- Avoid changing the save format unless necessary.

## Project Structure

`index.html` — Main page and mod menu entry point  
`mod-menu.js` — Mod menu logic and save modifications  
`html5game/` — Game code and assets  
`saves/` — Included starter save data

If the project structure changes, update this section so that it remains accurate.

## Pull Requests

Before opening a pull request:

- Test the changes locally.
- Make sure existing features still work.
- Keep the pull request focused on a specific change or feature.
- Do not include unrelated formatting or file changes.
- Explain what was changed and why.
- Mention anything that could not be fully tested.

For larger changes, open an issue first to discuss the approach before implementing it.

## Issues

Use GitHub Issues to report bugs, broken features, or problems caused by browser updates or save imports.

When reporting a bug, include:

- What happened
- What you expected to happen
- Steps to reproduce the problem
- Browser and version
- Whether the problem involves an existing save or an imported save

Feature requests should explain what you want changed and why it would be useful to the project.