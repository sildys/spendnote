import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
let count = 0, ok = 0;
let m;
while ((m = re.exec(html))) {
  count++;
  try {
    const j = JSON.parse(m[1].trim());
    ok++;
    console.log('  ✓', j['@type'] || '(unknown type)', '— offers:', j.offers ? j.offers.length : 'n/a');
  } catch (e) {
    console.log('  ✗ INVALID block', count, ':', e.message);
  }
}
console.log(`Total LD-JSON blocks: ${count}, valid: ${ok}`);
