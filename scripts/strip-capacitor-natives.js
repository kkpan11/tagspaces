#!/usr/bin/env node
// Strip native binaries from capacitor/www/node_modules before cap sync.
// iOS App Review rejects any standalone executable/library (.node/.dylib/.so)
// outside the main app binary; these files also can't be loaded inside a
// WebView even on Android, so they're pure dead weight.

const fs = require('fs');
const path = require('path');

const TARGET = path.resolve(
  __dirname,
  '..',
  'capacitor',
  'www',
  'node_modules',
);

// Packages that exist solely to ship native bindings — remove wholesale.
// pdfjs-dist optionally pulls @napi-rs/canvas for node-side rendering; the
// browser build doesn't need it.
const NATIVE_ONLY_PACKAGES = [
  '@napi-rs',
  'sharp',
  'fsevents',
  'better-sqlite3',
];

if (!fs.existsSync(TARGET)) {
  console.log('strip-capacitor-natives: target missing, skipping:', TARGET);
  process.exit(0);
}

let removed = 0;
for (const pkg of NATIVE_ONLY_PACKAGES) {
  const dir = path.join(TARGET, pkg);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('strip-capacitor-natives: removed', pkg);
    removed++;
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

for (const file of walk(TARGET)) {
  if (
    file.endsWith('.node') ||
    file.endsWith('.dylib') ||
    file.endsWith('.so')
  ) {
    fs.unlinkSync(file);
    console.log(
      'strip-capacitor-natives: removed',
      path.relative(TARGET, file),
    );
    removed++;
  }
}

console.log(`strip-capacitor-natives: ${removed} item(s) removed`);
