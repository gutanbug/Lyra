import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { integrationController } from 'controllers/account';
import type { JiraProjectField, JiraVersion } from 'types/jira';

/**
 * 공용 Jira 필드 입력 컴포넌트.
 *
 * 트랜지션 모달과 일반 편집 모달 양쪽에서 사용한다. 사용자 입력은 내부적으로
 * "UI value"라는 단순한 형태로 보관하며(예: option은 string id, array는 string[]),
 * 외부로는 onChange를 통해 그대로 전달한다.
 *
 * Jira API에 보내기 전에는 `serializeFieldValue(field, uiValue)`로 정규화한다.
 *
 * 지원 타입:
 *  - string / number / date / datetime → text-like 입력
 *  - option → select
 *  - array<option> → 체크리스트 (allowedValues 사용)
 *  - array<version> → 체크리스트 (프로젝트 versions IPC fetch)
 *  - array<component> → 체크리스트 (프로젝트 components IPC fetch)
 *  - user → 단일 user search
 *  - array<user> → 다중 user search (chip 형태)
 *
 * 미지원 타입은 null 반환 → 호출자가 fallback 안내(예: "Jira에서 처리").
 */

export interface JiraFieldInputProps {
  field: JiraProjectField;
  /** 단순화된 UI 상태 (option=string id, array=string[], scalar=string/number, user=accountId, user[]=accountId[]) */
  value: unknown;
  onChange: (value: unknown) => void;
  /** array<version>/array<component> 로드를 위한 컨텍스트. 미지정 시 해당 타입 비활성. */
  accountId?: string;
  projectKey?: string;
}

interface UserOption {
  accountId: string;
  displayName: string;
  avatarUrl?: string;
}

interface OptionLite {
  id: string;
  label: string;
}

const toOptionLites = (raw: unknown): OptionLite[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => {
      const o = v as Record<string, unknown>;
      const id = String(o.id ?? o.value ?? o.name ?? '');
      const label = String(o.value ?? o.name ?? id);
      return id ? { id, label } : null;
    })
    .filter((x): x is OptionLite => x !== null);
};

/** 입력 컴포넌트가 이 schema를 처리할 수 있는지. UI/serialize 함수와 1:1 동기화 필요. */
export const isFieldInputSupported = (field: JiraProjectField): boolean => {
  const { type, items } = field.schema;
  if (type === 'string' || type === 'number' || type === 'date' || type === 'datetime') return true;
  if (type === 'option') return true;
  if (type === 'user') return true;
  if (type === 'array') {
    return items === 'option' || items === 'version' || items === 'component' || items === 'user';
  }
  return false;
};

/** UI value → Jira API JSON 형태로 직렬화. */
export const serializeFieldValue = (field: JiraProjectField, uiValue: unknown): unknown => {
  const { type, items } = field.schema;
  if (uiValue === undefined || uiValue === null || uiValue === '') return null;

  if (type === 'string' || type === 'date' || type === 'datetime') return String(uiValue);
  if (type === 'number') return Number(uiValue);
  if (type === 'option') return { id: String(uiValue) };
  if (type === 'user') return { accountId: String(uiValue) };

  if (type === 'array' && Array.isArray(uiValue)) {
    const arr = uiValue as string[];
    if (items === 'option' || items === 'version' || items === 'component') {
      return arr.map((id) => ({ id }));
    }
    if (items === 'user') return arr.map((accountId) => ({ accountId }));
  }

  return uiValue;
};

const JiraFieldInput = ({ field, value, onChange, accountId, projectKey }: JiraFieldInputProps) => {
  const { type, items } = field.schema;

  if (type === 'string') {
    return <TextInput type="text" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  if (type === 'number') {
    return <TextInput type="number" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  if (type === 'date') {
    return <TextInput type="date" value={(value as string)?.slice(0, 10) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  if (type === 'datetime') {
    // input[type=datetime-local]는 yyyy-MM-ddTHH:mm 형태만 허용
    const v = (value as string) ?? '';
    return (
      <TextInput
        type="datetime-local"
        value={v.length >= 16 ? v.slice(0, 16) : v}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (type === 'option') {
    const options = toOptionLites(field.allowedValues);
    return (
      <Select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>선택하세요</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </Select>
    );
  }

  if (type === 'array' && items === 'option') {
    return <CheckList options={toOptionLites(field.allowedValues)} value={(value as string[]) ?? []} onChange={onChange} emptyMsg="옵션이 없습니다." />;
  }
  if (type === 'array' && items === 'version') {
    return <ResourceCheckList resource="versions" accountId={accountId} projectKey={projectKey} value={(value as string[]) ?? []} onChange={onChange} />;
  }
  if (type === 'array' && items === 'component') {
    return <ResourceCheckList resource="components" accountId={accountId} projectKey={projectKey} value={(value as string[]) ?? []} onChange={onChange} />;
  }

  if (type === 'user') {
    return <UserPicker accountId={accountId} value={(value as string | undefined) ?? null} onChange={(v) => onChange(v ?? '')} />;
  }
  if (type === 'array' && items === 'user') {
    return <UserMultiPicker accountId={accountId} value={(value as string[]) ?? []} onChange={onChange} />;
  }

  return (
    <Empty>
      이 필드 타입({type}{items ? `/${items}` : ''})은 앱에서 입력할 수 없습니다.
    </Empty>
  );
};

export default JiraFieldInput;

// ── Sub: CheckList (정적 옵션) ──

interface CheckListProps {
  options: OptionLite[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyMsg?: string;
}

const CheckList = ({ options, value, onChange, emptyMsg = '항목이 없습니다.' }: CheckListProps) => {
  if (options.length === 0) return <Empty>{emptyMsg}</Empty>;
  const set = new Set(value);
  return (
    <ListBox>
      {options.map((opt) => {
        const checked = set.has(opt.id);
        return (
          <CheckRow key={opt.id}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                onChange(e.target.checked ? [...value, opt.id] : value.filter((x) => x !== opt.id));
              }}
            />
            {opt.label}
          </CheckRow>
        );
      })}
    </ListBox>
  );
};

// ── Sub: ResourceCheckList (versions/components — 프로젝트 IPC 페치) ──

interface ResourceCheckListProps {
  resource: 'versions' | 'components';
  accountId: string | undefined;
  projectKey: string | undefined;
  value: string[];
  onChange: (next: string[]) => void;
}

const ACTION_BY_RESOURCE: Record<ResourceCheckListProps['resource'], string> = {
  versions: 'getProjectVersions',
  components: 'getProjectComponents',
};

const ResourceCheckList = ({ resource, accountId, projectKey, value, onChange }: ResourceCheckListProps) => {
  const [items, setItems] = useState<JiraVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId || !projectKey) return;
    let cancelled = false;
    setItems(null);
    setError(null);
    integrationController
      .invoke({
        accountId,
        serviceType: 'jira',
        action: ACTION_BY_RESOURCE[resource],
        params: { projectKey },
      })
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r) ? (r as JiraVersion[]) : [];
        setItems(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setItems([]);
      });
    return () => { cancelled = true; };
  }, [resource, accountId, projectKey]);

  if (items === null) return <Empty>로딩 중...</Empty>;
  if (error) return <ErrorText>{error}</ErrorText>;
  const opts = items
    .filter((v) => !v.archived)
    .map((v) => ({ id: v.id, label: v.name }));
  return <CheckList options={opts} value={value} onChange={onChange} emptyMsg="등록된 항목이 없습니다." />;
};

// ── Sub: UserPicker (단일) ──

interface UserPickerProps {
  accountId: string | undefined;
  value: string | null;
  onChange: (accountId: string | null) => void;
}

const useUserSearch = (acctId: string | undefined) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!acctId) return;
    const reqId = ++reqRef.current;
    const timer = setTimeout(() => {
      setLoading(true);
      integrationController
        .invoke({ accountId: acctId, serviceType: 'jira', action: 'searchUsers', params: { query } })
        .then((r) => {
          if (reqId !== reqRef.current) return;
          const list = (Array.isArray(r) ? r : []) as Array<Record<string, unknown>>;
          setResults(
            list.map((u) => ({
              accountId: String(u.accountId ?? ''),
              displayName: String(u.displayName ?? u.name ?? ''),
              avatarUrl: ((u.avatarUrls as Record<string, string> | undefined)?.['24x24']) ?? undefined,
            })).filter((u) => u.accountId),
          );
        })
        .finally(() => {
          if (reqId === reqRef.current) setLoading(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [acctId, query]);

  return { query, setQuery, results, loading };
};

const UserPicker = ({ accountId, value, onChange }: UserPickerProps) => {
  const { query, setQuery, results, loading } = useUserSearch(accountId);
  const selected = useMemo(() => results.find((u) => u.accountId === value), [results, value]);

  return (
    <div>
      {value && (
        <ChipRow>
          <Chip>
            {selected?.displayName ?? value}
            <ChipX type="button" onClick={() => onChange(null)}>×</ChipX>
          </Chip>
        </ChipRow>
      )}
      <TextInput
        type="text"
        placeholder="사용자 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <SuggestList>
        {loading && <Empty>검색 중...</Empty>}
        {!loading && results.length === 0 && <Empty>일치하는 사용자가 없습니다.</Empty>}
        {!loading && results.map((u) => (
          <SuggestRow key={u.accountId} type="button" onClick={() => { onChange(u.accountId); setQuery(''); }}>
            {u.avatarUrl && <Avatar src={u.avatarUrl} alt="" />}
            {u.displayName}
          </SuggestRow>
        ))}
      </SuggestList>
    </div>
  );
};

// ── Sub: UserMultiPicker ──

interface UserMultiPickerProps {
  accountId: string | undefined;
  value: string[];
  onChange: (next: string[]) => void;
}

const UserMultiPicker = ({ accountId, value, onChange }: UserMultiPickerProps) => {
  const { query, setQuery, results, loading } = useUserSearch(accountId);
  const selectedSet = new Set(value);
  // 선택된 사용자 표시는 가능한 results에서 lookup, 없으면 accountId만 표기
  const selectedOptions = value.map((id) => results.find((u) => u.accountId === id) ?? { accountId: id, displayName: id });

  return (
    <div>
      {value.length > 0 && (
        <ChipRow>
          {selectedOptions.map((u) => (
            <Chip key={u.accountId}>
              {u.displayName}
              <ChipX type="button" onClick={() => onChange(value.filter((x) => x !== u.accountId))}>×</ChipX>
            </Chip>
          ))}
        </ChipRow>
      )}
      <TextInput
        type="text"
        placeholder="사용자 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <SuggestList>
        {loading && <Empty>검색 중...</Empty>}
        {!loading && results.length === 0 && <Empty>일치하는 사용자가 없습니다.</Empty>}
        {!loading &&
          results
            .filter((u) => !selectedSet.has(u.accountId))
            .map((u) => (
              <SuggestRow key={u.accountId} type="button" onClick={() => { onChange([...value, u.accountId]); setQuery(''); }}>
                {u.avatarUrl && <Avatar src={u.avatarUrl} alt="" />}
                {u.displayName}
              </SuggestRow>
            ))}
      </SuggestList>
    </div>
  );
};

// ── Styled ──

const TextInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid ${jiraTheme.borderStrong};
  border-radius: ${jiraTheme.radius.ctl};
  font-family: ${jiraTheme.font.body};
  font-size: 14px;
  background: ${jiraTheme.bg.default};
  color: ${jiraTheme.text.primary};
  transition: border-color ${jiraTheme.motion.fast}, box-shadow ${jiraTheme.motion.fast};
  &:focus { outline: none; border-color: ${jiraTheme.primary}; box-shadow: ${jiraTheme.shadow.focusRing}; }
`;

const Select = styled.select`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid ${jiraTheme.borderStrong};
  border-radius: ${jiraTheme.radius.ctl};
  font-family: ${jiraTheme.font.body};
  font-size: 14px;
  background: ${jiraTheme.bg.default};
  color: ${jiraTheme.text.primary};
  transition: border-color ${jiraTheme.motion.fast}, box-shadow ${jiraTheme.motion.fast};
  &:focus { outline: none; border-color: ${jiraTheme.primary}; box-shadow: ${jiraTheme.shadow.focusRing}; }
`;

const ListBox = styled.div`
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid ${jiraTheme.border};
  border-radius: ${jiraTheme.radius.ctl};
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ${jiraTheme.font.body};
  font-size: 13.5px;
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const Empty = styled.div`
  padding: 12px;
  font-family: ${jiraTheme.font.body};
  font-size: 12.5px;
  color: ${jiraTheme.text.muted};
`;

const ErrorText = styled.div`
  margin-top: 6px;
  font-family: ${jiraTheme.font.body};
  font-size: 12px;
  color: #dc3545;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  background: ${jiraTheme.primaryLight};
  color: ${jiraTheme.primaryHover};
  border-radius: 99px;
  font-family: ${jiraTheme.font.body};
  font-size: 12.5px;
  font-weight: 600;
`;

const ChipX = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
  transition: opacity ${jiraTheme.motion.fast};

  &:hover { opacity: 1; }
`;

const SuggestList = styled.div`
  margin-top: 6px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${jiraTheme.border};
  border-radius: ${jiraTheme.radius.ctl};
  box-shadow: ${jiraTheme.shadow.cardHover};
`;

const SuggestRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: ${jiraTheme.font.body};
  font-size: 13.5px;
  text-align: left;
  color: ${jiraTheme.text.primary};
  transition: background ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
`;
