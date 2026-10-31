const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Check for dark colors
  const darkRegex = /(#1[0-4][0-9a-f]{4}|#0[0-9a-f]{5}|text-slate-[89]00|text-gray-[89]00|text-zinc-[89]00|text-neutral-[89]00|text-stone-[89]00|text-green-[89]00|text-emerald-[89]00)/gi;
  let match;
  while ((match = darkRegex.exec(content)) !== null) {
    console.log(`${filePath}: matched dark token "${match[0]}" at line ${content.substring(0, match.index).split('\n').length}`);
  }
}

function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts') || full.endsWith('.css')) {
      checkFile(full);
    }
  }
}

walk('src');
console.log('Finished checking src files.');

