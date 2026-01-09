# Favicon Setup

## Elkészült fájlok:
- `favicon.svg` - Modern SVG favicon (minden modern böngésző támogatja)

## favicon.ico létrehozása:

A `favicon.ico` fájl létrehozásához használd az alábbi módszerek egyikét:

### 1. Online konverter (legegyszerűbb):
1. Nyisd meg: https://favicon.io/favicon-converter/
2. Töltsd fel a `favicon.svg` fájlt
3. Töltsd le a generált `favicon.ico` fájlt
4. Helyezd a projekt gyökérkönyvtárába

### 2. ImageMagick (ha telepítve van):
```bash
magick convert favicon.svg -define icon:auto-resize=16,32,48 favicon.ico
```

### 3. GIMP (ingyenes szoftver):
1. Nyisd meg a `favicon.svg` fájlt GIMP-ben
2. Exportáld `.ico` formátumban
3. Válaszd ki a 16x16, 32x32, 48x48 méreteket

## Megjegyzés:
A modern böngészők (Chrome, Firefox, Safari, Edge) már az SVG favicon-t használják,
így a `.ico` fájl csak a régebbi böngészők támogatásához szükséges.
