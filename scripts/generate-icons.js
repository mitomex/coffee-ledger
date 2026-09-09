// アイコン生成用のSVGテンプレート（コーヒー豆のシンプルなアイコン）
const fs = require('fs');
const path = require('path');

const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" fill="#1F1A16" rx="100"/>
  
  <!-- Coffee Bean Shape -->
  <g transform="translate(256, 256)">
    <!-- Bean body -->
    <ellipse cx="0" cy="0" rx="140" ry="180" fill="#8B4513" />
    
    <!-- Center line -->
    <path d="M 0,-170 Q -30,0 0,170 Q 30,0 0,-170" 
          fill="none" 
          stroke="#5D2F0B" 
          stroke-width="8"/>
    
    <!-- Highlight -->
    <ellipse cx="-40" cy="-60" rx="30" ry="50" fill="#A0522D" opacity="0.5"/>
  </g>
  
  <!-- Text (optional) -->
  <text x="256" y="450" font-family="serif" font-size="48" fill="#F7F3EE" text-anchor="middle">
    Coffee
  </text>
</svg>
`;

// SVGをpublicフォルダに保存
const publicDir = path.join(__dirname, '..', 'public');

// SVGアイコンを保存
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);

console.log('✅ Icon files generated successfully!');
console.log('');
console.log('Note: For production, you should generate PNG versions:');
console.log('  - icon-192.png (192x192)');
console.log('  - icon-512.png (512x512)');
console.log('  - apple-touch-icon.png (180x180)');
console.log('');
console.log('You can use online tools like:');
console.log('  - https://realfavicongenerator.net/');
console.log('  - https://favicon.io/favicon-converter/');