const fs = require('fs-extra');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');

async function generateSitemap() {
  try {
    console.log('🗺️  Generating sitemap...');
    
    const baseUrl = process.env.SITE_URL || 'https://yourdomain.com';
    const pages = [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/chat', changefreq: 'always', priority: 0.9 },
      { url: '/contacts', changefreq: 'weekly', priority: 0.8 },
      { url: '/wallet', changefreq: 'weekly', priority: 0.7 },
      { url: '/settings', changefreq: 'monthly', priority: 0.6 },
      { url: '/help', changefreq: 'monthly', priority: 0.5 },
      { url: '/privacy', changefreq: 'yearly', priority: 0.3 },
      { url: '/terms', changefreq: 'yearly', priority: 0.3 },
    ];
    
    // Create sitemap stream
    const sitemapStream = new SitemapStream({ 
      hostname: baseUrl,
      lastmodDateOnly: true,
      xmlns: {
        news: false,
        xhtml: false,
        image: false,
        video: false,
      }
    });
    
    // Add pages to sitemap
    pages.forEach(page => {
      sitemapStream.write({
        url: page.url,
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: new Date().toISOString().split('T')[0],
      });
    });
    
    sitemapStream.end();
    
    // Generate sitemap
    const sitemap = await streamToPromise(sitemapStream);
    
    // Write uncompressed sitemap
    await fs.writeFile(
      path.join(__dirname, '../public/sitemap.xml'),
      sitemap.toString()
    );
    
    console.log('✅ Generated sitemap.xml');
    
    // Generate compressed sitemap
    const compressed = await streamToPromise(
      sitemapStream.pipe(createGzip())
    ).catch(() => null);
    
    if (compressed) {
      await fs.writeFile(
        path.join(__dirname, '../public/sitemap.xml.gz'),
        compressed
      );
      console.log('✅ Generated sitemap.xml.gz');
    }
    
    // Generate robots.txt
    const robotsTxt = `
# Robots.txt for ${baseUrl}
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /private/

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap.xml.gz

# Crawl-delay: 10
# Googlebot-Image: allow

# Host
Host: ${baseUrl}

# Block specific bots
User-agent: MJ12bot
Disallow: /

User-agent: AhrefsBot
Crawl-delay: 30

# Allow media bots
User-agent: Googlebot-Image
Allow: /images/
Allow: /icons/
Allow: /splash/

User-agent: Bingbot
Allow: /
Crawl-delay: 5

# PWA
User-agent: *
Allow: /manifest.json
Allow: /service-worker.js
Allow: /icons/
    `.trim();
    
    await fs.writeFile(
      path.join(__dirname, '../public/robots.txt'),
      robotsTxt
    );
    
    console.log('✅ Generated robots.txt');
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  generateSitemap();
}

module.exports = { generateSitemap };