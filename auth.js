const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./dataDir');

const AUTH_PATH = path.join(DATA_DIR, 'auth.json');

function readAuth() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_PATH, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function writeAuth(data) {
  fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true });
  fs.writeFileSync(AUTH_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function hash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

module.exports = {
  hasPassword() {
    return readAuth() !== null;
  },
  setPassword(password) {
    if (!password || password.length < 4) throw new Error('Şifre en az 4 karakter olmalıdır.');
    const salt = crypto.randomBytes(16).toString('hex');
    writeAuth({ salt, hash: hash(password, salt) });
    return true;
  },
  verifyPassword(password) {
    const auth = readAuth();
    if (!auth) return false;
    const candidate = hash(password || '', auth.salt);
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(auth.hash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  },
  changePassword(oldPassword, newPassword) {
    if (!module.exports.verifyPassword(oldPassword)) throw new Error('Mevcut şifre hatalı.');
    if (!newPassword || newPassword.length < 4) throw new Error('Yeni şifre en az 4 karakter olmalıdır.');
    module.exports.setPassword(newPassword);
    return true;
  },
};
