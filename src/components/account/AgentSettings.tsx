import { useCallback, useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { newSnackbar } from 'modules/actions/snackbar';
import { snackbarContext } from 'modules/contexts/snackbar';
import AgentCard from 'components/account/AgentCard';
import { AGENT_IDS, AGENT_META } from 'types/agent';
import type { AgentId, AgentStatus } from 'types/agent';

const AgentSettings = () => {
  const { dispatch } = useContext(snackbarContext);
  const isElectron = typeof window !== 'undefined' && !!window.workspaceAPI?.agents;
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const [busyId, setBusyId] = useState<AgentId | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    if (!isElectron) return;
    setLoading(true);
    try {
      const all = await window.workspaceAPI!.agents.getAllStatus();
      setStatuses(all);
    } catch (err) {
      newSnackbar(dispatch, `상태 조회 실패: ${(err as Error).message}`, 'ERROR');
    } finally {
      setLoading(false);
    }
  }, [dispatch, isElectron]);

  const refreshOne = useCallback(async (id: AgentId) => {
    if (!isElectron) return;
    try {
      const next = await window.workspaceAPI!.agents.getStatus(id);
      setStatuses((prev) => prev.map((s) => (s.id === id ? next : s)));
    } catch (err) {
      newSnackbar(dispatch, `상태 조회 실패: ${(err as Error).message}`, 'ERROR');
    }
  }, [dispatch, isElectron]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const handleLogin = async (id: AgentId) => {
    setBusyId(id);
    try {
      const result = await window.workspaceAPI!.agents.login(id);
      newSnackbar(dispatch, result.message, result.ok ? 'INFO' : 'ERROR');
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async (id: AgentId) => {
    setBusyId(id);
    try {
      const result = await window.workspaceAPI!.agents.logout(id);
      newSnackbar(dispatch, result.message, result.ok ? 'SUCCESS' : 'ERROR');
      await refreshOne(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveApiKey = async (id: AgentId, key: string | null) => {
    setBusyId(id);
    try {
      const next = await window.workspaceAPI!.agents.setApiKey(id, key);
      setStatuses((prev) => prev.map((s) => (s.id === id ? next : s)));
      newSnackbar(dispatch, key ? 'API 키가 저장되었습니다.' : 'API 키가 제거되었습니다.', 'SUCCESS');
    } catch (err) {
      newSnackbar(dispatch, `저장 실패: ${(err as Error).message}`, 'ERROR');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveBinaryPath = async (id: AgentId, path: string | null) => {
    setBusyId(id);
    try {
      const next = await window.workspaceAPI!.agents.setBinaryPath(id, path);
      setStatuses((prev) => prev.map((s) => (s.id === id ? next : s)));
      newSnackbar(dispatch, '바이너리 경로가 저장되었습니다.', 'SUCCESS');
    } catch (err) {
      newSnackbar(dispatch, `저장 실패: ${(err as Error).message}`, 'ERROR');
    } finally {
      setBusyId(null);
    }
  };

  const openInstall = (id: AgentId) => {
    const url = AGENT_META[id].installUrl;
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isElectron) {
    return (
      <Notice>AI Agent CLI 관리는 Electron 데스크톱 앱에서만 사용할 수 있습니다.</Notice>
    );
  }

  return (
    <Wrap>
      <Intro>
        Claude Code · Codex · Gemini CLI 인증 정보를 관리합니다
      </Intro>

      {loading && statuses.length === 0 ? (
        <Notice>상태를 불러오는 중...</Notice>
      ) : (
        <Grid>
          {AGENT_IDS.map((id) => {
            const status = statuses.find((s) => s.id === id);
            if (!status) return null;
            return (
              <AgentCard
                key={id}
                status={status}
                busy={busyId === id}
                onLogin={() => handleLogin(id)}
                onLogout={() => handleLogout(id)}
                onRefresh={() => refreshOne(id)}
                onSaveApiKey={(key) => handleSaveApiKey(id, key)}
                onSaveBinaryPath={(p) => handleSaveBinaryPath(id, p)}
                onOpenInstall={() => openInstall(id)}
              />
            );
          })}
        </Grid>
      )}
    </Wrap>
  );
};

export default AgentSettings;

// ─── Styled Components ─────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Intro = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: ${theme.textSecondary};
  line-height: 1.5;
`;

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Notice = styled.div`
  padding: 1rem;
  border: 1px dashed ${theme.border};
  border-radius: 8px;
  background: ${theme.bgSecondary};
  color: ${theme.textMuted};
  font-size: 0.875rem;
`;
