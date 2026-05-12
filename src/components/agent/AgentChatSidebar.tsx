import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, ChevronDown, Send, ShieldCheck, Square, X } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { useAgentSidebar } from 'modules/contexts/agentSidebar';
import { useAccount } from 'modules/contexts/account';
import { isAtlassianAccount } from 'types/account';
import { useRichContentLinkHandler } from 'lib/hooks/useRichContentLinkHandler';
import { AGENT_IDS, AGENT_META } from 'types/agent';
import type { AgentId, AgentStatus } from 'types/agent';
import { BUILTIN_SLASH_COMMANDS, matchSlashQuery, mergeCommands } from 'lib/agentCommands';
import type { SlashCommand } from 'lib/agentCommands';

type BlockKind = 'text' | 'thinking' | 'tool_use';

interface AssistantBlock {
  index: number;
  kind: BlockKind;
  /** text/thinking 누적 본문 */
  text: string;
  /** tool_use */
  toolUseId?: string;
  toolName?: string;
  toolInputPartial?: string;
  toolInput?: unknown;
  toolResult?: { text: string; isError: boolean };
  status: 'streaming' | 'done';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** user/system 메시지 본문. assistant는 blocks가 있으면 그쪽을 우선 렌더 */
  content: string;
  blocks?: AssistantBlock[];
  createdAt: number;
}

type ConnectionState = 'connected' | 'not_installed' | 'not_authenticated';

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connected: '연결됨',
  not_installed: '미설치',
  not_authenticated: '미인증',
};

function getConnectionState(s: AgentStatus): ConnectionState {
  if (!s.installed) return 'not_installed';
  if (!s.authenticated) return 'not_authenticated';
  return 'connected';
}

/** 클라이언트에서 흡수하는 인터랙티브 전용 슬래시 커맨드 집합 */
const LOCAL_SLASH_COMMANDS = new Set([
  '/clear',
  '/exit',
  '/quit',
  '/help',
  '/status',
  '/config',
  '/login',
  '/logout',
]);

const DEFAULT_AGENT_STATUSES: AgentStatus[] = AGENT_IDS.map((id) => ({
  id,
  installed: false,
  binaryPath: null,
  version: null,
  authenticated: false,
  authMethod: 'none',
  authSource: 'none',
  apiKeyMasked: null,
  credentialPath: null,
  credentialMtime: null,
  binaryOverride: null,
}));

const MIN_WIDTH = 320;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 420;
const STORAGE_KEY = 'lyra:agent-sidebar-width';
const PERMISSION_MODE_STORAGE_KEY = 'lyra:agent-permission-mode';

type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';

interface PermissionModeMeta {
  id: PermissionMode;
  label: string;
  short: string;
  desc: string;
  tone: 'muted' | 'info' | 'success' | 'danger';
}

const PERMISSION_MODES: PermissionModeMeta[] = [
  {
    id: 'default',
    label: '기본',
    short: 'Default',
    desc: '모든 도구 호출 시 권한 prompt를 띄움',
    tone: 'muted',
  },
  {
    id: 'acceptEdits',
    label: '편집 자동 승인',
    short: 'Accept edits',
    desc: '파일 편집 도구는 자동 승인, 그 외는 prompt',
    tone: 'info',
  },
  {
    id: 'plan',
    label: '계획만',
    short: 'Plan',
    desc: '도구 호출 없이 작업 계획만 출력',
    tone: 'success',
  },
  {
    id: 'bypassPermissions',
    label: '모두 자동 승인',
    short: 'Bypass',
    desc: '모든 도구 자동 승인 (sensitive 파일 차단도 우회)',
    tone: 'danger',
  },
];

function loadWidth(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      const n = Number(v);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDTH;
}

function loadPermissionMode(): PermissionMode {
  try {
    const v = localStorage.getItem(PERMISSION_MODE_STORAGE_KEY);
    if (v === 'default' || v === 'acceptEdits' || v === 'plan' || v === 'bypassPermissions') {
      return v;
    }
  } catch { /* ignore */ }
  return 'default';
}


function previewToolArgs(input: unknown, partial?: string): string {
  if (!input || typeof input !== 'object') {
    if (partial) {
      // partial JSON 미완성 — 줄바꿈/공백 정리해 짧게
      const s = partial.replace(/\s+/g, ' ').trim();
      return s.length > 60 ? `${s.slice(0, 57)}…` : s;
    }
    return '';
  }
  const entries = Object.entries(input as Record<string, unknown>).slice(0, 2);
  if (entries.length === 0) return '';
  const parts = entries.map(([k, v]) => {
    let valStr: string;
    if (typeof v === 'string') {
      const trimmed = v.length > 24 ? `${v.slice(0, 24)}…` : v;
      valStr = `"${trimmed}"`;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      valStr = String(v);
    } else if (Array.isArray(v)) {
      valStr = `[${v.length}]`;
    } else if (v === null) {
      valStr = 'null';
    } else {
      valStr = '{…}';
    }
    return `${k}=${valStr}`;
  });
  const more = Object.keys(input as Record<string, unknown>).length > entries.length ? ', …' : '';
  return parts.join(', ') + more;
}

const AgentChatSidebar = () => {
  const history = useHistory();
  const { open, closeSidebar } = useAgentSidebar();
  const { activeAccount } = useAccount();
  const handleMarkdownLinkClick = useRichContentLinkHandler();
  const atlassianBaseUrl = useMemo<string | null>(() => {
    if (!activeAccount) return null;
    if (!isAtlassianAccount(activeAccount.serviceType)) return null;
    const baseUrl = (activeAccount.credentials as { baseUrl?: string } | undefined)?.baseUrl;
    return typeof baseUrl === 'string' && baseUrl ? baseUrl : null;
  }, [activeAccount]);
  const [width, setWidth] = useState<number>(loadWidth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(DEFAULT_AGENT_STATUSES);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [streamingTurnId, setStreamingTurnId] = useState<string | null>(null);
  const [sessionMap, setSessionMap] = useState<Record<AgentId, string | null>>({
    claude: null,
  });
  const [discoveredMap, setDiscoveredMap] = useState<Record<AgentId, SlashCommand[]>>({
    claude: [],
  });
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(loadPermissionMode);
  const [permissionMenuOpen, setPermissionMenuOpen] = useState(false);
  const permissionMenuRef = useRef<HTMLDivElement>(null);
  const [pendingPermission, setPendingPermission] = useState<{
    requestId: string;
    turnId: string;
    toolName: string;
    input: unknown;
  } | null>(null);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const slashItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const streamingTurnIdRef = useRef<string | null>(null);
  const currentTurnAgentRef = useRef<AgentId | null>(null);

  useEffect(() => {
    streamingTurnIdRef.current = streamingTurnId;
  }, [streamingTurnId]);

  // Turn 이벤트 listener (한 번만 등록)
  useEffect(() => {
    const api = (typeof window !== 'undefined' && window.workspaceAPI?.agents) || null;
    if (!api?.onTurnEvent) return;
    const off = api.onTurnEvent((e) => {
      const turnId = streamingTurnIdRef.current;
      if (!turnId || e.turnId !== turnId) return;
      const turnAgent = currentTurnAgentRef.current;

      if (e.type === 'meta' && e.sessionId && turnAgent) {
        setSessionMap((prev) => ({ ...prev, [turnAgent]: e.sessionId! }));
        return;
      }
      if (e.type === 'chunk' && e.text) {
        const chunk = e.text;
        setMessages((prev) => prev.map((m) =>
          m.id === `a-${turnId}` ? { ...m, content: m.content + chunk } : m
        ));
        return;
      }
      if (e.type === 'block_start' && typeof e.index === 'number') {
        const idx = e.index;
        const kind = (e.blockKind ?? 'text') as BlockKind;
        const toolName = e.toolName;
        const toolUseId = e.toolUseId;
        setMessages((prev) => prev.map((m) => {
          if (m.id !== `a-${turnId}`) return m;
          const blocks = m.blocks ?? [];
          if (blocks.some((b) => b.index === idx)) return m;
          const newBlock: AssistantBlock = {
            index: idx,
            kind,
            text: '',
            toolName,
            toolUseId,
            toolInputPartial: kind === 'tool_use' ? '' : undefined,
            status: 'streaming',
          };
          return { ...m, blocks: [...blocks, newBlock] };
        }));
        return;
      }
      if (e.type === 'block_delta' && typeof e.index === 'number') {
        const idx = e.index;
        const textDelta = e.textDelta;
        const thinkingDelta = e.thinkingDelta;
        const jsonDelta = e.jsonDelta;
        setMessages((prev) => prev.map((m) => {
          if (m.id !== `a-${turnId}` || !m.blocks) return m;
          return {
            ...m,
            blocks: m.blocks.map((b) => {
              if (b.index !== idx) return b;
              if (textDelta) return { ...b, text: b.text + textDelta };
              if (thinkingDelta) return { ...b, text: b.text + thinkingDelta };
              if (jsonDelta) return { ...b, toolInputPartial: (b.toolInputPartial ?? '') + jsonDelta };
              return b;
            }),
          };
        }));
        return;
      }
      if (e.type === 'block_stop' && typeof e.index === 'number') {
        const idx = e.index;
        setMessages((prev) => prev.map((m) => {
          if (m.id !== `a-${turnId}` || !m.blocks) return m;
          return {
            ...m,
            blocks: m.blocks.map((b) => {
              if (b.index !== idx) return b;
              let toolInput = b.toolInput;
              if (b.kind === 'tool_use' && b.toolInputPartial) {
                try { toolInput = JSON.parse(b.toolInputPartial); } catch { /* leave as raw */ }
              }
              return { ...b, status: 'done' as const, toolInput };
            }),
          };
        }));
        return;
      }
      if (e.type === 'tool_result' && e.toolUseId) {
        const toolUseId = e.toolUseId;
        const resultText = e.resultText ?? '';
        const isError = !!e.isError;
        setMessages((prev) => prev.map((m) => {
          if (m.role !== 'assistant' || !m.blocks) return m;
          let updated = false;
          const newBlocks = m.blocks.map((b) => {
            if (b.kind === 'tool_use' && b.toolUseId === toolUseId && !b.toolResult) {
              updated = true;
              return { ...b, toolResult: { text: resultText, isError } };
            }
            return b;
          });
          return updated ? { ...m, blocks: newBlocks } : m;
        }));
        return;
      }
      if (e.type === 'end') {
        if (e.sessionId && turnAgent) {
          setSessionMap((prev) => ({ ...prev, [turnAgent]: e.sessionId! }));
        }
        setMessages((prev) => prev.map((m) => {
          if (m.id !== `a-${turnId}`) return m;
          // 블록도 없고 본문도 없으면 빈 응답 표시
          if (!m.content && (!m.blocks || m.blocks.length === 0)) {
            return { ...m, content: '_(빈 응답)_' };
          }
          // 진행 중인 블록은 done으로 마감
          if (m.blocks && m.blocks.length > 0) {
            return {
              ...m,
              blocks: m.blocks.map((b) => (b.status === 'streaming' ? { ...b, status: 'done' as const } : b)),
            };
          }
          return m;
        }));
        setStreamingTurnId(null);
        currentTurnAgentRef.current = null;
        return;
      }
      if (e.type === 'error') {
        const errText = e.message || '알 수 없는 오류';
        setMessages((prev) => prev.map((m) =>
          m.id === `a-${turnId}`
            ? { ...m, content: m.content ? `${m.content}\n\n⚠️ ${errText}` : `⚠️ ${errText}` }
            : m
        ));
        setStreamingTurnId(null);
        currentTurnAgentRef.current = null;
      }
    });
    return () => { off(); };
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, [open]);

  // 사이드바가 열릴 때 에이전트 상태 갱신
  useEffect(() => {
    if (!open) return;
    const isElectron = typeof window !== 'undefined' && !!window.workspaceAPI?.agents;
    if (!isElectron) return;
    let cancelled = false;
    window.workspaceAPI!.agents.getAllStatus()
      .then((all) => {
        if (cancelled) return;
        setAgentStatuses(all);
        setSelectedAgentId((prev) => {
          if (prev) {
            const cur = all.find((s) => s.id === prev);
            if (cur && getConnectionState(cur) === 'connected') return prev;
          }
          const first = all.find((s) => getConnectionState(s) === 'connected');
          return first?.id ?? null;
        });
      })
      .catch(() => { /* 조용히 무시 - 미설치/오프라인 환경일 수 있음 */ });
    return () => { cancelled = true; };
  }, [open]);

  // 선택된 agent의 슬래시 커맨드 디스커버리 (사이드바 열림 + agent 변경 시)
  useEffect(() => {
    if (!open || !selectedAgentId) return;
    const api = (typeof window !== 'undefined' && window.workspaceAPI?.agents) || null;
    if (!api?.listCommands) return;
    let cancelled = false;
    const targetId = selectedAgentId;
    api.listCommands(targetId)
      .then((list) => {
        if (cancelled) return;
        const mapped: SlashCommand[] = list.map((c) => ({
          name: c.name,
          description: c.description,
          source: c.source,
        }));
        setDiscoveredMap((prev) => ({ ...prev, [targetId]: mapped }));
      })
      .catch(() => { /* 디스커버리 실패는 조용히 무시 — 빌트인만 표시 */ });
    return () => { cancelled = true; };
  }, [open, selectedAgentId]);

  // 권한 prompt listener (한 번만 등록)
  useEffect(() => {
    const api = (typeof window !== 'undefined' && window.workspaceAPI?.agents) || null;
    if (!api?.onPermissionRequest) return;
    const off = api.onPermissionRequest((req) => {
      setPendingPermission(req);
    });
    return () => { off(); };
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!agentMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setAgentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [agentMenuOpen]);

  useEffect(() => {
    if (!permissionMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (permissionMenuRef.current && !permissionMenuRef.current.contains(e.target as Node)) {
        setPermissionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [permissionMenuOpen]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth((w) => {
        try { localStorage.setItem(STORAGE_KEY, String(w)); } catch { /* ignore */ }
        return w;
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const addLocalAssistantMessage = (text: string) => {
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `s-${now}-${Math.random().toString(36).slice(2, 6)}`, role: 'assistant', content: text, createdAt: now },
    ]);
  };

  const buildHelpText = (): string => {
    const groups = new Map<string, SlashCommand[]>();
    for (const cmd of availableCommands) {
      const key = cmd.source ?? 'builtin';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(cmd);
    }
    const sourceOrder = (k: string): number => {
      if (k === 'builtin') return 0;
      if (k === 'user') return 1;
      if (k.startsWith('plugin:')) return 2;
      if (k.startsWith('extension:')) return 3;
      return 4;
    };
    const orderedKeys = [...groups.keys()].sort((a, b) => {
      const d = sourceOrder(a) - sourceOrder(b);
      return d !== 0 ? d : a.localeCompare(b);
    });
    const lines: string[] = ['사용 가능한 명령어:'];
    for (const key of orderedKeys) {
      lines.push('');
      lines.push(`[${key}]`);
      for (const c of groups.get(key)!) {
        const args = c.args ? ` ${c.args}` : '';
        lines.push(`  ${c.name}${args} — ${c.description}`);
      }
    }
    return lines.join('\n');
  };

  const buildStatusText = (): string => {
    if (!selectedAgentId) return '선택된 AI Agent가 없습니다.';
    const meta = AGENT_META[selectedAgentId];
    const s = selectedStatus;
    const sessionId = sessionMap[selectedAgentId];
    const lines: string[] = [
      `Agent: ${meta.displayName}${s?.version ? ` (${s.version})` : ''}`,
      `연결 상태: ${CONNECTION_LABEL[selectedConnection]}` +
        (s && s.authMethod !== 'none' ? ` · ${s.authMethod}` : ''),
      `세션 ID: ${sessionId ?? '(없음)'}`,
      `바이너리: ${s?.binaryPath ?? '(미발견)'}`,
    ];
    return lines.join('\n');
  };

  /**
   * 인터랙티브 전용 슬래시 커맨드를 클라이언트에서 흡수.
   * @returns 처리됐으면 true (CLI에 prompt로 전달하지 않음)
   */
  const runLocalSlash = (cmd: string): boolean => {
    switch (cmd) {
      case '/clear':
        if (selectedAgentId) {
          setSessionMap((prev) => ({ ...prev, [selectedAgentId]: null }));
        }
        setMessages([]);
        return true;
      case '/exit':
      case '/quit':
        addLocalAssistantMessage('사이드바를 닫았습니다.');
        setTimeout(() => closeSidebar(), 50);
        return true;
      case '/help':
        addLocalAssistantMessage(buildHelpText());
        return true;
      case '/status':
        addLocalAssistantMessage(buildStatusText());
        return true;
      case '/config':
        addLocalAssistantMessage('환경설정으로 이동합니다.');
        history.push('/settings');
        return true;
      case '/login':
      case '/logout':
        addLocalAssistantMessage('AI Agent 인증 화면으로 이동합니다.');
        history.push('/settings?tab=agents');
        return true;
      default:
        return false;
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    if (streamingTurnId) return; // 이미 진행 중인 turn이 있으면 무시

    const now = Date.now();

    // 로컬 슬래시 라우팅 (CLI 호출 없이 클라이언트가 흡수)
    const userMsgIdLocal = `u-${now}`;
    if (LOCAL_SLASH_COMMANDS.has(text)) {
      setMessages((prev) => [
        ...prev,
        { id: userMsgIdLocal, role: 'user', content: text, createdAt: now },
      ]);
      setInput('');
      setSlashDismissed(false);
      runLocalSlash(text);
      return;
    }

    // 연결된 agent가 없으면 안내 (실제 호출 안 함)
    if (!selectedAgentId || selectedConnection !== 'connected') {
      setMessages((prev) => [
        ...prev,
        { id: `u-${now}`, role: 'user', content: text, createdAt: now },
        {
          id: `s-${now}`,
          role: 'assistant',
          content: '⚠️ 연결된 AI Agent를 먼저 선택하세요.',
          createdAt: now + 1,
        },
      ]);
      setInput('');
      return;
    }

    const api = (typeof window !== 'undefined' && window.workspaceAPI?.agents) || null;
    if (!api?.startTurn) {
      setMessages((prev) => [
        ...prev,
        { id: `u-${now}`, role: 'user', content: text, createdAt: now },
        {
          id: `s-${now}`,
          role: 'assistant',
          content: '⚠️ AI Agent 호출은 데스크톱(Electron) 앱에서만 사용할 수 있습니다.',
          createdAt: now + 1,
        },
      ]);
      setInput('');
      return;
    }

    const turnId = `t-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsgId = `u-${now}`;
    const assistantMsgId = `a-${turnId}`;
    const turnAgentId = selectedAgentId;
    const turnSessionId = sessionMap[turnAgentId] ?? null;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: text, createdAt: now },
      { id: assistantMsgId, role: 'assistant', content: '', blocks: [], createdAt: now + 1 },
    ]);
    setInput('');
    setSlashDismissed(false);

    currentTurnAgentRef.current = turnAgentId;
    setStreamingTurnId(turnId);

    try {
      const result = await api.startTurn({
        turnId,
        agentId: turnAgentId,
        prompt: text,
        sessionId: turnSessionId,
        permissionMode: turnAgentId === 'claude' ? permissionMode : undefined,
      });
      if (!result.ok) {
        const msg = result.message ?? '시작 실패';
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: `⚠️ ${msg}` } : m
        ));
        setStreamingTurnId(null);
        currentTurnAgentRef.current = null;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: `⚠️ ${msg}` } : m
      ));
      setStreamingTurnId(null);
      currentTurnAgentRef.current = null;
    }
  };

  const handleCancel = () => {
    if (!streamingTurnId) return;
    const turnId = streamingTurnId;
    // SDK 종료/이벤트 회신을 기다리지 않고 UI를 즉시 정리한다.
    // 메인 프로세스의 cancelTurn이 wrappedEmit drop을 켜기 때문에 이후 도착하는 chunk는 무시된다.
    setStreamingTurnId(null);
    currentTurnAgentRef.current = null;
    setMessages((prev) => prev.map((m) => {
      if (m.id !== `a-${turnId}`) return m;
      const cancelMark = '\n\n⚠️ 사용자가 중지했습니다.';
      const blocks = m.blocks?.map((b) =>
        b.status === 'streaming' ? { ...b, status: 'done' as const } : b,
      );
      const hasVisible = !!m.content || (blocks && blocks.length > 0);
      return {
        ...m,
        blocks,
        content: hasVisible ? `${m.content}${cancelMark}` : '⚠️ 사용자가 중지했습니다.',
      };
    }));
    window.workspaceAPI?.agents?.cancelTurn?.(turnId);
  };

  const handlePermissionResponse = (behavior: 'allow' | 'deny') => {
    if (!pendingPermission) return;
    const req = pendingPermission;
    setPendingPermission(null);
    window.workspaceAPI?.agents?.respondPermission?.({
      requestId: req.requestId,
      behavior,
      updatedInput: behavior === 'allow' ? req.input : undefined,
      message: behavior === 'deny' ? '사용자가 거부했습니다.' : undefined,
    }).catch(() => { /* ignore */ });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // streaming 중 cancel 단축키: Ctrl/Cmd+C(선택 영역 없을 때) 또는 Esc
    if (streamingTurnId) {
      const ta = e.currentTarget;
      const hasSelection = ta.selectionStart !== ta.selectionEnd;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C') && !hasSelection) {
        e.preventDefault();
        handleCancel();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
        return;
      }
    }
    if (e.key === 'Enter') {
      // Shift+Enter는 줄바꿈 — 기본 동작 통과
      if (e.shiftKey) return;
      // 한글/일본어 IME 조합 확정용 Enter는 무시 (중복 전송 방지)
      if (e.nativeEvent.isComposing) return;
      // Slash 메뉴가 열려있으면 Enter는 커맨드 적용
      if (slashOpen) {
        e.preventDefault();
        const cmd = filteredSlash[slashIndex];
        if (cmd) applySlashCommand(cmd);
        return;
      }
      // 그 외 Enter (단독 또는 ⌘/Ctrl+Enter)는 전송
      e.preventDefault();
      handleSend();
      return;
    }
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredSlash.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + filteredSlash.length) % filteredSlash.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const cmd = filteredSlash[slashIndex];
        if (cmd) applySlashCommand(cmd);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashDismissed(true);
        return;
      }
    }
  };

  const handleSelectAgent = (id: AgentId) => {
    setSelectedAgentId(id);
    setAgentMenuOpen(false);
  };

  const selectedStatus = selectedAgentId
    ? agentStatuses.find((s) => s.id === selectedAgentId) ?? null
    : null;
  const selectedConnection: ConnectionState = selectedStatus
    ? getConnectionState(selectedStatus)
    : 'not_installed';

  // ── Slash 커맨드 자동완성 ──
  const slashQuery = matchSlashQuery(input);
  const availableCommands: SlashCommand[] = useMemo(() => {
    if (!selectedAgentId) return [];
    const builtin = BUILTIN_SLASH_COMMANDS[selectedAgentId] ?? [];
    const discovered = discoveredMap[selectedAgentId] ?? [];
    return mergeCommands(builtin, discovered);
  }, [selectedAgentId, discoveredMap]);
  const filteredSlash = useMemo(() => {
    if (slashQuery === null) return [];
    if (slashQuery === '') return availableCommands;
    return availableCommands.filter((c) => {
      const lower = c.name.toLowerCase();
      return lower.startsWith(`/${slashQuery}`) || lower.includes(slashQuery);
    });
  }, [slashQuery, availableCommands]);
  const slashOpen = !slashDismissed && slashQuery !== null && filteredSlash.length > 0;

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    if (!slashOpen) return;
    const el = slashItemRefs.current[slashIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [slashIndex, slashOpen]);

  const applySlashCommand = (cmd: SlashCommand) => {
    setInput(`${cmd.name} `);
    setSlashDismissed(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  };

  return (
    <Panel $open={open} $width={width} aria-hidden={!open}>
      <ResizeHandle onMouseDown={onResizeStart} />

      <Header>
        <HeaderLeft>
          <HeaderDot />
          <HeaderTitle>AI Agent</HeaderTitle>
        </HeaderLeft>
        <HeaderRight>
          <PermissionModeWrap ref={permissionMenuRef}>
            {(() => {
              const current = PERMISSION_MODES.find((m) => m.id === permissionMode) ?? PERMISSION_MODES[0];
              return (
                <>
                  <PermissionModeTrigger
                    type="button"
                    $tone={current.tone}
                    onClick={() => setPermissionMenuOpen((v) => !v)}
                    title={`Claude 권한 모드 — ${current.label}: ${current.desc}`}
                  >
                    <ShieldCheck size={13} />
                    <span>{current.short}</span>
                    <ChevronDown size={12} />
                  </PermissionModeTrigger>
                  {permissionMenuOpen && (
                    <PermissionModeMenu role="listbox">
                      {PERMISSION_MODES.map((m) => (
                        <PermissionModeItem
                          key={m.id}
                          role="option"
                          aria-selected={m.id === permissionMode}
                          $selected={m.id === permissionMode}
                          $tone={m.tone}
                          onClick={() => {
                            setPermissionMode(m.id);
                            try { localStorage.setItem(PERMISSION_MODE_STORAGE_KEY, m.id); } catch { /* ignore */ }
                            setPermissionMenuOpen(false);
                          }}
                        >
                          <PermissionModeRow>
                            <PermissionModeDot $tone={m.tone} />
                            <PermissionModeLabel>{m.label}</PermissionModeLabel>
                            {m.id === permissionMode && <Check size={12} />}
                          </PermissionModeRow>
                          <PermissionModeDesc>{m.desc}</PermissionModeDesc>
                        </PermissionModeItem>
                      ))}
                    </PermissionModeMenu>
                  )}
                </>
              );
            })()}
          </PermissionModeWrap>
          <CloseBtn onClick={closeSidebar} title="닫기">
            <X size={16} />
          </CloseBtn>
        </HeaderRight>
      </Header>

      <MessagesArea>
        {messages.length === 0 ? (
          <EmptyState>
            <EmptyTitle>AI Agent에게 질문해보세요</EmptyTitle>
            <EmptyDesc>
              Jira 이슈, Confluence 페이지에 대한 요약·검색·분석을 도와드립니다.
            </EmptyDesc>
          </EmptyState>
        ) : (
          messages.map((msg) => {
            const isStreamingMsg = !!streamingTurnId && msg.id === `a-${streamingTurnId}`;
            if (msg.role === 'assistant' && msg.blocks && msg.blocks.length > 0) {
              return (
                <BubbleRow key={msg.id} $role="assistant">
                  <BlockGroup>
                    {msg.blocks.map((b) => (
                      <BlockView
                        key={b.index}
                        block={b}
                        baseUrl={atlassianBaseUrl}
                        onLinkClick={handleMarkdownLinkClick}
                      />
                    ))}
                    {msg.content && (
                      <MarkdownBubble $role="assistant">
                        <MarkdownView
                          text={msg.content}
                          baseUrl={atlassianBaseUrl}
                          onLinkClick={handleMarkdownLinkClick}
                        />
                      </MarkdownBubble>
                    )}
                    {isStreamingMsg && <TypingIndicator />}
                  </BlockGroup>
                </BubbleRow>
              );
            }
            if (msg.role === 'assistant') {
              return (
                <BubbleRow key={msg.id} $role="assistant">
                  <BlockGroup>
                    {msg.content ? (
                      <MarkdownBubble $role="assistant">
                        <MarkdownView
                          text={msg.content}
                          baseUrl={atlassianBaseUrl}
                          onLinkClick={handleMarkdownLinkClick}
                        />
                      </MarkdownBubble>
                    ) : null}
                    {isStreamingMsg && <TypingIndicator />}
                  </BlockGroup>
                </BubbleRow>
              );
            }
            return (
              <BubbleRow key={msg.id} $role="user">
                <Bubble $role="user">{msg.content}</Bubble>
              </BubbleRow>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

      {pendingPermission && (
        <PermissionDialog>
          <PermissionTitle>권한 요청</PermissionTitle>
          <PermissionRow>
            <PermissionLabel>도구</PermissionLabel>
            <PermissionTool>{pendingPermission.toolName}</PermissionTool>
          </PermissionRow>
          <PermissionRow>
            <PermissionLabel>입력</PermissionLabel>
            <PermissionInputBox>{JSON.stringify(pendingPermission.input, null, 2)}</PermissionInputBox>
          </PermissionRow>
          <PermissionActions>
            <DenyBtn type="button" onClick={() => handlePermissionResponse('deny')}>
              <X size={14} /> 거부
            </DenyBtn>
            <AllowBtn type="button" onClick={() => handlePermissionResponse('allow')}>
              <Check size={14} /> 허용
            </AllowBtn>
          </PermissionActions>
        </PermissionDialog>
      )}

      <InputArea>
        {slashOpen && (
          <SlashMenu role="listbox" aria-label="슬래시 커맨드">
            <SlashMenuHeader>
              {selectedAgentId ? AGENT_META[selectedAgentId].displayName : 'AI Agent'} 명령어
            </SlashMenuHeader>
            {filteredSlash.map((cmd, i) => (
              <SlashItem
                key={cmd.name}
                role="option"
                aria-selected={i === slashIndex}
                ref={(el) => { slashItemRefs.current[i] = el; }}
                $active={i === slashIndex}
                onMouseEnter={() => setSlashIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySlashCommand(cmd);
                }}
              >
                <SlashItemHeader>
                  <SlashItemName>{cmd.name}</SlashItemName>
                  {cmd.args && <SlashItemArgs>{cmd.args}</SlashItemArgs>}
                  {cmd.source && cmd.source !== 'builtin' && (
                    <SlashItemSource>{cmd.source}</SlashItemSource>
                  )}
                </SlashItemHeader>
                <SlashItemDesc>{cmd.description}</SlashItemDesc>
              </SlashItem>
            ))}
          </SlashMenu>
        )}
        {(() => {
          const m = input.match(/^(\/[\w:\-]+)(\s|$)/);
          return m ? (
            <CommandHintRow>
              <CommandHintBadge>명령어</CommandHintBadge>
              <CommandHintCmd>{m[1]}</CommandHintCmd>
            </CommandHintRow>
          ) : null;
        })()}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setSlashDismissed(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="질문을 입력하세요... ('/' 로 명령어, Shift + Enter 줄바꿈, Esc/Ctrl+C 취소)"
          rows={3}
        />
        <InputFooter>
          <SelectorRow ref={agentMenuRef}>
            <AgentTrigger
              type="button"
              onClick={() => setAgentMenuOpen((v) => !v)}
              $open={agentMenuOpen}
              aria-haspopup="listbox"
              aria-expanded={agentMenuOpen}
            >
              <AgentTriggerLeft>
                <AgentDot $state={selectedConnection} />
                <AgentTriggerName>
                  {selectedAgentId
                    ? AGENT_META[selectedAgentId].displayName
                    : '연결된 Agent 없음'}
                </AgentTriggerName>
              </AgentTriggerLeft>
              <ChevronWrap $open={agentMenuOpen}>
                <ChevronDown size={14} />
              </ChevronWrap>
            </AgentTrigger>

            {agentMenuOpen && (
              <AgentMenu role="listbox">
                {AGENT_IDS.map((id) => {
                  const s = agentStatuses.find((x) => x.id === id)
                    ?? DEFAULT_AGENT_STATUSES.find((x) => x.id === id)!;
                  const conn = getConnectionState(s);
                  const connected = conn === 'connected';
                  const isSelected = selectedAgentId === id;
                  return (
                    <AgentMenuItem
                      key={id}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={!connected}
                      $disabled={!connected}
                      $selected={isSelected}
                      onClick={() => { if (connected) handleSelectAgent(id); }}
                    >
                      <AgentItemLeft>
                        <AgentDot $state={conn} />
                        <AgentItemName $disabled={!connected}>
                          {AGENT_META[id].displayName}
                        </AgentItemName>
                        {s.version && <AgentItemVersion>{s.version}</AgentItemVersion>}
                      </AgentItemLeft>
                      <AgentItemBadge $state={conn}>
                        {CONNECTION_LABEL[conn]}
                      </AgentItemBadge>
                    </AgentMenuItem>
                  );
                })}
              </AgentMenu>
            )}
          </SelectorRow>
          {streamingTurnId ? (
            <SendBtn
              type="button"
              onClick={handleCancel}
              title="응답 취소 (Esc / Ctrl+C)"
              data-variant="cancel"
            >
              <Square size={12} />
              취소
            </SendBtn>
          ) : (
            <SendBtn
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              title="전송 (Enter)"
            >
              <Send size={14} />
              전송
            </SendBtn>
          )}
        </InputFooter>
      </InputArea>
    </Panel>
  );
};

// ─── Block 렌더 ──────────────────────────────

const JIRA_KEY_RE = /\b[A-Z][A-Z0-9_]+-\d+\b/g;

/**
 * remark 트리의 text 노드에서 jira 이슈 키를 link 노드로 변환.
 * inlineCode/code 노드는 변환에서 제외 — 코드 블록 안 텍스트는 보호한다.
 */
function remarkAutolinkJira(baseUrl: string) {
  return (tree: { children?: unknown[]; type?: string; value?: string; url?: string }) => {
    const walk = (node: unknown, parent: { children?: unknown[] } | null): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as { type?: string; value?: string; children?: unknown[] };
      if (n.type === 'inlineCode' || n.type === 'code' || n.type === 'link') return;
      if (n.type === 'text' && typeof n.value === 'string' && parent && Array.isArray(parent.children)) {
        const matches: RegExpMatchArray[] = [];
        let m: RegExpExecArray | null;
        const re = new RegExp(JIRA_KEY_RE.source, 'g');
        while ((m = re.exec(n.value)) !== null) matches.push(m);
        if (matches.length === 0) return;
        const idx = parent.children.indexOf(node as unknown);
        if (idx < 0) return;
        const newNodes: unknown[] = [];
        let lastEnd = 0;
        for (const match of matches) {
          const start = match.index ?? 0;
          const end = start + match[0].length;
          if (start > lastEnd) newNodes.push({ type: 'text', value: n.value.slice(lastEnd, start) });
          newNodes.push({
            type: 'link',
            url: `${baseUrl}/browse/${match[0]}`,
            children: [{ type: 'text', value: match[0] }],
          });
          lastEnd = end;
        }
        if (lastEnd < n.value.length) newNodes.push({ type: 'text', value: n.value.slice(lastEnd) });
        parent.children.splice(idx, 1, ...newNodes);
        return;
      }
      if (Array.isArray(n.children)) {
        const copy = [...n.children];
        for (const c of copy) walk(c, n as { children?: unknown[] });
      }
    };
    walk(tree, null);
  };
}

interface MarkdownViewProps {
  text: string;
  baseUrl: string | null;
  onLinkClick: (e: React.MouseEvent<HTMLElement>) => void;
}

const MarkdownView = ({ text, baseUrl, onLinkClick }: MarkdownViewProps) => {
  const remarkPlugins = useMemo(() => {
    const plugins: unknown[] = [remarkGfm];
    if (baseUrl) plugins.push(remarkAutolinkJira(baseUrl));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return plugins as any;
  }, [baseUrl]);
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      components={{
        a: ({ href, children, ...rest }) => (
          <a href={href} onClick={onLinkClick} {...rest}>
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
};

interface BlockViewProps {
  block: AssistantBlock;
  baseUrl: string | null;
  onLinkClick: (e: React.MouseEvent<HTMLElement>) => void;
}

const BlockView = ({ block, baseUrl, onLinkClick }: BlockViewProps) => {
  if (block.kind === 'text') {
    if (!block.text) {
      return (
        <Bubble $role="assistant">
          {block.status === 'streaming' ? '…' : ''}
        </Bubble>
      );
    }
    return (
      <MarkdownBubble $role="assistant">
        <MarkdownView text={block.text} baseUrl={baseUrl} onLinkClick={onLinkClick} />
      </MarkdownBubble>
    );
  }
  if (block.kind === 'thinking') {
    return <ThinkingPanel block={block} />;
  }
  if (block.kind === 'tool_use') {
    return <ToolUseCard block={block} baseUrl={baseUrl} onLinkClick={onLinkClick} />;
  }
  return null;
};

// ─── Atlassian tool_result 카드 ───────────────

interface JiraIssueLike {
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
    priority?: { name?: string };
    issuetype?: { name?: string };
    assignee?: { displayName?: string };
    reporter?: { displayName?: string };
  };
}

function isJiraIssueLike(v: unknown): v is JiraIssueLike {
  if (!v || typeof v !== 'object') return false;
  const o = v as { key?: unknown; fields?: unknown };
  return typeof o.key === 'string'
    && /^[A-Z][A-Z0-9_]+-\d+$/.test(o.key)
    && !!o.fields
    && typeof o.fields === 'object';
}

interface JiraSearchResultLike {
  issues: JiraIssueLike[];
  total?: number;
}

function isJiraSearchResultLike(v: unknown): v is JiraSearchResultLike {
  if (!v || typeof v !== 'object') return false;
  const o = v as { issues?: unknown };
  return Array.isArray(o.issues) && o.issues.length > 0 && isJiraIssueLike(o.issues[0]);
}

interface ConfluencePageLike {
  id: string | number;
  type?: string;
  title?: string;
  space?: { key?: string; name?: string };
  version?: { number?: number; when?: string; by?: { displayName?: string } };
  history?: { createdDate?: string; createdBy?: { displayName?: string } };
  ancestors?: Array<{ id?: string | number; title?: string }>;
  _links?: { webui?: string; base?: string };
}

function isConfluencePageLike(v: unknown): v is ConfluencePageLike {
  if (!v || typeof v !== 'object') return false;
  const o = v as { id?: unknown; type?: unknown; title?: unknown; space?: unknown };
  if (typeof o.id !== 'string' && typeof o.id !== 'number') return false;
  if (typeof o.title !== 'string') return false;
  if (typeof o.type === 'string' && (o.type === 'page' || o.type === 'blogpost')) return true;
  return !!o.space && typeof o.space === 'object';
}

/**
 * tool_result.text를 JSON으로 파싱 시도하고, Jira/Confluence 응답 모양이면 카드로 렌더.
 * 매칭 안되면 null — 호출자가 plain text fallback.
 */
function renderAtlassianToolResult(
  text: string,
  baseUrl: string | null,
  onLinkClick: (e: React.MouseEvent<HTMLElement>) => void,
): React.ReactNode | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (isJiraIssueLike(parsed)) {
    return <JiraIssueCardView issue={parsed} baseUrl={baseUrl} onLinkClick={onLinkClick} />;
  }
  if (isJiraSearchResultLike(parsed)) {
    return (
      <IssueListWrap>
        <IssueListHeader>
          {parsed.issues.length}개 이슈
          {typeof parsed.total === 'number' && parsed.total > parsed.issues.length
            && ` (총 ${parsed.total}개)`}
        </IssueListHeader>
        {parsed.issues.map((issue) => (
          <JiraIssueCardView
            key={issue.key}
            issue={issue}
            baseUrl={baseUrl}
            onLinkClick={onLinkClick}
            $compact
          />
        ))}
      </IssueListWrap>
    );
  }
  if (isConfluencePageLike(parsed)) {
    return <ConfluencePageCardView page={parsed} baseUrl={baseUrl} onLinkClick={onLinkClick} />;
  }
  return null;
}

interface JiraIssueCardViewProps {
  issue: JiraIssueLike;
  baseUrl: string | null;
  onLinkClick: (e: React.MouseEvent<HTMLElement>) => void;
  $compact?: boolean;
}

const JiraIssueCardView = ({ issue, baseUrl, onLinkClick, $compact }: JiraIssueCardViewProps) => {
  const fields = issue.fields ?? {};
  const url = baseUrl ? `${baseUrl}/browse/${issue.key}` : '#';
  return (
    <IssueCardWrap $compact={!!$compact}>
      <IssueCardHeader>
        <IssueKey>
          <a href={url} onClick={onLinkClick}>{issue.key}</a>
        </IssueKey>
        {fields.status?.name && <StatusChip>{fields.status.name}</StatusChip>}
        {fields.priority?.name && <PriorityChip>{fields.priority.name}</PriorityChip>}
      </IssueCardHeader>
      {fields.summary && <IssueSummary>{fields.summary}</IssueSummary>}
      <IssueMetaRow>
        {fields.issuetype?.name && <IssueMeta>유형 · {fields.issuetype.name}</IssueMeta>}
        {fields.assignee?.displayName && <IssueMeta>담당 · {fields.assignee.displayName}</IssueMeta>}
        {fields.reporter?.displayName && <IssueMeta>보고 · {fields.reporter.displayName}</IssueMeta>}
      </IssueMetaRow>
    </IssueCardWrap>
  );
};

interface ConfluencePageCardViewProps {
  page: ConfluencePageLike;
  baseUrl: string | null;
  onLinkClick: (e: React.MouseEvent<HTMLElement>) => void;
}

function formatConfluenceDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

const ConfluencePageCardView = ({ page, baseUrl, onLinkClick }: ConfluencePageCardViewProps) => {
  const id = String(page.id);
  // _links.webui는 `/spaces/SPC/pages/123/Title` 또는 `/pages/123` 형태 — useRichContentLinkHandler가 두 패턴 모두 매칭한다.
  const webui = page._links?.webui;
  const url = baseUrl
    ? (webui ? `${baseUrl}/wiki${webui}` : `${baseUrl}/wiki/pages/${id}`)
    : '#';
  const updatedBy = page.version?.by?.displayName;
  const updatedWhen = formatConfluenceDate(page.version?.when);
  const createdBy = page.history?.createdBy?.displayName;
  const ancestors = (page.ancestors ?? []).filter((a) => typeof a.title === 'string' && a.title);

  return (
    <IssueCardWrap $compact={false}>
      <IssueCardHeader>
        <PageTypeChip>📄 페이지</PageTypeChip>
        {page.space?.name && <SpaceChip>{page.space.name}</SpaceChip>}
      </IssueCardHeader>
      <IssueSummary>
        <a href={url} onClick={onLinkClick} style={{ color: 'inherit', textDecoration: 'none' }}>
          {page.title || `Page ${id}`}
        </a>
      </IssueSummary>
      {ancestors.length > 0 && (
        <PageBreadcrumb>
          {ancestors.map((a) => a.title).join(' › ')}
        </PageBreadcrumb>
      )}
      <IssueMetaRow>
        {updatedWhen && (
          <IssueMeta>
            수정 · {updatedWhen}
            {updatedBy && ` (${updatedBy})`}
          </IssueMeta>
        )}
        {!updatedWhen && createdBy && <IssueMeta>작성 · {createdBy}</IssueMeta>}
        {typeof page.version?.number === 'number' && (
          <IssueMeta>v{page.version.number}</IssueMeta>
        )}
      </IssueMetaRow>
    </IssueCardWrap>
  );
};

const TypingIndicator = () => (
  <TypingBubble aria-label="응답 생성 중" role="status">
    <TypingDot $delay={0} />
    <TypingDot $delay={0.15} />
    <TypingDot $delay={0.3} />
  </TypingBubble>
);

const ThinkingPanel = ({ block }: { block: AssistantBlock }) => {
  const [open, setOpen] = useState(false);
  return (
    <ThinkingWrap>
      <ThinkingHeader onClick={() => setOpen((v) => !v)}>
        <FoldArrow>{open ? '▾' : '▸'}</FoldArrow>
        <span>사고</span>
        {block.status === 'streaming' && <Spinner>…</Spinner>}
      </ThinkingHeader>
      {open && <ThinkingBody>{block.text}</ThinkingBody>}
    </ThinkingWrap>
  );
};

interface ToolUseCardProps {
  block: AssistantBlock;
  baseUrl: string | null;
  onLinkClick: (e: React.MouseEvent<HTMLElement>) => void;
}

const ToolUseCard = ({ block, baseUrl, onLinkClick }: ToolUseCardProps) => {
  const userToggledRef = useRef(false);
  const [open, setOpen] = useState<boolean>(true);

  // 자동 펼침/접힘: streaming은 펼침, done이고 결과 있으면 접음. 사용자가 수동으로 토글한 후로는 자동 변경 정지.
  useEffect(() => {
    if (userToggledRef.current) return;
    if (block.status === 'streaming') {
      setOpen(true);
      return;
    }
    if (block.toolResult && !block.toolResult.isError) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [block.status, block.toolResult]);

  const handleToggle = () => {
    userToggledRef.current = true;
    setOpen((v) => !v);
  };

  const inputDisplay = block.toolInput !== undefined
    ? JSON.stringify(block.toolInput, null, 2)
    : (block.toolInputPartial ?? '');
  const argPreview = previewToolArgs(block.toolInput, block.toolInputPartial);
  const result = block.toolResult;
  const statusLabel = result
    ? (result.isError ? '실패' : '완료')
    : (block.status === 'streaming' ? '실행 중…' : '대기');

  // 결과가 Atlassian 응답 모양이면 카드로, 아니면 plain text
  const enrichedResult = result && !result.isError
    ? renderAtlassianToolResult(result.text, baseUrl, onLinkClick)
    : null;

  return (
    <ToolWrap>
      <ToolHeader onClick={handleToggle} $error={!!result?.isError}>
        <FoldArrow>{open ? '▾' : '▸'}</FoldArrow>
        <ToolName>
          {block.toolName ?? 'tool'}
          {argPreview && <ToolArgPreview>({argPreview})</ToolArgPreview>}
        </ToolName>
        <ToolStatus $error={!!result?.isError}>{statusLabel}</ToolStatus>
      </ToolHeader>
      {open && (
        <>
          {inputDisplay && (
            <ToolSection>
              <ToolLabel>입력</ToolLabel>
              <ToolPre>{inputDisplay}</ToolPre>
            </ToolSection>
          )}
          {result && (
            <ToolSection>
              <ToolLabel>{result.isError ? '오류' : '결과'}</ToolLabel>
              {enrichedResult ?? (
                <ToolPre $error={result.isError}>{result.text || '(빈 결과)'}</ToolPre>
              )}
            </ToolSection>
          )}
        </>
      )}
    </ToolWrap>
  );
};

export default AgentChatSidebar;

// ─── Styled Components ─────────────────────────

const Panel = styled.aside<{ $open: boolean; $width: number }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${({ $width }) => $width}px;
  display: flex;
  flex-direction: column;
  background: ${theme.bgPrimary};
  border-left: 1px solid ${theme.border};
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.06);
  transform: translateX(${({ $open, $width }) => ($open ? '0' : `${$width + 20}px`)});
  transition: transform 0.22s ${transition};
  z-index: 50;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
`;

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  left: -2px;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ${transition};
  z-index: 1;

  &:hover,
  &:active {
    background: ${theme.blue};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid ${theme.border};
  background: ${theme.bgPrimary};
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const toneFg = (tone: 'muted' | 'info' | 'success' | 'danger'): string => {
  if (tone === 'info') return '#1d4ed8';
  if (tone === 'success') return '#15803d';
  if (tone === 'danger') return '#b91c1c';
  return '#525252';
};
const toneBg = (tone: 'muted' | 'info' | 'success' | 'danger'): string => {
  if (tone === 'info') return '#dbeafe';
  if (tone === 'success') return '#dcfce7';
  if (tone === 'danger') return '#fee2e2';
  return '#f5f5f5';
};
const toneBorder = (tone: 'muted' | 'info' | 'success' | 'danger'): string => {
  if (tone === 'info') return '#93c5fd';
  if (tone === 'success') return '#86efac';
  if (tone === 'danger') return '#fca5a5';
  return '#e5e5e5';
};

const PermissionModeWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PermissionModeTrigger = styled.button<{ $tone: 'muted' | 'info' | 'success' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) => toneBorder($tone)};
  background: ${({ $tone }) => toneBg($tone)};
  color: ${({ $tone }) => toneFg($tone)};
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    filter: brightness(0.96);
  }
`;

const PermissionModeMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0;
  min-width: 240px;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  z-index: 11;
  overflow: hidden;
  padding: 0.25rem 0;
`;

const PermissionModeItem = styled.div<{ $selected: boolean; $tone: 'muted' | 'info' | 'success' | 'danger' }>`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.625rem;
  cursor: pointer;
  background: ${({ $selected }) => ($selected ? theme.blueLight : 'transparent')};
  transition: background 0.1s;

  &:hover {
    background: ${({ $selected }) => ($selected ? theme.blueLight : theme.bgSecondary)};
  }
`;

const PermissionModeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const PermissionModeDot = styled.span<{ $tone: 'muted' | 'info' | 'success' | 'danger' }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $tone }) => toneFg($tone)};
`;

const PermissionModeLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex: 1;
`;

const PermissionModeDesc = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  line-height: 1.4;
  padding-left: 1.1rem;
`;

const HeaderDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${theme.blue};
  box-shadow: 0 0 0 3px ${theme.blueLight};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const CloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${theme.textMuted};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${theme.bgTertiary};
    color: ${theme.textPrimary};
  }
`;

const SelectorRow = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
`;

const InputFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AgentTrigger = styled.button<{ $open: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.625rem;
  background: ${theme.bgSecondary};
  border: 1px solid ${({ $open }) => ($open ? theme.blue : theme.border)};
  border-radius: 6px;
  color: ${theme.textPrimary};
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
  }
`;

const AgentTriggerLeft = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1;
`;

const AgentTriggerName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

const ChevronWrap = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${theme.textMuted};
  transition: transform 0.15s ${transition};
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

const AgentMenu = styled.div`
  position: absolute;
  bottom: calc(100% + 0.375rem);
  left: 0;
  right: 0;
  min-width: 240px;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  box-shadow: 0 -8px 20px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
  padding: 0.25rem 0;
`;

const AgentMenuItem = styled.div<{ $disabled: boolean; $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  background: ${({ $selected }) => ($selected ? theme.blueLight : 'transparent')};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  transition: background 0.1s;

  &:hover {
    background: ${({ $disabled, $selected }) =>
      $disabled ? 'transparent' : ($selected ? theme.blueLight : theme.bgSecondary)};
  }
`;

const AgentItemLeft = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
`;

const AgentItemName = styled.span<{ $disabled: boolean }>`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ $disabled }) => ($disabled ? theme.textMuted : theme.textPrimary)};
`;

const AgentItemVersion = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  background: ${theme.bgTertiary};
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
`;

const AgentDot = styled.span<{ $state: ConnectionState }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $state }) => {
    if ($state === 'connected') return '#16a34a';
    if ($state === 'not_authenticated') return '#d97706';
    return theme.textMuted;
  }};
`;

const AgentItemBadge = styled.span<{ $state: ConnectionState }>`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  ${({ $state }) => {
    if ($state === 'connected') return 'background: #e6f4ea; color: #137333;';
    if ($state === 'not_authenticated') return 'background: #fef7e0; color: #b06000;';
    return 'background: #f1f3f4; color: #5f6368;';
  }}
`;

const MessagesArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem 0.5rem;
  color: ${theme.textMuted};
`;

const EmptyTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  margin-bottom: 0.4rem;
`;

const EmptyDesc = styled.div`
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${theme.textSecondary};
  max-width: 280px;
`;

const BubbleRow = styled.div<{ $role: 'user' | 'assistant' }>`
  display: flex;
  justify-content: ${({ $role }) => ($role === 'user' ? 'flex-end' : 'flex-start')};
`;

const BlockGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-width: 92%;
`;

const FoldArrow = styled.span`
  display: inline-flex;
  width: 0.75rem;
  font-size: 0.7rem;
  color: ${theme.textMuted};
`;

const Spinner = styled.span`
  margin-left: 0.25rem;
  color: ${theme.textMuted};
  animation: pulse 1.2s ease-in-out infinite;
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
`;

const TypingBubble = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  align-self: flex-start;
  padding: 0.5rem 0.75rem;
  background: ${theme.bgSecondary};
  border: 1px solid ${theme.border};
  border-radius: 14px;
  width: fit-content;
`;

const TypingDot = styled.span<{ $delay: number }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${theme.textMuted};
  animation: typing-bounce 1.1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;

  @keyframes typing-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40% { transform: translateY(-3px); opacity: 1; }
  }
`;

const ThinkingWrap = styled.div`
  border: 1px dashed ${theme.border};
  border-radius: 8px;
  background: ${theme.bgSecondary};
  font-size: 0.75rem;
  color: ${theme.textSecondary};
`;

const ThinkingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.625rem;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
`;

const ThinkingBody = styled.div`
  border-top: 1px dashed ${theme.border};
  padding: 0.5rem 0.625rem;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  color: ${theme.textMuted};
  font-style: italic;
`;

const ToolWrap = styled.div`
  border: 1px solid ${theme.border};
  border-radius: 8px;
  background: ${theme.bgPrimary};
  font-size: 0.75rem;
  overflow: hidden;
`;

const ToolHeader = styled.div<{ $error: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.625rem;
  cursor: pointer;
  user-select: none;
  background: ${({ $error }) => ($error ? '#fef2f2' : theme.bgSecondary)};
`;

const ToolName = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`;

const ToolArgPreview = styled.span`
  margin-left: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 400;
  color: ${theme.textMuted};
`;

const ToolStatus = styled.span<{ $error: boolean }>`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  ${({ $error }) =>
    $error
      ? 'background: #fee2e2; color: #b91c1c;'
      : 'background: #e6f4ea; color: #137333;'}
`;

const ToolSection = styled.div`
  border-top: 1px solid ${theme.border};
  padding: 0.5rem 0.625rem;
`;

const ToolLabel = styled.div`
  font-size: 0.625rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
`;

const ToolPre = styled.pre<{ $error?: boolean }>`
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  line-height: 1.5;
  color: ${({ $error }) => ($error ? '#b91c1c' : theme.textPrimary)};
  background: ${theme.bgSecondary};
  border-radius: 6px;
  padding: 0.5rem 0.625rem;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
`;

const IssueListWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const IssueListHeader = styled.div`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  font-weight: 500;
`;

const IssueCardWrap = styled.div<{ $compact: boolean }>`
  border: 1px solid ${theme.border};
  border-radius: 6px;
  background: ${theme.bgPrimary};
  padding: ${({ $compact }) => ($compact ? '0.4rem 0.5rem' : '0.5rem 0.625rem')};
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '0.2rem' : '0.3rem')};
`;

const IssueCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`;

const IssueKey = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  font-weight: 700;

  & > a {
    color: ${theme.blue};
    text-decoration: none;
  }
  & > a:hover {
    text-decoration: underline;
  }
`;

const StatusChip = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
`;

const PriorityChip = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: ${theme.bgTertiary};
  color: ${theme.textSecondary};
`;

const IssueSummary = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${theme.textPrimary};
  line-height: 1.4;
`;

const IssueMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.6rem;
`;

const IssueMeta = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
`;

const PageTypeChip = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: #ecfeff;
  color: #0e7490;
`;

const SpaceChip = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: ${theme.bgTertiary};
  color: ${theme.textSecondary};
`;

const PageBreadcrumb = styled.div`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  line-height: 1.3;
  word-break: break-word;
`;

const Bubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 86%;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8125rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  ${({ $role }) =>
    $role === 'user'
      ? `
        background: ${theme.blue};
        color: #fff;
        border-bottom-right-radius: 4px;
      `
      : `
        background: ${theme.bgSecondary};
        color: ${theme.textPrimary};
        border: 1px solid ${theme.border};
        border-bottom-left-radius: 4px;
      `}
`;

const MarkdownBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 86%;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8125rem;
  line-height: 1.5;
  word-break: break-word;
  ${({ $role }) =>
    $role === 'user'
      ? `
        background: ${theme.blue};
        color: #fff;
        border-bottom-right-radius: 4px;
      `
      : `
        background: ${theme.bgSecondary};
        color: ${theme.textPrimary};
        border: 1px solid ${theme.border};
        border-bottom-left-radius: 4px;
      `}

  & > *:first-child { margin-top: 0; }
  & > *:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 0.75rem 0 0.5rem;
    font-weight: 600;
    line-height: 1.3;
  }
  h1 { font-size: 1.05rem; }
  h2 { font-size: 1rem; }
  h3 { font-size: 0.95rem; }
  h4 { font-size: 0.875rem; }
  h5, h6 { font-size: 0.8125rem; color: ${theme.textSecondary}; }

  p { margin: 0.4rem 0; white-space: pre-wrap; }

  ul, ol {
    margin: 0.4rem 0;
    padding-left: 1.25rem;
  }
  li { margin: 0.15rem 0; }
  li > p { margin: 0; }

  strong { font-weight: 700; }
  em { font-style: italic; }
  del { text-decoration: line-through; opacity: 0.7; }

  a {
    color: ${theme.blue};
    text-decoration: underline;
  }

  blockquote {
    margin: 0.4rem 0;
    padding: 0.1rem 0.75rem;
    border-left: 3px solid ${theme.border};
    color: ${theme.textSecondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${theme.border};
    margin: 0.6rem 0;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.06);
    padding: 0.05rem 0.3rem;
    border-radius: 4px;
  }
  pre {
    background: ${theme.bgPrimary};
    border: 1px solid ${theme.border};
    border-radius: 6px;
    padding: 0.5rem 0.625rem;
    overflow-x: auto;
    margin: 0.4rem 0;
  }
  pre code {
    background: transparent;
    padding: 0;
    font-size: 0.7rem;
    line-height: 1.45;
    color: ${theme.textPrimary};
  }

  table {
    border-collapse: collapse;
    margin: 0.5rem 0;
    font-size: 0.75rem;
    width: 100%;
    display: block;
    overflow-x: auto;
  }
  thead { background: ${theme.bgTertiary}; }
  th, td {
    border: 1px solid ${theme.border};
    padding: 0.25rem 0.5rem;
    text-align: left;
    vertical-align: top;
  }
  th { font-weight: 600; }

  /* user 버블에서는 색 대비 위해 일부 요소 색상 보정 */
  ${({ $role }) =>
    $role === 'user' &&
    `
      a { color: #fff; }
      code { background: rgba(255, 255, 255, 0.18); color: #fff; }
      pre { background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.25); }
      pre code { color: #fff; }
      blockquote { border-left-color: rgba(255, 255, 255, 0.4); color: rgba(255, 255, 255, 0.85); }
      hr { border-top-color: rgba(255, 255, 255, 0.3); }
      th, td { border-color: rgba(255, 255, 255, 0.3); }
      thead { background: rgba(255, 255, 255, 0.1); }
    `}
`;

const InputArea = styled.div`
  position: relative;
  padding: 0.625rem 0.75rem 0.875rem;
  border-top: 1px solid ${theme.border};
  background: ${theme.bgPrimary};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const PermissionDialog = styled.div`
  margin: 0 0.75rem;
  padding: 0.75rem;
  border: 1px solid #fcd34d;
  background: #fffbeb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const PermissionTitle = styled.div`
  font-size: 0.8125rem;
  font-weight: 700;
  color: #92400e;
`;

const PermissionRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const PermissionLabel = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const PermissionTool = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const PermissionInputBox = styled.pre`
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  line-height: 1.4;
  color: ${theme.textPrimary};
  background: #fff;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 0.5rem;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
`;

const PermissionActions = styled.div`
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
`;

const DenyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid ${theme.border};
  background: ${theme.bgPrimary};
  color: ${theme.textSecondary};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    border-color: #b91c1c;
    color: #b91c1c;
  }
`;

const AllowBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid #16a34a;
  background: #16a34a;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;

  &:hover { background: #15803d; }
`;

const SlashMenu = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0.75rem;
  right: 0.75rem;
  margin-bottom: 0.25rem;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  box-shadow: 0 -8px 20px rgba(0, 0, 0, 0.1);
  max-height: 240px;
  overflow-y: auto;
  z-index: 12;
  padding: 0.25rem 0;
`;

const SlashMenuHeader = styled.div`
  padding: 0.25rem 0.625rem 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const SlashItem = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.4rem 0.625rem;
  cursor: pointer;
  background: ${({ $active }) => ($active ? theme.blueLight : 'transparent')};
  border-left: 2px solid ${({ $active }) => ($active ? theme.blue : 'transparent')};
  transition: background 0.1s;

  &:hover {
    background: ${theme.blueLight};
  }
`;

const SlashItemHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
`;

const SlashItemName = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const SlashItemArgs = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  color: ${theme.textMuted};
`;

const SlashItemSource = styled.span`
  margin-left: auto;
  font-size: 0.625rem;
  font-weight: 600;
  color: ${theme.textMuted};
  background: ${theme.bgTertiary};
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  white-space: nowrap;
`;

const SlashItemDesc = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  line-height: 1.4;
`;

const CommandHintRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.125rem;
`;

const CommandHintBadge = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const CommandHintCmd = styled.span`
  display: inline-flex;
  align-items: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${theme.blue};
  background: ${theme.blueLight};
  border: 1px solid ${theme.blue};
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  line-height: 1.4;
`;

const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  resize: none;
  border: 1px solid ${theme.border};
  border-radius: 8px;
  background: ${theme.bgPrimary};
  color: ${theme.textPrimary};
  font-size: 0.8125rem;
  line-height: 1.5;
  padding: 0.5rem 0.625rem;
  font-family: inherit;
  transition: border-color 0.15s ${transition};

  &:focus {
    outline: none;
    border-color: ${theme.blue};
  }

  &::placeholder {
    color: ${theme.textMuted};
  }
`;

const SendBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid transparent;
  background: ${theme.blue};
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover:not(:disabled) {
    background: ${theme.blueDark};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &[data-variant='cancel'] {
    background: #b91c1c;
  }
  &[data-variant='cancel']:hover {
    background: #991b1b;
  }
`;
