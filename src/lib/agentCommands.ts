import type { AgentId } from 'types/agent';

export interface SlashCommand {
  /** '/help' 와 같이 슬래시를 포함한 커맨드 이름 */
  name: string;
  /** 한 줄 설명 */
  description: string;
  /** 인자가 있을 때 힌트 (예: '<model>', '[pr]') — 없으면 생략 */
  args?: string;
  /** 출처 라벨 — 'builtin' | 'user' | 'plugin:<name>' | 'extension:<name>' */
  source?: string;
}

/**
 * 빌트인 + 디스커버리 결과를 병합하고 이름 기준으로 중복을 제거한다.
 * 빌트인이 우선(같은 이름이 있으면 디스커버리 항목은 무시).
 */
export function mergeCommands(
  builtin: SlashCommand[],
  discovered: SlashCommand[],
): SlashCommand[] {
  const seen = new Set(builtin.map((c) => c.name.toLowerCase()));
  const out: SlashCommand[] = builtin.map((c) => ({ ...c, source: c.source ?? 'builtin' }));
  for (const d of discovered) {
    const key = d.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...d, source: d.source ?? 'user' });
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// A단계: agent별 코어 빌트인 슬래시 커맨드 (정적 정의)
// ────────────────────────────────────────────────────────────
// 이 목록은 각 CLI가 기본으로 제공하는 핵심 빌트인 위주이며,
// 사용자/플러그인이 추가한 커스텀 슬래시 커맨드는 포함되지 않는다.
// B단계에서 파일시스템·플러그인 매니페스트 디스커버리로 동적 확장 예정.

const CLAUDE_BUILTINS: SlashCommand[] = [
  { name: '/help', description: '사용 가능한 명령어 도움말' },
  { name: '/clear', description: '대화 컨텍스트 초기화' },
  { name: '/compact', description: '대화를 요약·압축해 컨텍스트 확보' },
  { name: '/cost', description: '토큰 사용량과 비용 확인' },
  { name: '/init', description: 'CLAUDE.md 생성 또는 업데이트' },
  { name: '/login', description: 'Anthropic 계정 로그인' },
  { name: '/logout', description: 'Anthropic 계정 로그아웃' },
  { name: '/model', description: '사용할 모델 변경', args: '<model>' },
  { name: '/status', description: '현재 세션 상태 확인' },
  { name: '/review', description: '코드/PR 리뷰', args: '[pr]' },
  { name: '/security-review', description: '변경사항 보안 리뷰' },
  { name: '/config', description: '설정 열기' },
  { name: '/memory', description: 'CLAUDE.md / 메모리 관리' },
  { name: '/bug', description: '버그 리포트' },
  { name: '/resume', description: '이전 세션 이어서 진행' },
  { name: '/exit', description: 'Claude Code 종료' },
];

const CODEX_BUILTINS: SlashCommand[] = [
  { name: '/help', description: '사용 가능한 명령어 도움말' },
  { name: '/clear', description: '대화 컨텍스트 초기화' },
  { name: '/compact', description: '대화를 요약·압축해 컨텍스트 확보' },
  { name: '/model', description: '사용할 모델 변경', args: '<model>' },
  { name: '/init', description: '프로젝트 초기화' },
  { name: '/login', description: 'OpenAI 계정 로그인' },
  { name: '/logout', description: 'OpenAI 계정 로그아웃' },
  { name: '/exit', description: 'Codex CLI 종료' },
];

const GEMINI_BUILTINS: SlashCommand[] = [
  { name: '/help', description: '사용 가능한 명령어 도움말' },
  { name: '/clear', description: '대화 컨텍스트 초기화' },
  { name: '/auth', description: '계정 로그인/로그아웃' },
  { name: '/chat', description: '대화 저장·불러오기', args: 'save|list|load' },
  { name: '/memory', description: '메모리 관리', args: 'show|add|refresh' },
  { name: '/tools', description: '사용 가능한 도구 목록' },
  { name: '/mcp', description: 'MCP 서버 관리' },
  { name: '/stats', description: '사용 통계 확인' },
  { name: '/theme', description: '테마 변경' },
  { name: '/quit', description: 'Gemini CLI 종료' },
];

export const BUILTIN_SLASH_COMMANDS: Record<AgentId, SlashCommand[]> = {
  claude: CLAUDE_BUILTINS,
  codex: CODEX_BUILTINS,
  gemini: GEMINI_BUILTINS,
};

/**
 * 입력 문자열이 슬래시 커맨드 자동완성 트리거 패턴과 일치하는지 검사하고
 * 매칭된 query 부분(슬래시 이후 문자열, 슬래시 제외, lowercase)을 반환한다.
 * 인자/공백이 들어오면 자동완성을 닫아야 하므로 null 반환.
 */
export function matchSlashQuery(input: string): string | null {
  const m = input.match(/^\/([\w-]*)$/);
  return m ? m[1].toLowerCase() : null;
}
