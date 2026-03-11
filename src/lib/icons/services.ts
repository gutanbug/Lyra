import React from 'react';

/**
 * 서비스별 인라인 SVG 아이콘
 * Electron production 빌드에서 이미지 경로(process.env.PUBLIC_URL) 문제를 방지하기 위해
 * 외부 이미지 대신 인라인 SVG React 엘리먼트를 사용합니다.
 */

/** Jira 로고 SVG */
function renderJiraIcon(size: number): React.ReactElement {
  return React.createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 256 256', fill: 'none' },
    React.createElement('defs', null,
      React.createElement('linearGradient', { id: 'jira-g1', x1: '98.03%', y1: '0.22%', x2: '58.17%', y2: '40.18%' },
        React.createElement('stop', { offset: '0.18', stopColor: '#0052CC', stopOpacity: 0 }),
        React.createElement('stop', { offset: '1', stopColor: '#0052CC' }),
      ),
      React.createElement('linearGradient', { id: 'jira-g2', x1: '100.17%', y1: '0.08%', x2: '55.76%', y2: '44.42%' },
        React.createElement('stop', { offset: '0.18', stopColor: '#0052CC', stopOpacity: 0 }),
        React.createElement('stop', { offset: '1', stopColor: '#0052CC' }),
      ),
    ),
    React.createElement('path', {
      d: 'M244.658 0H121.707a55.502 55.502 0 0 0 55.502 55.502h22.642V77.37c.02 30.625 24.84 55.447 55.462 55.502V10.666C255.313 4.777 250.536 0 244.658 0Z',
      fill: '#2684FF',
    }),
    React.createElement('path', {
      d: 'M183.822 61.262H60.872c.019 30.625 24.84 55.447 55.462 55.502h22.642v21.868c.02 30.597 24.797 55.408 55.393 55.497V71.928c0-5.891-4.776-10.666-10.547-10.666Z',
      fill: '#2684FF',
    }),
    React.createElement('path', {
      d: 'M183.822 61.262H60.872c.019 30.625 24.84 55.447 55.462 55.502h22.642v21.868c.02 30.597 24.797 55.408 55.393 55.497V71.928c0-5.891-4.776-10.666-10.547-10.666Z',
      fill: 'url(#jira-g1)',
    }),
    React.createElement('path', {
      d: 'M122.943 122.528H0c.02 30.625 24.84 55.447 55.462 55.502h22.686v21.868c.02 30.597 24.797 55.408 55.393 55.497V133.193c0-5.891-4.776-10.665-10.598-10.665Z',
      fill: '#2684FF',
    }),
    React.createElement('path', {
      d: 'M122.943 122.528H0c.02 30.625 24.84 55.447 55.462 55.502h22.686v21.868c.02 30.597 24.797 55.408 55.393 55.497V133.193c0-5.891-4.776-10.665-10.598-10.665Z',
      fill: 'url(#jira-g2)',
    }),
  );
}

type IconRenderer = (size: number) => React.ReactElement;

const SERVICE_ICONS: Record<string, IconRenderer> = {
  jira: renderJiraIcon,
};

/**
 * 서비스 아이콘 React 엘리먼트를 반환
 */
export function getServiceIcon(serviceType: string, size = 20): React.ReactElement | null {
  const renderer = SERVICE_ICONS[serviceType];
  return renderer ? renderer(size) : null;
}

/**
 * 서비스 아이콘이 등록되어 있는지 확인
 */
export function hasServiceIcon(serviceType: string): boolean {
  return serviceType in SERVICE_ICONS;
}

/**
 * @deprecated Electron 빌드에서 경로 문제 발생. getServiceIcon() 사용 권장.
 */
export const getServiceIconPath = (_serviceType: string): string | null => {
  return null;
};
