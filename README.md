## Retro Web Launcher

- An easy-to-use retroarch web frontend
- UI design is based on [ES-DE Themes](https://gitlab.com/es-de)
- Emulator code is based on [RetroArch Web Player](https://web.libretro.com/) source

### Features
- ES-DE theme converter: parses theme XML (including include, variants, color schemes, aspect ratios), collects assets, and outputs a JSON per theme.
- Metadata extractor: reads ES-DE system metadata XMLs and generates a compact `src/metadata.json`.
- Next.js app scaffolded for viewing/using the converted data.

### Requirements
- Node.js 18.18+ (recommend 20+)
- npm (or your preferred package manager)

### Install
```sh
npm install
```

### Develop
The dev script sets a default public MSAL client id for local runs.
```sh
npm run dev
```
App build and production start:
```sh
npm run build
npm start
```

### Theme Conversion
Place ES-DE themes under `es-de_themes/<theme-name>/` (each containing a `theme.xml`, optional `capabilities.xml`, and assets). Then run:
```sh
npm run convert-themes
```
Outputs:
- JSON per theme: `public/themes/<theme-name>.json`
- Copied assets: `public/themes/<theme-name>/**` (images, fonts resolved from variables/schemes)

### System Metadata Conversion
Place ES-DE system metadata XMLs under `es-de_repo/system-metadata/`. Then run:
```sh
npm run convert-metadata
```
Outputs a combined file:
- `src/metadata.json`

### Project Structure (high level)
- `es-de_themes/` — Source ES-DE themes (input)
- `es-de_repo/system-metadata/` — ES-DE system metadata XMLs (input)
- `public/themes/` — Converted themes and copied assets (output)
- `scripts/` — Conversion scripts
- `src/` — App and generated `metadata.json`

### Environment
- Dev uses a default `NEXT_PUBLIC_MSAL_CLIENT_ID` via the `dev` script.
- For production, set `NEXT_PUBLIC_MSAL_CLIENT_ID` before `next start` if your app requires it.

### License
MIT © 2025 jack. See `LICENSE`.

### Acknowledgements
- ES-DE and theme authors for formats and assets.
