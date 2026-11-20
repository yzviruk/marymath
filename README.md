# MaryMath

Гейміфікований тренажер з математики для 2 класу (сингапурська методика), PWA для Android-планшета.

- Застосунок: https://yzviruk.github.io/marymath/
- Код: `app/` (Vite + React + TypeScript, vite-plugin-pwa, IndexedDB)
- Макети: `design/project/*.dc.html`

```bash
cd app
npm install
npm run dev        # http://localhost:5173/marymath/
npm test           # Vitest
npm run e2e        # Playwright, планшет 1280×800
```

Кожен push у `main` проганяє тести і публікує збірку на GitHub Pages.
