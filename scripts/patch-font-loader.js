const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'compiled', '@next', 'font', 'dist', 'google', 'loader.js');
if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  if (content.includes('const ext = /\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1];')) {
    content = content.replace(
      'const ext = /\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1];',
      'const ext = (googleFontFileUrl.match(/\\.(woff2?|eot|ttf|otf)(\\?.*)?$/i) || [])[1] || "woff2";'
    );
    fs.writeFileSync(target, content, 'utf8');
    console.log('Font loader patched successfully.');
  }
}

