import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const htmlFile = path.join(distDir, 'index.html');
const outputFile = path.join(projectRoot, 'bundle.html');

if (!fs.existsSync(htmlFile)) {
  console.error('dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

let html = fs.readFileSync(htmlFile, 'utf8');

// Inline CSS
html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
  const cssPath = path.join(distDir, href.replace(/^\//, ''));
  if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf8');
    // Replace font URLs with base64 if needed, or relative asset paths
    css = css.replace(/url\((['"]?)([^'"()]+)\1\)/g, (m, quote, fontUrl) => {
      const assetPath = path.join(distDir, fontUrl.replace(/^\//, ''));
      if (fs.existsSync(assetPath)) {
        const ext = path.extname(assetPath).slice(1);
        const mime = ext === 'woff2' ? 'font/woff2' : ext === 'woff' ? 'font/woff' : 'application/octet-stream';
        const b64 = fs.readFileSync(assetPath).toString('base64');
        return `url("data:${mime};base64,${b64}")`;
      }
      return m;
    });
    return `<style>\n${css}\n</style>`;
  }
  return match;
});

// Inline JS
html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
  const jsPath = path.join(distDir, src.replace(/^\//, ''));
  if (fs.existsSync(jsPath)) {
    const js = fs.readFileSync(jsPath, 'utf8');
    return `<script type="module">\n${js}\n</script>`;
  }
  return match;
});

// Inline all referenced public assets (SVGs, PNGs) from /flat-assets/ and /illustrations/
html = html.replace(/['"`](\/(?:flat-assets|illustrations)\/[^'"`\\]+\.(?:svg|png|jpg|jpeg))['"`]/gi, (match, assetPath) => {
  const fullPath = path.join(projectRoot, 'public', assetPath.replace(/^\//, ''));
  if (fs.existsSync(fullPath)) {
    const ext = path.extname(fullPath).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
    const b64 = fs.readFileSync(fullPath).toString('base64');
    return `"data:${mime};base64,${b64}"`;
  }
  return match;
});

fs.writeFileSync(outputFile, html, 'utf8');
console.log(`Successfully generated self-contained bundle.html (${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB)`);
