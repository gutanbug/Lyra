import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { ArrowLeft, GripVertical, RotateCcw } from 'lucide-react';

import { jiraTheme } from 'lib/styles/jiraTheme';
import zIndex from 'lib/styles/zIndex';
import { integrationController } from 'controllers/account';
import {
  loadProjectFieldConfigAsync,
  saveProjectFieldConfig,
  type ProjectFieldConfig,
  type ProjectFieldEntry,
} from 'lib/utils/storageHelpers';
import type { JiraProjectField } from 'types/jira';

interface Props {
  accountId: string;
  projectKey: string;
  projectName?: string;
  onBack: () => void;
  onClose: () => void;
  onSaved?: (projectKey: string, config: ProjectFieldConfig) => void;
}

interface FieldRow extends ProjectFieldEntry {
  meta: JiraProjectField;
}

/**
 * Jira에서 항상 노출되거나 별도 영역으로 다루는 필드.
 * 사용자 설정 대상에서 제외하며 상세 페이지에서도 config와 무관하게 처리.
 *  - 본문 섹션(설명/첨부/하위업무/댓글/연결된 이슈): 무조건 기본 순서로 렌더
 *  - 요약/우선순위/이슈 유형: 헤더에 무조건 노출
 *  - 프로젝트: 브레드크럼/탭에서 다루므로 상세 페이지 필드로 표시 안 함
 * (jiraDetailFieldConfig의 처리 규칙과 동기화 필요)
 */
const ALWAYS_SHOWN_FIELD_IDS = new Set([
  'description', 'attachment', 'subtasks', 'comment', 'issuelinks',
  'summary', 'issuetype', 'priority', 'project',
]);

/**
 * 신규 프로젝트(저장 이력 없음) 진입 시 기본 활성 필드.
 * 헤더 status + MetaGrid 5종. summary/issuetype/priority는 ALWAYS_SHOWN으로
 * 분리되어 모달에 보이지 않으므로 포함하지 않음.
 */
const DEFAULT_ENABLED_FIELDS = new Set([
  // 헤더 코어 (사용자 토글 가능한 것)
  'status',
  // MetaGrid
  'assignee', 'reporter', 'created', 'updated', 'duedate',
]);

/** 메타와 저장된 설정을 병합. 항상 노출 필드는 list에서 제외. 설정이 없으면 기본 enabled 적용. */
const mergeFieldsWithConfig = (
  meta: JiraProjectField[],
  config: ProjectFieldConfig | null,
): FieldRow[] => {
  // 본문 섹션은 사용자가 토글/순서 조정할 수 없으므로 사전에 제거
  const filteredMeta = meta.filter((m) => !ALWAYS_SHOWN_FIELD_IDS.has(m.id));
  const metaMap = new Map(filteredMeta.map((m) => [m.id, m]));

  if (!config || config.fields.length === 0) {
    return filteredMeta.map((m) => ({
      id: m.id,
      enabled: DEFAULT_ENABLED_FIELDS.has(m.id),
      meta: m,
    }));
  }
  const seen = new Set<string>();
  const ordered: FieldRow[] = [];
  // 1) 저장된 순서대로 (메타에 존재 + 항상노출 아닌 것만)
  config.fields.forEach((entry) => {
    if (ALWAYS_SHOWN_FIELD_IDS.has(entry.id)) return;
    const m = metaMap.get(entry.id);
    if (!m) return;
    seen.add(entry.id);
    ordered.push({ id: entry.id, enabled: entry.enabled, label: entry.label, meta: m });
  });
  // 2) 메타에는 있지만 설정에 없는 신규 필드는 비활성으로 뒤에 추가
  filteredMeta.forEach((m) => {
    if (!seen.has(m.id)) ordered.push({ id: m.id, enabled: false, meta: m });
  });
  return ordered;
};

const JiraProjectFieldSettingsModal = ({ accountId, projectKey, projectName, onBack, onClose, onSaved }: Props) => {
  const [meta, setMeta] = useState<JiraProjectField[]>([]);
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [fieldsResult, savedConfig] = await Promise.all([
          integrationController.invoke({
            accountId,
            serviceType: 'jira',
            action: 'getProjectFields',
            params: { projectKey },
          }) as Promise<JiraProjectField[]>,
          loadProjectFieldConfigAsync(accountId, projectKey),
        ]);
        if (cancelled) return;
        const fields = Array.isArray(fieldsResult) ? fieldsResult : [];
        setMeta(fields);
        setRows(mergeFieldsWithConfig(fields, savedConfig));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accountId, projectKey]);

  // 선택된 필드(드래그 가능)와 미선택 필드(고정 목록)로 분리해 노출.
  const selectedRows = useMemo(() => rows.filter((r) => r.enabled), [rows]);
  const unselectedRows = useMemo(() => rows.filter((r) => !r.enabled), [rows]);
  const enabledCount = selectedRows.length;

  /**
   * 드래그는 selectedRows 내부에서만 동작.
   * onDragEnd에서 받는 index는 selectedRows 기준이므로, 전체 rows에서
   * "selected 영역의 순서"만 재배열한 뒤 unselected를 그대로 뒤에 붙인다.
   */
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    const reordered = selectedRows.slice();
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setRows([...reordered, ...unselectedRows]);
  };

  /**
   * 토글: enabled로 바뀌면 selected 끝으로, disabled로 바뀌면 unselected 시작으로 이동.
   * 두 동작 모두 "selected/unselected 경계 위치"로 항목을 이동시키는 결과.
   */
  const toggleEnabled = (id: string) => {
    setRows((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;
      const updated: FieldRow = { ...target, enabled: !target.enabled };
      const without = prev.filter((r) => r.id !== id);
      const sel = without.filter((r) => r.enabled);
      const uns = without.filter((r) => !r.enabled);
      return updated.enabled
        ? [...sel, updated, ...uns]
        : [...sel, updated, ...uns];
    });
  };

  const setLabel = (id: string, label: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, label: label.trim() === '' ? undefined : label } : r)),
    );
  };

  const resetLabel = (id: string) => setLabel(id, '');

  const handleReset = () => {
    setRows(mergeFieldsWithConfig(meta, null));
    setEditingLabelId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const config: ProjectFieldConfig = {
      fields: rows.map(({ id, enabled, label }) => ({ id, enabled, ...(label ? { label } : {}) })),
    };
    try {
      await saveProjectFieldConfig(accountId, projectKey, config);
    } catch (err) {
      // 저장 실패 시 모달을 유지해 사용자가 재시도 또는 취소를 선택하게 한다.
      setError(`저장 실패: ${err instanceof Error ? err.message : String(err)}`);
      setSaving(false);
      return;
    }
    onSaved?.(projectKey, config);
    setSaving(false);
    onBack();
  };

  /** 단일 row 본문 렌더 — 드래그 가능 / 정적 둘 다 같은 마크업 사용 */
  const renderRowContent = (row: FieldRow, withHandle: boolean, dragHandleProps?: any) => (
    <>
      <Handle {...(withHandle ? dragHandleProps : {})} aria-label={withHandle ? '드래그' : undefined} $disabled={!withHandle}>
        <GripVertical size={14} />
      </Handle>
      <Checkbox
        type="checkbox"
        checked={row.enabled}
        onChange={() => toggleEnabled(row.id)}
      />
      <NameCol>
        {editingLabelId === row.id ? (
          <LabelInput
            autoFocus
            defaultValue={row.label ?? row.meta.name}
            onBlur={(e) => {
              setLabel(row.id, e.target.value);
              setEditingLabelId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setLabel(row.id, (e.target as HTMLInputElement).value);
                setEditingLabelId(null);
              } else if (e.key === 'Escape') {
                setEditingLabelId(null);
              }
            }}
          />
        ) : (
          <NameBtn type="button" onClick={() => setEditingLabelId(row.id)}>
            {row.label ?? row.meta.name}
            {row.label && (
              <Override
                title="원본명 사용으로 되돌리기"
                onClick={(e) => {
                  e.stopPropagation();
                  resetLabel(row.id);
                }}
              >
                ↺
              </Override>
            )}
          </NameBtn>
        )}
        <Original>
          {row.label && row.label !== row.meta.name && (
            <span title="원본 필드명">원본: {row.meta.name}</span>
          )}
        </Original>
      </NameCol>
      <Meta>
        {row.meta.required && <RequiredTag>필수</RequiredTag>}
      </Meta>
    </>
  );

  const dialog = (
    <Overlay onMouseDown={onClose}>
      <Panel onMouseDown={(e) => e.stopPropagation()}>
        <Header>
          <BackBtn type="button" onClick={onBack} aria-label="뒤로">
            <ArrowLeft size={16} />
          </BackBtn>
          <TitleArea>
            <Title>필드 설정</Title>
            <Sub>{projectName ? `${projectName} (${projectKey})` : projectKey}</Sub>
          </TitleArea>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">×</CloseBtn>
        </Header>

        <Toolbar>
          <Hint>
            선택된 필드만 드래그로 순서 변경 가능 · 체크로 표시 여부 · 라벨 클릭으로 표시명 변경
            {!loading && ` · ${enabledCount}/${rows.length} 활성`}
          </Hint>
          <ResetBtn type="button" onClick={handleReset} disabled={loading}>
            <RotateCcw size={12} /> 초기화
          </ResetBtn>
        </Toolbar>

        <Body>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {loading ? (
            <Empty>필드 메타 로딩 중...</Empty>
          ) : rows.length === 0 ? (
            <Empty>이 프로젝트에 노출된 필드가 없습니다.</Empty>
          ) : (
            <>
              {/* 선택된 필드 — 드래그로 순서 조정 가능 */}
              <SectionTitle>선택된 필드 ({selectedRows.length})</SectionTitle>
              {selectedRows.length === 0 ? (
                <Empty>선택된 필드가 없습니다. 아래 목록에서 추가하세요.</Empty>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable
                    droppableId="selected-fields"
                    /**
                     * renderClone: 드래그 중인 항목을 portal에 별도 렌더해
                     * 부모 컨테이너의 transform/zoom 영향을 받지 않게 한다.
                     */
                    renderClone={(provided, _snapshot, rubric) => {
                      const row = selectedRows[rubric.source.index];
                      return (
                        <Row
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          $dragging
                          $disabled={false}
                        >
                          {renderRowContent(row, true, provided.dragHandleProps)}
                        </Row>
                      );
                    }}
                  >
                    {(droppable) => (
                      <List ref={droppable.innerRef} {...droppable.droppableProps}>
                        {selectedRows.map((row, index) => (
                          <Draggable key={row.id} draggableId={row.id} index={index}>
                            {(draggable, snapshot) => (
                              <Row
                                ref={draggable.innerRef}
                                {...draggable.draggableProps}
                                $dragging={snapshot.isDragging}
                                $disabled={false}
                              >
                                {renderRowContent(row, true, draggable.dragHandleProps)}
                              </Row>
                            )}
                          </Draggable>
                        ))}
                        {droppable.placeholder}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
              )}

              {/* 미선택 필드 — 정적 목록, 체크해서 선택 영역으로 이동 */}
              {unselectedRows.length > 0 && (
                <>
                  <SectionTitle $top>미선택 필드 ({unselectedRows.length})</SectionTitle>
                  <List>
                    {unselectedRows.map((row) => (
                      <Row key={row.id} $dragging={false} $disabled>
                        {renderRowContent(row, false)}
                      </Row>
                    ))}
                  </List>
                </>
              )}
            </>
          )}
        </Body>

        <Footer>
          <SecondaryBtn type="button" onClick={onBack} disabled={saving}>취소</SecondaryBtn>
          <PrimaryBtn type="button" onClick={handleSave} disabled={loading || saving}>
            {saving ? '저장 중...' : '저장'}
          </PrimaryBtn>
        </Footer>
      </Panel>
    </Overlay>
  );

  return createPortal(dialog, document.getElementById('portal-root') || document.body);
};

export default JiraProjectFieldSettingsModal;

// ── Styled Components ──

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${zIndex.modal};
  /* 위/아래 시각적 여백 — Panel max-height와 함께 동작 */
  padding: 6vh 1rem;
`;

const Panel = styled.div`
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 6px;
  width: 640px;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
`;

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
`;

const TitleArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const Sub = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  &:hover { color: ${jiraTheme.text.primary}; }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
  background: ${jiraTheme.bg.subtle};
`;

const Hint = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};
`;

const ResetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  &:not(:disabled):hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0.5rem 0.75rem;
  min-height: 200px;
`;

const Empty = styled.div`
  padding: 2rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
`;

const ErrorMsg = styled.div`
  margin: 0.75rem 1.25rem;
  font-size: 0.75rem;
  color: ${jiraTheme.priority.high};
  background: #FFEBE6;
  padding: 0.5rem 0.625rem;
  border-radius: 4px;
`;

const SectionTitle = styled.div<{ $top?: boolean }>`
  padding: ${({ $top }) => ($top ? '1rem 1rem 0.375rem' : '0.5rem 1rem 0.375rem')};
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${jiraTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0.75rem;
`;

const Row = styled.div<{ $dragging: boolean; $disabled: boolean }>`
  display: grid;
  grid-template-columns: 24px 18px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid ${({ $dragging }) => ($dragging ? jiraTheme.primary : 'transparent')};
  border-radius: 4px;
  background: ${({ $dragging }) => ($dragging ? jiraTheme.primaryLight : jiraTheme.bg.default)};
  opacity: ${({ $disabled }) => ($disabled ? 0.7 : 1)};
  &:hover { background: ${({ $dragging }) => ($dragging ? jiraTheme.primaryLight : jiraTheme.bg.hover)}; }
`;

const Handle = styled.span<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $disabled }) => ($disabled ? 'transparent' : jiraTheme.text.muted)};
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'grab')};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};
  &:active { cursor: ${({ $disabled }) => ($disabled ? 'default' : 'grabbing')}; }
`;

const Checkbox = styled.input`
  cursor: pointer;
`;

const NameCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const NameBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${jiraTheme.text.primary};
  cursor: text;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  &:hover { color: ${jiraTheme.primary}; }
`;

const Override = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  padding: 0 0.25rem;
  border-radius: 4px;
  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
`;

const Original = styled.span`
  font-size: 0.6875rem;
  color: ${jiraTheme.text.muted};
`;

const LabelInput = styled.input`
  height: 24px;
  padding: 0 0.375rem;
  font-size: 0.8125rem;
  border: 1px solid ${jiraTheme.primary};
  border-radius: 3px;
  background: ${jiraTheme.bg.default};
  color: ${jiraTheme.text.primary};
  &:focus { outline: none; }
`;

const Meta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
`;

const RequiredTag = styled.span`
  font-size: 0.6875rem;
  color: #fff;
  background: ${jiraTheme.priority.high};
  padding: 1px 6px;
  border-radius: 10px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const BaseBtn = styled.button`
  height: 32px;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0 1rem;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled(BaseBtn)`
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  color: ${jiraTheme.text.primary};
  &:not(:disabled):hover { background: ${jiraTheme.bg.hover}; }
`;

const PrimaryBtn = styled(BaseBtn)`
  background: ${jiraTheme.primary};
  border: 1px solid ${jiraTheme.primary};
  color: #fff;
  &:not(:disabled):hover { background: ${jiraTheme.primaryHover}; }
`;
