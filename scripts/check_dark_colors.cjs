const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchDir(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts') || full.endsWith('.css')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.match(/#(14522d|0f[0-9a-f]{4}|1b[0-9a-f]{4}|1453[0-9a-f]{2}|164e[0-9a-f]{2}|000000|111827|1f2937|374151|4b5563|6b7280)/gi);
      if (matches) {
        console.log(`Found in ${full}:`, matches);
      }
    }
  }
}

searchDir('src');
console.log('Search completed.');

