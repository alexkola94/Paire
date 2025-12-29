const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND_PACKAGE_PATH = path.join(__dirname, '../frontend/package.json');
const BACKEND_CSPROJ_PATH = path.join(__dirname, '../backend/YouAndMeExpensesAPI/YouAndMeExpensesAPI.csproj');
const CHANGELOG_PATH = path.join(__dirname, '../CHANGELOG.md');

const type = process.argv[2];
if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: node scripts/bump-version.js <major|minor|patch>');
    process.exit(1);
}

// 1. Read current version from frontend package.json
const packageJson = JSON.parse(fs.readFileSync(FRONTEND_PACKAGE_PATH, 'utf8'));
const currentVersion = packageJson.version;
console.log(`Current version: ${currentVersion}`);

// 2. Calculate new version
let [major, minor, patch] = currentVersion.split('.').map(Number);
if (type === 'major') {
    major++;
    minor = 0;
    patch = 0;
} else if (type === 'minor') {
    minor++;
    patch = 0;
} else {
    patch++;
}
const newVersion = `${major}.${minor}.${patch}`;
console.log(`New version: ${newVersion}`);

// 3. Update frontend package.json
packageJson.version = newVersion;
fs.writeFileSync(FRONTEND_PACKAGE_PATH, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Updated frontend/package.json to ${newVersion}`);

// 4. Update backend .csproj
let csprojContent = fs.readFileSync(BACKEND_CSPROJ_PATH, 'utf8');
const versionRegex = /<Version>(.*?)<\/Version>/;
if (versionRegex.test(csprojContent)) {
    csprojContent = csprojContent.replace(versionRegex, `<Version>${newVersion}</Version>`);
} else {
    // Insert after PropertyGroup start if not exists (simple heuristic)
    csprojContent = csprojContent.replace('<PropertyGroup>', `<PropertyGroup>\n    <Version>${newVersion}</Version>`);
}
fs.writeFileSync(BACKEND_CSPROJ_PATH, csprojContent);
console.log(`Updated backend .csproj to ${newVersion}`);

// 5. Update CHANGELOG.md
const date = new Date().toISOString().split('T')[0];
const newChangelogEntry = `\n## [${newVersion}] - ${date}\n### Changed\n- Bumped version to ${newVersion}\n`;
const changelogContent = fs.readFileSync(CHANGELOG_PATH, 'utf8');
const insertPosition = changelogContent.indexOf('## [');
let newChangelogContent;
if (insertPosition !== -1) {
    newChangelogContent = changelogContent.slice(0, insertPosition) + newChangelogEntry + changelogContent.slice(insertPosition);
} else {
    newChangelogContent = changelogContent + newChangelogEntry;
}
fs.writeFileSync(CHANGELOG_PATH, newChangelogContent);
console.log(`Updated CHANGELOG.md`);

console.log(`\nSuccessfully bumped version to ${newVersion}! 🚀`);
