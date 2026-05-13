import styled from 'styled-components';
import { FolderOpen } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { useLocalRepo } from 'modules/contexts/localRepo';

interface Props {
  /** 'primary' | 'secondary' — 시각적 강도. 기본 primary. */
  $variant?: 'primary' | 'secondary';
  label?: string;
}

const OpenRepoButton = ({ $variant = 'primary', label = '저장소 열기' }: Props) => {
  const { openWithDialog, isOpening } = useLocalRepo();

  return (
    <Button
      type="button"
      $variant={$variant}
      disabled={isOpening}
      onClick={openWithDialog}
    >
      <FolderOpen size={16} />
      <span>{isOpening ? '여는 중…' : label}</span>
    </Button>
  );
};

export default OpenRepoButton;

const Button = styled.button<{ $variant: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ${transition}, border-color 0.15s ${transition};

  ${({ $variant }) =>
    $variant === 'primary'
      ? `
        background: ${theme.blue};
        color: #fff;
        border: 1px solid ${theme.blue};
        &:hover { background: ${theme.blueDark}; border-color: ${theme.blueDark}; }
      `
      : `
        background: ${theme.bgPrimary};
        color: ${theme.textPrimary};
        border: 1px solid ${theme.border};
        &:hover { border-color: ${theme.blue}; color: ${theme.blue}; }
      `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
