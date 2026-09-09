const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await page.goto(`file://${path.join(__dirname, '..', 'public', 'simple-icon.html')}`);
    await page.waitForSelector('#icon192');
    
    // Generate 192x192 icon
    const icon192 = await page.$('#icon192');
    await icon192.screenshot({
      path: path.join(__dirname, '..', 'public', 'icon-192.png'),
      omitBackground: false
    });
    
    // Generate 512x512 icon
    const icon512 = await page.$('#icon512');
    await icon512.screenshot({
      path: path.join(__dirname, '..', 'public', 'icon-512.png'),
      omitBackground: false
    });
    
    // Generate Apple touch icon (180x180)
    const apple180 = await page.$('#apple180');
    await apple180.screenshot({
      path: path.join(__dirname, '..', 'public', 'apple-touch-icon.png'),
      omitBackground: false
    });
    
    console.log('✅ PNG icons generated successfully!');
    console.log('  - icon-192.png');
    console.log('  - icon-512.png');
    console.log('  - apple-touch-icon.png');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.log('\nManual alternative:');
    console.log('1. Open public/simple-icon.html in your browser');
    console.log('2. Right-click each canvas and save as PNG:');
    console.log('   - First canvas → icon-192.png');
    console.log('   - Second canvas → icon-512.png');
    console.log('   - Third canvas → apple-touch-icon.png');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

generateIcons();