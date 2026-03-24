import React from 'react';
import { jiraTheme } from 'lib/styles/jiraTheme';

interface JiraPriorityIconProps {
  priority: string;
  size?: number;
}

function getPriorityLevel(priority: string): 'highest' | 'high' | 'medium' | 'low' | 'lowest' | 'default' {
  if (!priority) return 'default';
  const p = priority.toLowerCase();
  if (p.includes('highest') || p.includes('critical') || p.includes('긴급')) return 'highest';
  if (p.includes('high') || p.includes('높음')) return 'high';
  if (p.includes('medium') || p.includes('보통')) return 'medium';
  if (p.includes('low') && !p.includes('lowest')) return 'low';
  if (p.includes('lowest') || p.includes('가장 낮음')) return 'lowest';
  return 'default';
}

/** Jira 스타일 우선순위 꺾쇠 아이콘 */
const JiraPriorityIcon = ({ priority, size = 16 }: JiraPriorityIconProps) => {
  const level = getPriorityLevel(priority);
  const color = jiraTheme.priority[level];
  const sw = 2;

  // 각 우선순위별 꺾쇠 SVG
  switch (level) {
    case 'highest':
      // 더블 꺾쇠 위 (⏶⏶)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4 10l4-4 4 4" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6l4-4 4 4" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'high':
      // 꺾쇠 위 (⏶)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4 10l4-4 4 4" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'medium':
      // 가로 줄 (═)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M3 6h10" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <path d="M3 10h10" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'low':
      // 꺾쇠 아래 (⏷)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lowest':
      // 더블 꺾쇠 아래 (⏷⏷)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 10l4 4 4-4" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
  }
};

export { getPriorityLevel };
export default JiraPriorityIcon;
