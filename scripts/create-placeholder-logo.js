const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

async function createPlaceholderLogo() {
  const logoPath = path.join(__dirname, '../public/logo.png');
  
  if (fs.existsSync(logoPath)) {
    console.log('✅ logo.png already exists');
    return;
  }
  
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#gradient)"/>
      <text x="256" y="256" font-family="Arial" font-size="120" 
            fill="white" text-anchor="middle" dy=".35em" font-weight="bold">C</text>
      <text x="320" y="256" font-family="Arial" font-size="120" 
            fill="white" text-anchor="middle" dy=".35em" font-weight="bold">C</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(logoPath);
  
  console.log('✅ Created placeholder logo.png');
}

if (require.main === module) {
  createPlaceholderLogo();
}