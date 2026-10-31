const fs = require('fs');
const path = require('path');

const dir = 'Flat Assets/civic';
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir);
  console.log('Files in Flat Assets/civic:', files);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    console.log(`${f}: size = ${stat.size} bytes`);
  }
} else {
  console.log('Flat Assets/civic does not exist');
}

