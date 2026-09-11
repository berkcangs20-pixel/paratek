// "electron-builder --win dir" never writes app-update.yml (it's meant purely for quick
// local packaging), so a folder build can't check for updates without this file present.
// The nsis/portable targets generate it correctly on their own -- this is only needed here.
const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'app-update.yml');
const content = `provider: github
owner: berkcangs20-pixel
repo: paratek
updaterCacheDirName: paratek-updater
`;

fs.writeFileSync(dest, content, 'utf-8');
console.log('app-update.yml yazildi:', dest);
