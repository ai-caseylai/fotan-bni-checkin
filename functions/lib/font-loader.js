// Font loader for pdf-lib Chinese text support in Cloudflare Pages Functions.
// Fetches NotoSansTC from Google Fonts CDN at runtime, cached in memory.

let cachedFont = null;

const FONT_CDN_URLS = [
  'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Regular.otf',
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-tc@latest/chinese-traditional-400-normal.woff2',
];

export async function loadChineseFont() {
  if (cachedFont) return cachedFont;

  for (const url of FONT_CDN_URLS) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        cachedFont = await resp.arrayBuffer();
        console.log(`Font loaded from CDN (${(cachedFont.byteLength / 1024 / 1024).toFixed(1)}MB): ${url}`);
        return cachedFont;
      }
    } catch (e) {
      console.warn(`CDN font failed: ${url}`, e);
    }
  }

  throw new Error('Cannot load Chinese font from any CDN source');
}
