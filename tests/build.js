// 生成发布用页面：dist/index.html（去掉 doctype/html/head/body 外壳，发布时平台会自动包上）
// 用法：node tests/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const head = src.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta[^>]*>\s*/g, '');
const body = src.match(/<body>([\s\S]*?)<\/body>/)[1];
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), head.trim() + '\n' + body.trim() + '\n');
console.log('dist/index.html 已生成；脚本：', [...body.matchAll(/src="([^"]+)"/g)].map(m => m[1]).join(' '));
