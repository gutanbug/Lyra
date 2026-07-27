/**
 * KaTeX CDN 동적 로더 — mermaidLoader.ts와 동일하게 npm 패키지 대신 CDN에서 로드한다.
 */

const KATEX_JS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';

let loadPromise: Promise<void> | null = null;

function getKatex(): any {
  return (window as any).katex;
}

function loadKatexAssets(): Promise<void> {
  if (loadPromise) return loadPromise;

  if (!document.querySelector(`link[href="${KATEX_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = KATEX_CSS;
    document.head.appendChild(link);
  }

  const existing = getKatex();
  if (existing) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = KATEX_JS;
    script.async = true;
    script.onload = () => (getKatex() ? resolve() : reject(new Error('katex not found after script load')));
    script.onerror = () => reject(new Error('Failed to load katex script'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/** 컨테이너에 LaTeX 수식을 렌더링한다. 실패 시 원본 텍스트로 폴백한다. */
export async function renderMath(container: HTMLElement, tex: string): Promise<void> {
  if (!tex) { container.innerHTML = ''; return; }
  try {
    await loadKatexAssets();
    const katex = getKatex();
    if (!katex) throw new Error('katex unavailable');
    katex.render(tex, container, { throwOnError: false, displayMode: true });
  } catch (e) {
    container.textContent = tex;
  }
}
