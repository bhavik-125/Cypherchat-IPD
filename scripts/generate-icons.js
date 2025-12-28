const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const faviconSizes = [16, 32, 64, 128];
const appleSizes = [180, 167, 152, 120, 87, 80, 76, 60];
const maskableSizes = [192, 512];

async function generateIcons() {
  try {
    const sourceIcon = path.join(__dirname, '../public/logo.png');
    
    // Check if source icon exists
    if (!fs.existsSync(sourceIcon)) {
      console.log('⚠️  No logo.png found. Creating placeholder icons...');
      await createPlaceholderIcons();
      return;
    }
    
    // Ensure directories exist
    await fs.ensureDir(path.join(__dirname, '../public/icons'));
    await fs.ensureDir(path.join(__dirname, '../public/images'));
    
    console.log('🎨 Generating icons...');
    
    // Generate PWA icons
    for (const size of iconSizes) {
      await sharp(sourceIcon)
        .resize(size, size)
        .png({ quality: 100 })
        .toFile(path.join(__dirname, `../public/icons/icon-${size}x${size}.png`));
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }
    
    // Generate favicon.ico (multi-size)
    const faviconBuffers = await Promise.all(
      faviconSizes.map(size =>
        sharp(sourceIcon)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );
    
    // Note: Creating .ico files requires additional library
    // For now, create single png favicon
    await sharp(sourceIcon)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
    console.log('✅ Generated favicon-32x32.png');
    
    // Generate Apple touch icons
    for (const size of appleSizes) {
      await sharp(sourceIcon)
        .resize(size, size)
        .png({ quality: 100 })
        .toFile(path.join(__dirname, `../public/icons/apple-icon-${size}x${size}.png`));
      console.log(`✅ Generated apple-icon-${size}x${size}.png`);
    }
    
    // Generate maskable icons
    for (const size of maskableSizes) {
      await sharp(sourceIcon)
        .resize(size, size)
        .extend({
          top: size * 0.1,
          bottom: size * 0.1,
          left: size * 0.1,
          right: size * 0.1,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 100 })
        .toFile(path.join(__dirname, `../public/icons/maskable-icon-${size}x${size}.png`));
      console.log(`✅ Generated maskable-icon-${size}x${size}.png`);
    }
    
    // Generate splash screens for iOS
    await generateSplashScreens(sourceIcon);
    
    console.log('🎉 All icons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

async function createPlaceholderIcons() {
  const sizes = [...iconSizes, ...faviconSizes, ...appleSizes, ...maskableSizes];
  const uniqueSizes = [...new Set(sizes)];
  
  for (const size of uniqueSizes) {
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#6366f1"/>
        <text x="50%" y="50%" font-family="Arial" font-size="${size/5}" 
              fill="white" text-anchor="middle" dy=".3em">CC</text>
      </svg>
    `;
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(__dirname, `../public/icons/icon-${size}x${size}.png`));
  }
  
  console.log('✅ Generated placeholder icons');
}

async function generateSplashScreens(sourceIcon) {
  const splashSizes = [
    { width: 640, height: 1136, name: 'iphone5_splash' },
    { width: 750, height: 1334, name: 'iphone6_splash' },
    { width: 828, height: 1792, name: 'iphonexr_splash' },
    { width: 1125, height: 2436, name: 'iphonex_splash' },
    { width: 1242, height: 2688, name: 'iphonexsmax_splash' },
    { width: 1536, height: 2048, name: 'ipad_splash' },
    { width: 1668, height: 2224, name: 'ipadpro1_splash' },
    { width: 1668, height: 2388, name: 'ipadpro2_splash' },
    { width: 2048, height: 2732, name: 'ipadpro3_splash' },
  ];
  
  await fs.ensureDir(path.join(__dirname, '../public/splash'));
  
  for (const splash of splashSizes) {
    const { width, height, name } = splash;
    const iconSize = Math.min(width, height) * 0.3;
    
    const background = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 }
      }
    }).png().toBuffer();
    
    const icon = await sharp(sourceIcon)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();
    
    await sharp(background)
      .composite([{ input: icon, gravity: 'center' }])
      .png()
      .toFile(path.join(__dirname, `../public/splash/${name}.png`));
    
    console.log(`✅ Generated ${name}.png (${width}x${height})`);
  }
}

// Run the generator
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };