const sh = require('shelljs');
const fs = require('fs');
const path = require('path');
const { version, productName } = require('../release/app/package.json');

if (!sh.which('git')) {
  sh.echo('Sorry, this script requires git');
  sh.exit(1);
}

// CFBundleShortVersionString / Android versionName must be plain dot-separated
// numeric. Strip "-beta", "-rc.1" or any other pre-release suffix.
const cleanVersion = version.replace(/-.*$/, '');

// Monotonic build number derived from git history. Same commit always yields
// the same number; the count only goes up as you add commits, so CI reruns and
// re-archives never drift. Apple/Play accept simple integers here.
let buildNumber = sh
  .exec('git rev-list --count HEAD', { silent: true })
  .stdout.trim();
if (!buildNumber) buildNumber = '1';

const buildTime = new Date().toISOString();
const lastCommitId = sh
  .exec('git log --format="%H" -n 1', { silent: true })
  .stdout.trim();

// --- renderer version.json ---
const versionJsonPath = path.resolve(
  __dirname,
  '..',
  'src/renderer/version.json',
);
fs.writeFileSync(
  versionJsonPath,
  JSON.stringify(
    {
      commitId: lastCommitId,
      buildTime,
      version,
      name: productName,
    },
    null,
    2,
  ) + '\n',
);
sh.echo(`versionmeta: wrote src/renderer/version.json → ${version}`);

// --- Capacitor iOS Xcode project ---
const pbxproj = path.resolve(
  __dirname,
  '..',
  'capacitor/ios/App/App.xcodeproj/project.pbxproj',
);
if (fs.existsSync(pbxproj)) {
  let s = fs.readFileSync(pbxproj, 'utf8');
  s = s.replace(
    /MARKETING_VERSION\s*=\s*[^;]+;/g,
    `MARKETING_VERSION = ${cleanVersion};`,
  );
  s = s.replace(
    /CURRENT_PROJECT_VERSION\s*=\s*[^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${buildNumber};`,
  );
  fs.writeFileSync(pbxproj, s);
  sh.echo(
    `versionmeta: synced iOS Xcode project → ${cleanVersion} (${buildNumber})`,
  );
}

// Android versionName / versionCode are intentionally NOT touched here.
// The Play-Store-bound builds are produced by external script, which
// owns a semver-derived versionCode scheme (major*10000+minor*100+patch) and
// bumps Pro by +1 so it outranks the same-version Lite for in-place upgrades.
// Overwriting from here would clobber both pieces and risk downgrading below
// already-shipped versionCodes (which Play rejects). Dev `cap run android`
// uses the build.gradle placeholders, which is fine — those builds don't go
// to Play.
