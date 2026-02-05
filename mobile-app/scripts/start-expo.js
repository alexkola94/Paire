/**
 * Wrapper to start Expo CLI without passing the project path through the shell.
 * Use when the project path contains "&" (e.g. You&me_Expenses), which breaks
 * npm/node on Windows. This script resolves paths inside Node only.
 * Uses process.cwd() so npm run start always uses the package directory.
 */
const path = require('path');
const { spawn } = require('child_process');

// Use cwd (set by npm to mobile-app) so path with "&" is never parsed by shell.
// Fallback to script dir if expo not found in cwd (e.g. wrong directory).
const fs = require('fs');
let appDir = process.cwd();
const fallbackDir = path.resolve(__dirname, '..');
const cliPathFromCwd = path.join(appDir, 'node_modules', 'expo', 'bin', 'cli');
if (!fs.existsSync(cliPathFromCwd)) {
  appDir = fallbackDir;
}
const cliPath = path.join(appDir, 'node_modules', 'expo', 'bin', 'cli');
const args = ['start', ...process.argv.slice(2)];

const child = spawn(process.execPath, [cliPath, ...args], {
  stdio: 'inherit',
  cwd: appDir,
  shell: false,
});

child.on('exit', (code) => process.exit(code != null ? code : 0));
