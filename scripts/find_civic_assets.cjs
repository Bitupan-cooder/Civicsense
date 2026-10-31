const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    for (const item of fs.readdirSync(dir)) {
      if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results.push({ type: 'dir', path: full });
        results = results.concat(walk(full));
      } else {
        results.push({ type: 'file', path: full });
      }
    }
  } catch (e) {}
  return results;
}

const all = walk('.');
const matches = all.filter(x => 
  x.path.toLowerCase().includes('civic') || 
  x.path.toLowerCase().includes('flat')
);
console.log(JSON.stringify(matches, null, 2));

