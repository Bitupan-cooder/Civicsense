const fs = require('fs');
const html = fs.readFileSync('bundle.html', 'utf8');

const regex = /.{0,30}\/flat-assets\/.{0,50}/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Match:', JSON.stringify(m[0]));
}

