import { formatDate } from 'lib/utils/jiraUtils';
import { formatFieldValue } from 'lib/utils/jiraCustomFieldRenderer';
import type { ProjectFieldConfig, ProjectFieldEntry } from 'lib/utils/storageHelpers';
import type { JiraProjectField, NormalizedDetail } from 'types/jira';
import type { MetaFieldDescriptor, FieldVisibility } from 'components/jira/JiraIssueHeader';

/** 헤더 카드 안에서 anchored 렌더링되는 코어 필드 ID. */
export const HEADER_CORE_FIELD_IDS = ['summary', 'issuetype', 'status', 'priority'] as const;
type HeaderCoreId = typeof HEADER_CORE_FIELD_IDS[number];

/** 헤더 MetaGrid에 행으로 표시되는 메타 필드 ID. */
export const META_FIELD_IDS = ['assignee', 'reporter', 'created', 'updated', 'duedate'] as const;
type MetaFieldId = typeof META_FIELD_IDS[number];

/** 본문 섹션으로 렌더링되는 필드 ID. */
export const SECTION_FIELD_IDS = ['description', 'attachment', 'subtasks', 'comment', 'issuelinks'] as const;
export type SectionFieldId = typeof SECTION_FIELD_IDS[number];

const HEADER_SET = new Set(HEADER_CORE_FIELD_IDS);
const META_SET = new Set(META_FIELD_IDS);
const SECTION_SET = new Set(SECTION_FIELD_IDS);

const isHeaderId = (id: string): id is HeaderCoreId => HEADER_SET.has(id as HeaderCoreId);
const isMetaId = (id: string): id is MetaFieldId => META_SET.has(id as MetaFieldId);
const isSectionId = (id: string): id is SectionFieldId => SECTION_SET.has(id as SectionFieldId);

interface BuildArgs {
  issue: NormalizedDetail;
  myDisplayName: string | undefined;
  onOpenAssignee: (issueKey: string, e: React.MouseEvent) => void;
  /** 이슈의 raw fields (customfield_xxxxx 등). 커스텀 필드 표시에 사용. */
  rawFields?: Record<string, unknown>;
  /** 프로젝트 필드 schema 맵 (id → JiraProjectField). 커스텀 필드 렌더러 선택용. */
  schemas?: Record<string, JiraProjectField>;
}

/** 단일 메타 필드 ID에 대한 descriptor 생성 (ID·라벨·값·핸들러).
 *  editable 정책:
 *  - assignee: 전용 드롭다운(onOpenAssignee)이 있으므로 generic 편집 트리거는 비표시
 *  - reporter/created/updated: 시스템 또는 read-only성 필드 — 편집 비제공
 *  - duedate: generic 편집 가능
 */
const buildMetaDescriptor = (
  id: MetaFieldId,
  labelOverride: string | undefined,
  { issue, myDisplayName, onOpenAssignee }: BuildArgs,
): MetaFieldDescriptor | null => {
  switch (id) {
    case 'assignee':
      return {
        id,
        label: labelOverride ?? '담당자',
        value: issue.assigneeName || '미지정',
        isMe: issue.assigneeName === myDisplayName,
        clickable: true,
        onClick: (e) => onOpenAssignee(issue.key, e),
      };
    case 'reporter':
      return { id, label: labelOverride ?? '보고자', value: issue.reporterName || '-' };
    case 'created':
      return { id, label: labelOverride ?? '생성일', value: formatDate(issue.created) };
    case 'updated':
      return { id, label: labelOverride ?? '수정일', value: formatDate(issue.updated) };
    case 'duedate':
      return {
        id,
        label: labelOverride ?? '마감일',
        // 값이 없을 때는 placeholder를 노출해 편집 진입 가능하게 한다
        value: issue.duedate ? issue.duedate.slice(0, 10) : '미설정',
        editable: true,
      };
    default:
      return null;
  }
};

/** 섹션 ID 별 기본 라벨. */
export const DEFAULT_SECTION_LABEL: Record<SectionFieldId, string> = {
  description: '설명',
  attachment: '첨부 이미지',
  subtasks: '하위 업무 항목',
  comment: '댓글',
  issuelinks: '연결된 업무 항목',
};

export interface ResolvedDetailFieldLayout {
  visibility: FieldVisibility;
  metaFields: MetaFieldDescriptor[];
  /** 본문 섹션 렌더 순서 + 표시 여부 + 라벨 오버라이드 */
  sections: Array<{ id: SectionFieldId; label: string }>;
}

/**
 * 저장된 ProjectFieldConfig를 상세 페이지 렌더 layout으로 변환.
 * config가 null이면 기존 기본값(전체 표시·기본 순서)을 반환해 하위호환 유지.
 */
export const resolveDetailFieldLayout = (
  config: ProjectFieldConfig | null,
  args: BuildArgs,
): ResolvedDetailFieldLayout => {
  if (!config || config.fields.length === 0) {
    // 기본 layout: 모든 코어 + 기존 메타 5종 + 기본 섹션 순서
    return {
      visibility: { summary: true, issuetype: true, status: true, priority: true },
      metaFields: META_FIELD_IDS
        .map((id) => buildMetaDescriptor(id, undefined, args))
        .filter((m): m is MetaFieldDescriptor => m !== null),
      sections: SECTION_FIELD_IDS.map((id) => ({ id, label: DEFAULT_SECTION_LABEL[id] })),
    };
  }

  const visibility: FieldVisibility = {
    summary: true,
    issuetype: true,
    status: true,
    priority: true,
  };
  const metaFields: MetaFieldDescriptor[] = [];

  // 헤더 코어는 enabled 여부만 추적 (config에 명시적으로 있을 때만 가시성 변경)
  const headerSeen: Partial<Record<HeaderCoreId, boolean>> = {};

  // 요약/이슈 유형/우선순위는 사용자 설정 대상이 아님 — 헤더에 항상 노출
  // 프로젝트는 브레드크럼/탭에서 다루므로 MetaItem으로 표시하지 않음
  const FORCE_VISIBLE_HEADER = new Set<HeaderCoreId>(['summary', 'issuetype', 'priority']);

  config.fields.forEach((entry: ProjectFieldEntry) => {
    if (FORCE_VISIBLE_HEADER.has(entry.id as HeaderCoreId)) {
      visibility[entry.id as HeaderCoreId] = true;
      return;
    }
    if (entry.id === 'project') return;

    if (isHeaderId(entry.id)) {
      headerSeen[entry.id] = true;
      visibility[entry.id] = entry.enabled;
      return;
    }
    if (!entry.enabled) return;
    if (isMetaId(entry.id)) {
      const desc = buildMetaDescriptor(entry.id, entry.label, args);
      if (desc) metaFields.push(desc);
      return;
    }
    if (isSectionId(entry.id)) {
      // 본문 섹션은 사용자 설정 대상 아님 — config의 entry 무시 (아래에서 일괄 추가)
      return;
    }
    // 화이트리스트 외 필드 — schema가 있으면 MetaItem으로 표시. 값이 비어도
    // 편집 진입은 가능하도록 placeholder를 노출.
    const schema = args.schemas?.[entry.id];
    if (!schema) return;
    const rawValue = args.rawFields?.[entry.id];
    const formatted = rawValue !== undefined && rawValue !== null
      ? formatFieldValue(schema, rawValue)
      : null;
    metaFields.push({
      id: entry.id,
      label: entry.label ?? schema.name,
      value: formatted ?? '미설정',
      editable: true,
    });
  });

  // 본문 섹션은 항상 기본 순서 + 기본 라벨로 노출 (Jira 표준 영역)
  const sections: Array<{ id: SectionFieldId; label: string }> =
    SECTION_FIELD_IDS.map((id) => ({ id, label: DEFAULT_SECTION_LABEL[id] }));

  return { visibility, metaFields, sections };
};
