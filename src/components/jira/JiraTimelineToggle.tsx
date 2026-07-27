import styled from 'styled-components';
import { List, GanttChartSquare } from 'lucide-react';
import { SegmentedGroup, SegmentedIconBtn } from 'lib/styles/segmentedToggle';

export type JiraViewMode = 'list' | 'timeline';

interface Props {
  value: JiraViewMode;
  onChange: (next: JiraViewMode) => void;
}

const JiraTimelineToggle = ({ value, onChange }: Props) => (
  <Group role="tablist" aria-label="뷰 전환">
    <SegmentedIconBtn
      type="button"
      role="tab"
      aria-selected={value === 'list'}
      aria-label="리스트 뷰"
      title="리스트 뷰"
      $active={value === 'list'}
      onClick={() => onChange('list')}
    >
      <List size={15} />
    </SegmentedIconBtn>
    <SegmentedIconBtn
      type="button"
      role="tab"
      aria-selected={value === 'timeline'}
      aria-label="타임라인 뷰"
      title="타임라인 뷰"
      $active={value === 'timeline'}
      onClick={() => onChange('timeline')}
    >
      <GanttChartSquare size={15} />
    </SegmentedIconBtn>
  </Group>
);

const Group = styled(SegmentedGroup)``;

export default JiraTimelineToggle;
