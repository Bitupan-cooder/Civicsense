import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

console.log('=== Hallmark Anti-Slop Linter (sloplint) ===');
console.log(`Scanning project root: ${projectRoot}\n`);

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === 'dist' || f === '.git' || f === '.agents') continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      res.push(...walk(p));
    } else if (/\.(tsx|ts|html|css)$/.test(f)) {
      res.push(p);
    }
  }
  return res;
}

const files = walk(path.join(projectRoot, 'src')).concat([
  path.join(projectRoot, 'index.html'),
]);

const checks = [
  {
    id: 'BANNED_DARK_TEXT',
    desc: 'Banned dark black or grey text colors (#0E1217, #14181F, #000000, text-black, text-gray)',
    pattern: /0E1217|14181F|#000000|text-black|text-gray|text-neutral/i,
    severity: 'FAIL',
  },
  {
    id: 'RAW_GLUED_ARROWS',
    desc: 'Glued Unicode arrow link text (e.g., "TEXT →")',
    pattern: />[^<]*\b[A-Za-z0-9]+\s*→[^<]*</,
    severity: 'WARN',
  },
  {
    id: 'BRACKETED_EYEBROWS',
    desc: 'Bracketed uppercase tracking eyebrows in UI (e.g., "[ 03 / DIRECTORY ]")',
    pattern: />\s*\[\s*[0-9A-Z\s·/–-]{3,}\s*\]\s*</,
    severity: 'WARN',
  },
  {
    id: 'PULSING_RADAR_DOTS',
    desc: 'Excessive decorative pinging radar dots (animate-ping on non-live elements)',
    pattern: /animate-ping/,
    severity: 'INFO',
  },
];

let issues = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(projectRoot, file);

  lines.forEach((line, idx) => {
    checks.forEach((chk) => {
      if (chk.pattern.test(line)) {
        issues.push({
          file: relPath,
          lineNum: idx + 1,
          line: line.trim(),
          ...chk,
        });
      }
    });
  });
}

console.log(`Audited ${files.length} source files.`);

const fails = issues.filter((i) => i.severity === 'FAIL');
const warns = issues.filter((i) => i.severity === 'WARN');
const infos = issues.filter((i) => i.severity === 'INFO');

console.log(`Audit Summary:`);
console.log(`  FAIL (Critical Floor Violations): ${fails.length}`);
console.log(`  WARN (Anti-Pattern Clichés):     ${warns.length}`);
console.log(`  INFO (Decorative Badges):         ${infos.length}\n`);

if (issues.length > 0) {
  console.log('--- Detailed Findings ---');
  issues.forEach((iss) => {
    console.log(`[${iss.severity}] ${iss.file}:${iss.lineNum} - ${iss.desc}`);
    console.log(`   > ${iss.line.slice(0, 100)}`);
  });
} else {
  console.log('✨ All Hallmark quality gates passed! Clean human-grade design.');
}
