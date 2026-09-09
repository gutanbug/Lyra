import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import { SettingsManager } from './settings/store';

export type IconVariant = 'dark' | 'light';

const ICON_FILENAMES: Record<IconVariant, string> = {
  dark: 'icon.png',
  light: 'icon-light.png',
};

export function getIconPath(variant: IconVariant): string {
  // 패키징된 앱에서는 build-resources가 asar 밖 resources/build-resources로 복사된다
  // (package.json build.extraResources). 개발 모드에서는 프로젝트 루트 기준 상대 경로 사용.
  const baseDir = app.isPackaged
    ? path.join(process.resourcesPath, 'build-resources')
    : path.join(__dirname, '../build-resources');
  return path.join(baseDir, ICON_FILENAMES[variant]);
}

/** 실행 중인 창/Dock 아이콘에 즉시 반영. 설치된 앱 자체(Finder/작업표시줄 고정) 아이콘은
 *  빌드 시점에 electron-builder가 굽는 것이라 런타임 변경 대상이 아니다. */
export function applyIconVariant(variant: IconVariant): void {
  const image = nativeImage.createFromPath(getIconPath(variant));
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(image);
  }
  BrowserWindow.getAllWindows().forEach((win) => win.setIcon(image));
}

export function getStoredIconVariant(): IconVariant {
  return SettingsManager.getIconVariant();
}
