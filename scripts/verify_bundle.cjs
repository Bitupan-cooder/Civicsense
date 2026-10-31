const fs = require('fs');
const html = fs.readFileSync('bundle.html', 'utf8');
console.log('Contains base64 PNGs:', (html.match(/data:image\/png;base64/g) || []).length);
console.log('Contains /flat-assets/ text:', (html.match(/\/flat-assets\//g) || []).length);
console.log('Bundle file size:', (fs.statSync('bundle.html').size / 1024).toFixed(1), 'KB');

