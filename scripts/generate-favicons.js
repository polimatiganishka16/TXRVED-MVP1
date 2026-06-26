const fs = require('fs');
const path = require('path');

// This script requires the "sharp" package. Install with:
// npm install sharp

async function generate() {
  const sharp = require('sharp');
  const src = path.join(__dirname, '..', 'public', 'logo.jpeg');
  const outPng = path.join(__dirname, '..', 'public', 'favicon.png');

  if (!fs.existsSync(src)) {
    console.error('Source logo not found at', src);
    process.exit(1);
  }

  try {
    // Create a 64x64 PNG favicon (widely supported)
    await sharp(src)
      .resize(64, 64, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(outPng);

    console.log('Generated', outPng);
  } catch (err) {
    console.error('Failed to generate favicon.png:', err);
    process.exit(2);
  }
}

generate();
