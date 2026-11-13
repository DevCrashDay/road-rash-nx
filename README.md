# Road Rash — Web Switch NRO Builder (GitHub Pages)

Static client-side web app that lets players drag & drop their original 1996
Road Rash PC CD image (`.iso`, `.mdf`, `.bin`+`.cue`, or extracted CD folder)
and generate `roadrash_switch.nro` locally in their browser with zero server
uploads and zero copyrighted assets hosted in git.

## Deploy to GitHub Pages

1. Copy the contents of `gh-pages-builder/` (or point GitHub Pages at `docs/` or
   the `gh-pages` branch containing these files):
   - `index.html`
   - `style.css`
   - `app.js`
   - `iso_romfs.js`
   - `icon.jpg`
   - `roadrash_base.nro` (~10.2 MB, asset-free homebrew binary)
2. Push to GitHub and enable **Settings → Pages**.

## Local Testing

Open a local static server inside `gh-pages-builder/` (needed because browsers
block `fetch('./roadrash_base.nro')` over `file://`):

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.
