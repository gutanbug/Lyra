import React from 'react';
import styled from 'styled-components';
import { Bug, CheckSquare, Layers, ListTodo } from 'lucide-react';
import { jiraTheme } from 'lib/styles/jiraTheme';

type TaskType = 'epic' | 'story' | 'bug' | 'task';

interface IconConfig {
  Icon: React.ComponentType<{ size?: string | number; color?: string }>;
  bgColor: string;
  label: string;
}

const ICON_CONFIG: Record<TaskType, IconConfig> = {
  epic: {
    Icon: Layers,
    bgColor: jiraTheme.issueType.epic,
    label: '에픽',
  },
  story: {
    Icon: CheckSquare,
    bgColor: jiraTheme.issueType.story,
    label: '스토리',
  },
  bug: {
    Icon: Bug,
    bgColor: jiraTheme.issueType.bug,
    label: '버그',
  },
  task: {
    Icon: ListTodo,
    bgColor: jiraTheme.issueType.task,
    label: '할 일',
  },
};

interface JiraTaskIconProps {
  type: TaskType;
  size?: number;
}

const JiraTaskIcon = ({ type, size = 24 }: JiraTaskIconProps) => {
  const config = ICON_CONFIG[type];
  const IconComponent = config.Icon;

  return (
    <IconBox $bgColor={config.bgColor} $size={size}>
      <IconComponent size={Math.round(size * 0.6)} color="#FFFFFF" />
    </IconBox>
  );
};

export default JiraTaskIcon;

/** issueTypeName 문자열로부터 TaskType을 추론 */
export const resolveTaskType = (issueTypeName: string): TaskType => {
  if (!issueTypeName) return 'task';
  const t = issueTypeName.toLowerCase();
  if (t.includes('bug') || t.includes('버그')) return 'bug';
  if (t.includes('story') || t.includes('스토리')) return 'story';
  if (t.includes('epic') || t.includes('에픽')) return 'epic';
  return 'task';
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  epic: '에픽',
  story: '스토리',
  bug: '버그',
  task: '할 일',
};

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  epic: jiraTheme.issueType.epic,
  story: jiraTheme.issueType.story,
  bug: jiraTheme.issueType.bug,
  task: jiraTheme.issueType.task,
};

// ─── Styled Components ─────────────────────────

const IconBox = styled.div<{ $bgColor: string; $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 3px;
  background: ${({ $bgColor }) => $bgColor};
  flex-shrink: 0;
`;
