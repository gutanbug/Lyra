#!/bin/bash
# @atlaskit/editor-smart-link-draggable@0.1.1 has a typo: SMART_LINK_APPERANCE
# but @atlaskit/editor-plugin-card expects SMART_LINK_APPEARANCE (correct spelling)
# This script adds the missing alias export.

find node_modules -path '*editor-smart-link-draggable/dist/esm/index.js' | while read f; do
  if ! grep -q 'SMART_LINK_APPEARANCE' "$f"; then
    echo '
export var SMART_LINK_APPEARANCE = SMART_LINK_APPERANCE;' >> "$f"
  fi
done

find node_modules -path '*editor-smart-link-draggable/dist/cjs/index.js' | while read f; do
  if ! grep -q 'SMART_LINK_APPEARANCE' "$f"; then
    echo '
exports.SMART_LINK_APPEARANCE = exports.SMART_LINK_APPERANCE;' >> "$f"
  fi
done
