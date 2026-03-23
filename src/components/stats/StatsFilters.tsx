import React from 'react';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';

interface Props {
  selectedYear: number | null;
  yearOptions: number[];
  onChangeYear: (year: number | null) => void;
  hasAtlassian: boolean;
  onBack: () => void;
}

const StatsFilters = ({ selectedYear, yearOptions, onChangeYear, hasAtlassian, onBack }: Props) => {
  return (
    <HeaderRow>
      <BackButton onClick={onBack}>
        <ArrowLeft size={16} />
      </BackButton>
      <PageTitle>사용자 통계</PageTitle>
      {hasAtlassian && (
        <YearSelect
          value={selectedYear ?? 'all'}
          onChange={(e) => onChangeYear(e.target.value === 'all' ? null : Number(e.target.value))}
        >
          <option value="all">전체</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </YearSelect>
      )}
    </HeaderRow>
  );
};

export default StatsFilters;

// ── Styled Components ──

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${theme.border};
  border-radius: 50%;
  background: ${theme.bgPrimary};
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.blue};
    background: ${theme.blueLight};
  }
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${theme.textPrimary};
`;

const YearSelect = styled.select`
  padding: 0.375rem 0.625rem;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  background: ${theme.bgPrimary};
  color: ${theme.textPrimary};
  font-size: 0.8125rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${theme.blue};
  }
`;
