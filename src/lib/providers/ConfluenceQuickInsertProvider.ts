/**
 * Confluence 전용 QuickInsert(/ 커맨드) 프로바이더
 *
 * @atlaskit/editor-core 의 built-in 아이템(제목, 코드블록, 표, 패널 등)에 더해
 * Confluence 매크로에 대응하는 커스텀 아이템을 추가한다.
 */
import type { QuickInsertProvider } from '@atlaskit/editor-common/provider-factory';

type QuickInsertActionInsert = (
  node?: any,
  opts?: { selectInlineNode?: boolean },
) => any;

type QuickInsertItem = {
  title: string;
  description?: string;
  keywords?: string[];
  categories?: string[];
  priority?: number;
  icon?: () => React.ReactElement;
  action: (insert: QuickInsertActionInsert, state: any) => any;
  [key: string]: any;
};

/** Confluence 커스텀 / 커맨드 아이템 목록 */
function getConfluenceItems(): QuickInsertItem[] {
  return [
    // ── 패널 계열 ──
    {
      title: '정보 패널',
      description: '정보를 강조하는 파란색 패널',
      keywords: ['info', 'panel', '정보', '안내'],
      categories: ['formatting'],
      priority: 20,
      action: (insert, state) => {
        const { panel, paragraph } = state.schema.nodes;
        if (!panel) return false;
        const node = panel.createChecked(
          { panelType: 'info' },
          paragraph.createChecked(null, []),
        );
        return insert(node);
      },
    },
    {
      title: '노트 패널',
      description: '참고 사항을 표시하는 보라색 패널',
      keywords: ['note', 'panel', '노트', '참고'],
      categories: ['formatting'],
      priority: 21,
      action: (insert, state) => {
        const { panel, paragraph } = state.schema.nodes;
        if (!panel) return false;
        const node = panel.createChecked(
          { panelType: 'note' },
          paragraph.createChecked(null, []),
        );
        return insert(node);
      },
    },
    {
      title: '성공 패널',
      description: '성공 메시지를 표시하는 초록색 패널',
      keywords: ['success', 'panel', 'tip', '성공', '완료', '팁'],
      categories: ['formatting'],
      priority: 22,
      action: (insert, state) => {
        const { panel, paragraph } = state.schema.nodes;
        if (!panel) return false;
        const node = panel.createChecked(
          { panelType: 'success' },
          paragraph.createChecked(null, []),
        );
        return insert(node);
      },
    },
    {
      title: '경고 패널',
      description: '주의 사항을 표시하는 노란색 패널',
      keywords: ['warning', 'panel', '경고', '주의'],
      categories: ['formatting'],
      priority: 23,
      action: (insert, state) => {
        const { panel, paragraph } = state.schema.nodes;
        if (!panel) return false;
        const node = panel.createChecked(
          { panelType: 'warning' },
          paragraph.createChecked(null, []),
        );
        return insert(node);
      },
    },
    {
      title: '오류 패널',
      description: '오류 정보를 표시하는 빨간색 패널',
      keywords: ['error', 'panel', '오류', '에러'],
      categories: ['formatting'],
      priority: 24,
      action: (insert, state) => {
        const { panel, paragraph } = state.schema.nodes;
        if (!panel) return false;
        const node = panel.createChecked(
          { panelType: 'error' },
          paragraph.createChecked(null, []),
        );
        return insert(node);
      },
    },

    // ── 작업 관련 ──
    {
      title: '작업 항목',
      description: '체크박스가 있는 할 일 목록',
      keywords: ['task', 'action', 'todo', 'checkbox', '작업', '할일', '체크'],
      categories: ['action'],
      priority: 10,
      action: (insert, state) => {
        const { taskList, taskItem } = state.schema.nodes;
        if (!taskList || !taskItem) return false;
        const item = taskItem.createChecked(
          { localId: crypto.randomUUID(), state: 'TODO' },
          [],
        );
        const list = taskList.createChecked({ localId: crypto.randomUUID() }, [item]);
        return insert(list);
      },
    },
    {
      title: '결정 사항',
      description: '결정 내용을 기록',
      keywords: ['decision', '결정', '의사결정'],
      categories: ['action'],
      priority: 11,
      action: (insert, state) => {
        const { decisionList, decisionItem } = state.schema.nodes;
        if (!decisionList || !decisionItem) return false;
        const item = decisionItem.createChecked(
          { localId: crypto.randomUUID(), state: 'DECIDED' },
          [],
        );
        const list = decisionList.createChecked({ localId: crypto.randomUUID() }, [item]);
        return insert(list);
      },
    },

    // ── 레이아웃 ──
    {
      title: '2단 레이아웃',
      description: '콘텐츠를 두 열로 나누기',
      keywords: ['layout', 'column', '레이아웃', '열', '단', '2단'],
      categories: ['formatting'],
      priority: 30,
      action: (insert, state) => {
        const { layoutSection, layoutColumn, paragraph } = state.schema.nodes;
        if (!layoutSection || !layoutColumn) return false;
        const col = (width: number) =>
          layoutColumn.createChecked({ width }, paragraph.createChecked(null, []));
        const section = layoutSection.createChecked(null, [col(50), col(50)]);
        return insert(section);
      },
    },
    {
      title: '3단 레이아웃',
      description: '콘텐츠를 세 열로 나누기',
      keywords: ['layout', 'column', '레이아웃', '3단', '세열'],
      categories: ['formatting'],
      priority: 31,
      action: (insert, state) => {
        const { layoutSection, layoutColumn, paragraph } = state.schema.nodes;
        if (!layoutSection || !layoutColumn) return false;
        const col = (width: number) =>
          layoutColumn.createChecked({ width }, paragraph.createChecked(null, []));
        const section = layoutSection.createChecked(null, [col(33.33), col(33.33), col(33.33)]);
        return insert(section);
      },
    },

    // ── 확장 / 펼치기 ──
    {
      title: '펼치기/접기',
      description: '접을 수 있는 콘텐츠 영역',
      keywords: ['expand', 'collapse', 'toggle', '펼치기', '접기', '확장'],
      categories: ['formatting'],
      priority: 15,
      action: (insert, state) => {
        const { expand, paragraph } = state.schema.nodes;
        if (!expand) return false;
        const node = expand.createChecked(
          { title: '' },
          paragraph.createChecked(null, []),
        );
        return insert(node);
      },
    },

    // ── 콘텐츠 삽입 관련 ──
    {
      title: '구분선',
      description: '수평 구분선 삽입',
      keywords: ['divider', 'rule', 'separator', 'hr', '구분선', '줄'],
      categories: ['formatting'],
      priority: 40,
      action: (insert, state) => {
        const { rule } = state.schema.nodes;
        if (!rule) return false;
        return insert(rule.createChecked());
      },
    },
    {
      title: '인용',
      description: '인용문 블록 삽입',
      keywords: ['quote', 'blockquote', '인용', '인용문'],
      categories: ['formatting'],
      priority: 41,
      action: (insert, state) => {
        const { blockquote, paragraph } = state.schema.nodes;
        if (!blockquote) return false;
        const node = blockquote.createChecked(
          null,
          paragraph.createChecked(null, []),
        );
        return insert(node);
      },
    },

    // ── Confluence 매크로 대응 ──
    {
      title: '작업 보고서',
      description: '작업 항목 목록을 포함한 보고서 템플릿',
      keywords: ['report', 'task report', '작업보고서', '보고서', '업무보고'],
      categories: ['confluence'],
      priority: 50,
      action: (insert, state) => {
        const { panel, paragraph, heading, taskList, taskItem, rule } = state.schema.nodes;
        if (!panel || !paragraph) return false;

        const content: any[] = [];

        // 제목
        if (heading) {
          content.push(heading.createChecked({ level: 3 }, state.schema.text('작업 보고서')));
        }

        // 구분선
        if (rule) content.push(rule.createChecked());

        // 완료 항목 섹션
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('완료된 작업')));
        }
        if (taskList && taskItem) {
          const item = taskItem.createChecked(
            { localId: crypto.randomUUID(), state: 'TODO' },
            [],
          );
          content.push(taskList.createChecked({ localId: crypto.randomUUID() }, [item]));
        }

        // 진행 중 섹션
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('진행 중인 작업')));
        }
        if (taskList && taskItem) {
          const item = taskItem.createChecked(
            { localId: crypto.randomUUID(), state: 'TODO' },
            [],
          );
          content.push(taskList.createChecked({ localId: crypto.randomUUID() }, [item]));
        }

        // 예정 작업 섹션
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('예정된 작업')));
        }
        if (taskList && taskItem) {
          const item = taskItem.createChecked(
            { localId: crypto.randomUUID(), state: 'TODO' },
            [],
          );
          content.push(taskList.createChecked({ localId: crypto.randomUUID() }, [item]));
        }

        // 패널로 래핑
        if (content.length > 0) {
          const panelNode = panel.createChecked({ panelType: 'info' }, content);
          return insert(panelNode);
        }
        return false;
      },
    },
    {
      title: '컨텐츠 포함',
      description: '정보 패널 안에 참고 콘텐츠를 작성하는 영역',
      keywords: ['include', 'embed', 'content', '포함', '컨텐츠', '삽입', '참고'],
      categories: ['confluence'],
      priority: 51,
      action: (insert, state) => {
        const { panel, paragraph, heading } = state.schema.nodes;
        if (!panel || !paragraph) return false;

        const content: any[] = [];
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('포함된 콘텐츠')));
        }
        content.push(paragraph.createChecked(null, []));

        const node = panel.createChecked({ panelType: 'note' }, content);
        return insert(node);
      },
    },
    {
      title: '회의록',
      description: '회의록 템플릿 삽입',
      keywords: ['meeting', 'minutes', '회의록', '미팅', '회의'],
      categories: ['confluence'],
      priority: 52,
      action: (insert, state) => {
        const { panel, paragraph, heading, taskList, taskItem, rule } = state.schema.nodes;
        if (!panel || !paragraph) return false;

        const content: any[] = [];

        if (heading) {
          content.push(heading.createChecked({ level: 3 }, state.schema.text('회의록')));
        }
        if (rule) content.push(rule.createChecked());

        // 참석자
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('참석자')));
        }
        content.push(paragraph.createChecked(null, []));

        // 안건
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('안건')));
        }
        content.push(paragraph.createChecked(null, []));

        // 논의 내용
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('논의 내용')));
        }
        content.push(paragraph.createChecked(null, []));

        // 결정 사항 & 액션 아이템
        if (heading) {
          content.push(heading.createChecked({ level: 4 }, state.schema.text('액션 아이템')));
        }
        if (taskList && taskItem) {
          const item = taskItem.createChecked(
            { localId: crypto.randomUUID(), state: 'TODO' },
            [],
          );
          content.push(taskList.createChecked({ localId: crypto.randomUUID() }, [item]));
        }

        const panelNode = panel.createChecked({ panelType: 'info' }, content);
        return insert(panelNode);
      },
    },
  ];
}

/** QuickInsertProvider 인스턴스 생성 */
export function createConfluenceQuickInsertProvider(): Promise<QuickInsertProvider> {
  return Promise.resolve({
    getItems: () => Promise.resolve(getConfluenceItems()),
  });
}
