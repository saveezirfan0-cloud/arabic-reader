# Fonts

Self-hosted fonts power the calm academia aesthetic. Download these and drop the `.woff2` files in this folder. The CSS already references them by these exact filenames.

## Required files

| File                       | Source                                              |
| -------------------------- | --------------------------------------------------- |
| `Amiri-Regular.woff2`      | https://fonts.google.com/specimen/Amiri             |
| `Amiri-Bold.woff2`         | https://fonts.google.com/specimen/Amiri             |
| `ReemKufi-Medium.woff2`    | https://fonts.google.com/specimen/Reem+Kufi         |
| `Fraunces-Variable.woff2`  | https://fonts.google.com/specimen/Fraunces          |

## Quick way to grab them

1. Open each Google Fonts link.
2. Click **Get font** → **Download all**.
3. Use a TTF → WOFF2 converter (e.g. https://cloudconvert.com/ttf-to-woff2) or `fonttools`:
   ```bash
   pip install fonttools brotli
   pyftsubset Amiri-Regular.ttf --output-file=Amiri-Regular.woff2 --flavor=woff2 --unicodes="U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF"
   ```
4. Place the `.woff2` files directly in this folder.

## Until you add them

The site still works — it falls back to system fonts (`Noto Naskh Arabic` for Arabic, `Georgia` for Latin). The aesthetic is muted but functional. Add the real fonts when ready.

## Why self-hosted?

Privacy + offline PWA support + no Google Fonts CDN dependency. The first paint is measurably faster too.
