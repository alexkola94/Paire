/**
 * Auto-detect local IPv4 and write EXPO_PUBLIC_API_URL to .env.
 * Run when your LAN IP changes; then start Expo (e.g. npm run start:tunnel).
 * Usage: node scripts/set-api-url.js   or   npm run env:local
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const API_PORT = process.env.API_PORT || '5038';

/**
 * Get first non-internal IPv4 address from network interfaces.
 * Prefers en0/wlan0-style interfaces; falls back to any non-internal.
 */
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      candidates.push({ name, address: iface.address });
    }
  }

  // Prefer common WiFi/Ethernet names
  const preferred = candidates.find(
    (c) =>
      /^en\d+$/.test(c.name) ||
      /^eth\d+$/.test(c.name) ||
      /^wlan\d+$/.test(c.name)
  );
  return (preferred || candidates[0])?.address || null;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const envPath = path.join(root, '.env');

  const ip = getLocalIPv4();
  if (!ip) {
    console.warn('Could not detect local IPv4. Using localhost.');
  }

  const baseUrl = ip
    ? `http://${ip}:${API_PORT}`
    : `http://localhost:${API_PORT}`;

  let content = '';
  const key = 'EXPO_PUBLIC_API_URL';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
    if (content.includes(key)) {
      content = content.replace(
        new RegExp(`^${key}=.*$`, 'm'),
        `${key}=${baseUrl}`
      );
    } else {
      content = content.trimEnd() + '\n' + `${key}=${baseUrl}\n`;
    }
  } else {
    content = `${key}=${baseUrl}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf8');
  console.log(`Set ${key}=${baseUrl} in .env`);
}

main();
