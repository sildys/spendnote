// Submit page URLs to IndexNow (Bing, Yandex, Seznam, Naver...).
// Cloudflare Crawler Hints only reports cached static assets, never our HTML pages,
// so page changes have to be pushed from here after a deploy.
// Bing asks for the changed URLs only; it reads the sitemap itself every day,
// and whole-sitemap batches are flagged as a problem in Bing Webmaster Tools.
//
//   node scripts/indexnow.mjs /a /b ...  -> only the given paths (normal use)
//   node scripts/indexnow.mjs --all      -> every URL in sitemap.xml (one-off, e.g. a domain move)
//   add --dry to print without sending

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HOST = 'spendnote.app';
const KEY = '17911d06878280c42f2657255cffaab6';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const all = args.includes('--all');
const paths = args.filter((a) => a !== '--dry' && a !== '--all');

if (!paths.length && !all) {
    console.error('Give the changed paths, e.g. node scripts/indexnow.mjs /daily-cash-report-template');
    console.error('Whole sitemap only with --all.');
    process.exit(1);
}

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
