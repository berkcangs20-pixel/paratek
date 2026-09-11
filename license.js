const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { DATA_DIR } = require('./dataDir');

const LICENSE_PATH = path.join(DATA_DIR, 'license.json');

// Public key only — safe to ship. Signatures can only be verified here, never created.
// The matching private key is kept offline by the developer and is never part of this repo.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAdwY9hyjfilL2OrtB2gzeyANRBs7dd+UUY7xZxQejst8=
-----END PUBLIC KEY-----`;

function getMachineId() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf-8' });
      const match = out.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/);
      if (match) return match[1].toUpperCase();
    }
  } catch (e) {
    // fall through to the hostname-based fallback below
  }
  return crypto.createHash('sha256').update(os.hostname()).digest('hex').slice(0, 32).toUpperCase();
}

function verifySignature(machineId, licenseKey) {
  try {
    const signature = Buffer.from((licenseKey || '').trim(), 'base64');
    const publicKey = crypto.createPublicKey(PUBLIC_KEY_PEM);
    return crypto.verify(null, Buffer.from(machineId), publicKey, signature);
  } catch (e) {
    return false;
  }
}

function readStoredLicense() {
  try {
    return JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf-8'));
  } catch (e) {
    return null;
  }
}

module.exports = {
  getMachineId,
  hasValidLicense() {
    const stored = readStoredLicense();
    if (!stored || !stored.key) return false;
    const machineId = getMachineId();
    if (stored.machineId !== machineId) return false;
    return verifySignature(machineId, stored.key);
  },
  activate(licenseKey) {
    const machineId = getMachineId();
    if (!verifySignature(machineId, licenseKey)) {
      throw new Error('Geçersiz lisans anahtarı. Lütfen makine kimliğinizle eşleşen doğru anahtarı girin.');
    }
    fs.mkdirSync(path.dirname(LICENSE_PATH), { recursive: true });
    fs.writeFileSync(LICENSE_PATH, JSON.stringify({ machineId, key: licenseKey.trim() }, null, 2), 'utf-8');
    return true;
  },
};
