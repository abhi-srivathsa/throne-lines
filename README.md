# Throne Lines

An original static website for exploring Westeros bloodlines, screen eras, books, and Iron Throne succession.

## Run locally

```bash
npm start
```

Then open `http://localhost:4173`.

## Build check

```bash
npm run build
```

The build step validates that relationship and throne references point to known people.

## Portraits

```bash
npm run sync-portraits
```

Portrait metadata is generated into `src/portraits.js`. The site uses public wiki thumbnails for available show and book/lore images, plus project-local generated portraits for characters without reliable source imagery. Every character also has a local trait-based SVG fallback under `assets/portraits/generated/`.

## Notes

- Visual backdrop and procedural music are original assets created for this project.
- Names and lineage facts are used for an unofficial lore guide.
- Sourced show/book images are loaded from credited remote wiki thumbnails; generated portraits are bundled locally.
