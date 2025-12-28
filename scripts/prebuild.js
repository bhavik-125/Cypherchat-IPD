const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function prebuild() {
  try {
    console.log('🚀 Starting prebuild process...');
    
    // Check if scripts directory exists
    const scriptsDir = path.join(__dirname);
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    // Check if required modules are installed
    try {
      require('sharp');
      require('fs-extra');
      require('sitemap');
    } catch (e) {
      console.log('📦 Installing required packages...');
      execSync('npm install sharp fs-extra sitemap --no-save', { stdio: 'inherit' });
    }
    
    // Run individual scripts with fallbacks
    try {
      console.log('\n🎨 Generating icons...');
      const { generateIcons } = require('./generate-icons.js');
      await generateIcons();
    } catch (error) {
      console.warn('⚠️  Icon generation failed, continuing without icons:', error.message);
    }
    
    try {
      console.log('\n🗺️  Generating sitemap...');
      const { generateSitemap } = require('./generate-sitemap.js');
      await generateSitemap();
    } catch (error) {
      console.warn('⚠️  Sitemap generation failed:', error.message);
      // Create minimal sitemap
      const minimalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
      fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), minimalSitemap);
    }
    
    try {
      console.log('\n🤖 Generating robots.txt...');
      const { generateRobots } = require('./generate-robots.js');
      await generateRobots();
    } catch (error) {
      console.warn('⚠️  Robots.txt generation failed:', error.message);
      // Create minimal robots.txt
      const minimalRobots = `User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml`;
      fs.writeFileSync(path.join(__dirname, '../public/robots.txt'), minimalRobots);
    }
    
    console.log('\n✅ Prebuild completed successfully!');
    
  } catch (error) {
    console.error('❌ Prebuild failed:', error);
    process.exit(1);
  }
}

// Run prebuild
if (require.main === module) {
  prebuild();
}