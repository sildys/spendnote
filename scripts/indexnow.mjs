// Submit page URLs to IndexNow (Bing, Yandex, Seznam, Naver...).
// Cloudflare Crawler Hints only reports cached static assets, never our HTML pages,
// so page changes have to be pushed from here after a deploy.
//
//   node scripts/indexnow.mjs            -> every URL in sitemap.xml
//   node scripts/indexnow.mjs /a /b ...  -> only the given paths
//   add --dry to print without sending

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HOST = 'spendnote.app';
const KEY = '17911d06878280c42f2657255cffaab6';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((a) => a !== '--dry');

const urls = paths.length
    ? paths.map((p) => new URL(p, `https://${HOST}/`).href)
    : [...readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

console.log(`${urls.length} URL${urls.length === 1 ? '' : 's'}`);
if (dry) {
    console.log(urls.join('\n'));
    process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls })
});
console.log(`IndexNow: HTTP ${res.status} ${res.statusText}`);
const body = await res.text();
if (body) console.log(body);
if (!res.ok && res.status !== 202) process.exit(1);
