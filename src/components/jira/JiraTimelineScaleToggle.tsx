import { SegmentedBtn, SegmentedGroup } from 'lib/styles/segmentedToggle';
import type { TimelineScale } from 'lib/utils/jiraTimelineRange';

interface Props {
  value: TimelineScale;
  onChange: (next: TimelineScale) => void;
}

const SCALES: { value: TimelineScale; label: string }[] = [
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
  { value: 'quarter', label: '분기' },
];

const JiraTimelineScaleToggle = ({ value, onChange }: Props) => (
  <SegmentedGroup role="tablist" aria-label="타임라인 스케일">
    {SCALES.map((s) => (
      <SegmentedBtn
        key={s.value}
        type="button"
        role="tab"
        aria-selected={value === s.value}
        $active={value === s.value}
        onClick={() => onChange(s.value)}
      >
        {s.label}
      </SegmentedBtn>
    ))}
  </SegmentedGroup>
);

export default JiraTimelineScaleToggle;
