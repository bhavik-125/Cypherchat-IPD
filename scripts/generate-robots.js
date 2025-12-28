const fs = require('fs-extra');
const path = require('path');

async function generateRobots() {
  try {
    console.log('🤖 Generating robots.txt...');
    
    const baseUrl = process.env.SITE_URL || 'https://yourdomain.com';
    
    const robotsContent = `
# ===========================================
# robots.txt for Blockchain Chat Application
# ===========================================
# Last Updated: ${new Date().toISOString().split('T')[0]}
# ===========================================

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /private/
Disallow: /secret/

# Block common bad bots
User-agent: MJ12bot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: rogerbot
Disallow: /

User-agent: dotbot
Disallow: /

User-agent: gigabot
Disallow: /

User-agent: exabot
Disallow: /

User-agent: CCBot
Disallow: /

# Good bots - allow with crawl delay
User-agent: Googlebot
Allow: /
Crawl-delay: 5

User-agent: Bingbot
Allow: /
Crawl-delay: 5

User-agent: Applebot
Allow: /
Crawl-delay: 5

User-agent: DuckDuckBot
Allow: /
Crawl-delay: 10

User-agent: Twitterbot
Allow: /
Crawl-delay: 5

User-agent: FacebookExternalHit
Allow: /
Crawl-delay: 5

User-agent: LinkedInBot
Allow: /
Crawl-delay: 5

# Image bots
User-agent: Googlebot-Image
Allow: /
Allow: /images/
Allow: /icons/
Allow: /splash/
Allow: /favicon.ico

User-agent: Bingbot-Image
Allow: /
Allow: /images/
Allow: /icons/
Allow: /splash/

# Media bots
User-agent: Googlebot-Video
Allow: /

User-agent: Googlebot-News
Allow: /

# PWA resources - always allow
User-agent: *
Allow: /manifest.json
Allow: /service-worker.js
Allow: /icons/
Allow: /splash/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap.xml.gz

# Host directive
Host: ${baseUrl}

# ===========================================
# Additional Notes:
# This is a blockchain chat application.
# Dynamic content is updated frequently.
# Please respect crawl delays.
# ===========================================
    `.trim();
    
    await fs.writeFile(
      path.join(__dirname, '../public/robots.txt'),
      robotsContent
    );
    
    console.log('✅ Generated robots.txt');
    
    // Also generate a simple version for development
    const devRobots = `
User-agent: *
Disallow: /
    `.trim();
    
    await fs.writeFile(
      path.join(__dirname, '../public/robots.dev.txt'),
      devRobots
    );
    
    console.log('✅ Generated robots.dev.txt');
    
  } catch (error) {
    console.error('❌ Error generating robots.txt:', error);
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  generateRobots();
}

module.exports = { generateRobots };