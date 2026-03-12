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

/** Confluence 로고 SVG */
function renderConfluenceIcon(size: number): React.ReactElement {
  return React.createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 256 246', fill: 'none' },
    React.createElement('defs', null,
      React.createElement('linearGradient', { id: 'conf-g1', x1: '99.14%', y1: '113.4%', x2: '33.79%', y2: '37.96%' },
        React.createElement('stop', { offset: '0', stopColor: '#0052CC' }),
        React.createElement('stop', { offset: '0.92', stopColor: '#2684FF' }),
      ),
      React.createElement('linearGradient', { id: 'conf-g2', x1: '0.86%', y1: '-13.4%', x2: '66.21%', y2: '62.04%' },
        React.createElement('stop', { offset: '0', stopColor: '#0052CC' }),
        React.createElement('stop', { offset: '0.92', stopColor: '#2684FF' }),
      ),
    ),
    React.createElement('path', {
      d: 'M9.26 187.4c-3.14 5.04-6.7 10.86-9.26 15.11a8.96 8.96 0 0 0 3.15 12.26l60.1 36.78a8.97 8.97 0 0 0 12.41-3.03c2.2-3.56 5.15-8.46 8.37-13.82 22.53-37.38 45.05-32.76 86.07-13.2l58.82 28.17a8.97 8.97 0 0 0 11.85-4.57l27.3-61.4a8.97 8.97 0 0 0-4.42-11.78c-14.2-6.7-42.54-20.08-59.12-27.82C131.56 112.05 53.84 115.42 9.26 187.4Z',
      fill: 'url(#conf-g1)',
    }),
    React.createElement('path', {
      d: 'M246.74 58.57c3.14-5.04 6.7-10.86 9.26-15.11a8.96 8.96 0 0 0-3.15-12.26L192.75-5.58a8.97 8.97 0 0 0-12.41 3.03c-2.2 3.56-5.15 8.46-8.37 13.82-22.53 37.38-45.05 32.76-86.07 13.2L27.08-3.7a8.97 8.97 0 0 0-11.85 4.57L-12.07 62.27a8.97 8.97 0 0 0 4.42 11.78c14.2 6.7 42.54 20.08 59.12 27.82 72.97 32.04 150.69 28.68 195.27-43.3Z',
      fill: 'url(#conf-g2)',
    }),
  );
}

/** Atlassian 로고 SVG */
function renderAtlassianIcon(size: number): React.ReactElement {
  return React.createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 256 256', fill: 'none' },
    React.createElement('defs', null,
      React.createElement('linearGradient', { id: 'atl-g1', x1: '40%', y1: '100%', x2: '60%', y2: '0%' },
        React.createElement('stop', { offset: '0', stopColor: '#2684FF' }),
        React.createElement('stop', { offset: '1', stopColor: '#0052CC' }),
      ),
    ),
    React.createElement('path', {
      d: 'M103.4 146.8c-3.8-3.9-9.6-3.3-12.6 1.8L44 228.6c-2.8 4.7-.7 8.7 4.6 8.7h68.6c3.7 0 7.2-2 8.7-5.5 11.7-26.8 5-67.4-22.5-85Z',
      fill: '#2684FF',
    }),
    React.createElement('path', {
      d: 'M122.6 18.7c-28.5 47-31.5 99.2-2.1 131.5l51.2 56.2c2.7 3 7 3.4 10.2.7l.7-.7 49.3-85.6c2.8-4.7.7-8.7-4.6-8.7h-35.8L129.1 22.4c-1.5-2.5-5-3.2-6.5-.7v-3Z',
      fill: 'url(#atl-g1)',
    }),
  );
}

type IconRenderer = (size: number) => React.ReactElement;

const SERVICE_ICONS: Record<string, IconRenderer> = {
  atlassian: renderAtlassianIcon,
  jira: renderJiraIcon,
  confluence: renderConfluenceIcon,
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
