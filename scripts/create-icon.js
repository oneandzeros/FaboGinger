/**
 * 将 PNG 图标转换为 ICO 格式
 * 需要安装: npm install -g png-to-ico
 * 或者使用在线工具: https://convertio.co/zh/png-ico/
 */

const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../public/FABO.png');
const icoPath = path.join(__dirname, '../build/icon.ico');

// 检查 PNG 文件是否存在
if (!fs.existsSync(pngPath)) {
  console.error('错误: 找不到 FABO.png 文件');
  process.exit(1);
}

// 确保 build 目录存在
const buildDir = path.dirname(icoPath);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('提示: 需要将 FABO.png 转换为 icon.ico');
console.log('请使用以下方法之一:');
console.log('');
console.log('方法1: 在线转换工具');
console.log('  - https://convertio.co/zh/png-ico/');
console.log('  - https://www.icoconverter.com/');
console.log('  - 上传 public/FABO.png');
console.log('  - 下载并保存到 build/icon.ico');
console.log('');
console.log('方法2: 使用 ImageMagick (如果已安装)');
console.log('  convert public/FABO.png -resize 256x256 build/icon.ico');
console.log('');
console.log('方法3: 手动复制');
console.log('  如果只是测试，可以复制 PNG 文件:');
console.log(`  cp ${pngPath} ${icoPath}`);
console.log('  注意: 这只是一个临时方案，正式发布需要真正的 ICO 格式');

// 如果用户想先测试，可以尝试复制 PNG
const usePngAsIco = process.argv.includes('--use-png');
if (usePngAsIco) {
  fs.copyFileSync(pngPath, icoPath);
  console.log('\n已复制 PNG 文件作为临时图标 (仅用于测试)');
}

