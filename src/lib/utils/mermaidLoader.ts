/**
 * Mermaid.js CDN 동적 로더
 * CRA 4 / webpack 4 환경에서 mermaid npm 패키지가 빌드되지 않으므로
 * CDN에서 스크립트를 동적 로드하여 사용한다.
 */

const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

let loadPromise: Promise<void> | null = null;

function getMermaid(): any {
  return (window as any).mermaid;
}

function loadMermaidScript(): Promise<void> {
  if (loadPromise) return loadPromise;

  const existing = getMermaid();
  if (existing) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = MERMAID_CDN;
    script.async = true;
    script.onload = () => {
      const m = getMermaid();
      if (m) {
        m.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
        resolve();
      } else {
        reject(new Error('mermaid not found after script load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load mermaid script'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * DOM 내 .confluence-mermaid 요소들을 찾아 Mermaid SVG로 렌더링한다.
 * 이미 렌더링된 요소는 건너뛴다.
 */
export async function renderMermaidDiagrams(
  container: HTMLElement,
  idPrefix: string
): Promise<void> {
  const elements = container.querySelectorAll<HTMLElement>(
    '.confluence-mermaid[data-mermaid]:not(.confluence-mermaid-rendered)'
  );
  if (elements.length === 0) return;

  await loadMermaidScript();
  const mermaid = getMermaid();
  if (!mermaid) return;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const code = el.getAttribute('data-mermaid') || '';
    if (!code) continue;

    try {
      const id = `mermaid-${idPrefix}-${i}-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);
      el.innerHTML = svg;
      el.classList.add('confluence-mermaid-rendered');
    } catch (err) {
      console.warn('[mermaidLoader] render failed:', err);
      // 렌더링 실패 시 원본 코드를 pre 블록으로 표시
      el.innerHTML = `<pre style="white-space:pre-wrap;font-size:0.8rem;color:#666;">${el.textContent || code}</pre>`;
      el.classList.add('confluence-mermaid-rendered');
    }
  }
}
