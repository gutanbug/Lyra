#!/bin/bash
# 개발 모드에서 Electron 앱 이름과 아이콘을 Lyra로 교체

ELECTRON_APP="node_modules/electron/dist/Electron.app"
PLIST="$ELECTRON_APP/Contents/Info.plist"
ICON_SRC="build-resources/icon.icns"
ICON_DST="$ELECTRON_APP/Contents/Resources/electron.icns"

if [ ! -f "$PLIST" ]; then
  echo "Electron.app not found, skipping setup"
  exit 0
fi

# 아이콘 교체
if [ -f "$ICON_SRC" ]; then
  cp "$ICON_SRC" "$ICON_DST"
fi

# Info.plist에서 앱 이름 변경
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Lyra" "$PLIST" 2>/dev/null
/usr/libexec/PlistBuddy -c "Set :CFBundleName Lyra" "$PLIST" 2>/dev/null

# macOS 아이콘 캐시 초기화
touch "$ELECTRON_APP"

echo "Electron dev setup: name=Lyra, icon replaced"
