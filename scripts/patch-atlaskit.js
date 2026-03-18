#!/usr/bin/env node
// @atlaskit/editor-smart-link-draggable@0.1.1 has a typo: SMART_LINK_APPERANCE
// but @atlaskit/editor-plugin-card expects SMART_LINK_APPEARANCE (correct spelling)
// This script adds the missing alias export.

const fs = require('fs');
const path = require('path');
const { globSync } = require('fs').promises ? require('fs') : {};

function findFiles(pattern) {
  const results = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (fullPath.includes('editor-smart-link-draggable') && entry.name === 'index.js') {
          const relative = fullPath.replace(/\\/g, '/');
          if (relative.includes(pattern)) {
            results.push(fullPath);
          }
        }
      }
    } catch {}
  }
  walk(path.join(process.cwd(), 'node_modules'));
  return results;
}

const patches = [
  {
    pattern: 'editor-smart-link-draggable/dist/esm',
    append: '\nexport var SMART_LINK_APPEARANCE = SMART_LINK_APPERANCE;\n',
  },
  {
    pattern: 'editor-smart-link-draggable/dist/cjs',
    append: '\nexports.SMART_LINK_APPEARANCE = exports.SMART_LINK_APPERANCE;\n',
  },
];

for (const { pattern, append } of patches) {
  const files = findFiles(pattern);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('SMART_LINK_APPEARANCE')) {
      fs.appendFileSync(file, append);
      console.log(`Patched: ${file}`);
    }
  }
}
