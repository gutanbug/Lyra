import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronDown, Send, Square, X } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { useAgentSidebar } from 'modules/contexts/agentSidebar';
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

const AgentChatSidebar = () => {
  const history = useHistory();
  const { open, closeSidebar } = useAgentSidebar();
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
    codex: null,
    gemini: null,
  });
  const [discoveredMap, setDiscoveredMap] = useState<Record<AgentId, SlashCommand[]>>({
    claude: [],
    codex: [],
    gemini: [],
  });

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
    window.workspaceAPI?.agents?.cancelTurn?.(streamingTurnId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    setInput(cmd.args ? `${cmd.name} ` : cmd.name);
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
        <CloseBtn onClick={closeSidebar} title="닫기">
          <X size={16} />
        </CloseBtn>
      </Header>

      <MessagesArea>
        {messages.length === 0 ? (
          <EmptyState>
            <EmptyTitle>AI Agent에게 질문해보세요</EmptyTitle>
            <EmptyDesc>
              Jira 이슈, Confluence 페이지에 대한 요약·검색·분석을 도와드립니다.
            </EmptyDesc>
            <SuggestList>
              <SuggestItem>“이번 주 내 담당 이슈를 정리해줘”</SuggestItem>
              <SuggestItem>“PROJ-123 이슈의 진행 상황을 요약해줘”</SuggestItem>
              <SuggestItem>“릴리즈 노트 페이지 초안을 만들어줘”</SuggestItem>
            </SuggestList>
          </EmptyState>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'assistant' && msg.blocks && msg.blocks.length > 0) {
              return (
                <BubbleRow key={msg.id} $role="assistant">
                  <BlockGroup>
                    {msg.blocks.map((b) => (
                      <BlockView key={b.index} block={b} />
                    ))}
                    {msg.content && <Bubble $role="assistant">{msg.content}</Bubble>}
                  </BlockGroup>
                </BubbleRow>
              );
            }
            return (
              <BubbleRow key={msg.id} $role={msg.role}>
                <Bubble $role={msg.role}>{msg.content}</Bubble>
              </BubbleRow>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

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
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setSlashDismissed(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="질문을 입력하세요... ('/' 로 명령어, Shift + Enter 로 줄바꿈)"
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
              title="취소"
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

const BlockView = ({ block }: { block: AssistantBlock }) => {
  if (block.kind === 'text') {
    return (
      <Bubble $role="assistant">
        {block.text || (block.status === 'streaming' ? '…' : '')}
      </Bubble>
    );
  }
  if (block.kind === 'thinking') {
    return <ThinkingPanel block={block} />;
  }
  if (block.kind === 'tool_use') {
    return <ToolUseCard block={block} />;
  }
  return null;
};

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

const ToolUseCard = ({ block }: { block: AssistantBlock }) => {
  const [open, setOpen] = useState(false);
  const inputDisplay = block.toolInput !== undefined
    ? JSON.stringify(block.toolInput, null, 2)
    : (block.toolInputPartial ?? '');
  const result = block.toolResult;
  const statusLabel = result
    ? (result.isError ? '실패' : '완료')
    : (block.status === 'streaming' ? '실행 중…' : '대기');

  return (
    <ToolWrap>
      <ToolHeader onClick={() => setOpen((v) => !v)} $error={!!result?.isError}>
        <FoldArrow>{open ? '▾' : '▸'}</FoldArrow>
        <ToolName>{block.toolName ?? 'tool'}</ToolName>
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
              <ToolPre $error={result.isError}>{result.text || '(빈 결과)'}</ToolPre>
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
  margin-bottom: 1rem;
  max-width: 280px;
`;

const SuggestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  max-width: 320px;
`;

const SuggestItem = styled.div`
  font-size: 0.8125rem;
  color: ${theme.textSecondary};
  background: ${theme.bgSecondary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.textPrimary};
    background: ${theme.blueLight};
  }
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
