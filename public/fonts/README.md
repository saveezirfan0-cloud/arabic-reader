# Fonts

Fonts are now bundled via npm (`@fontsource/amiri`, `@fontsource/reem-kufi`, `@fontsource-variable/fraunces`) and imported in `src/main.tsx`. This folder is empty by design but kept so Vite's manifest still resolves cleanly.

If you want to swap in different fonts, install another `@fontsource/*` package and update the imports in `src/main.tsx` + the font-family values in `src/styles/globals.css`.
