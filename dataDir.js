const path = require('path');
const { app } = require('electron');

const DATA_DIR = app.isPackaged
  ? app.getPath('userData')
  : path.join(__dirname, 'data');

module.exports = { DATA_DIR };
