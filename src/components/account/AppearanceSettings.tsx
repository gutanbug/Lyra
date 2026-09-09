/**
 * 외형(Appearance) 설정 — 라이트/다크 모드 + 페이지 배경색.
 *
 * - 모드 토글: 라이트 / 다크 (전체 컴포넌트 색·폰트 반전)
 * - 배경색 프리셋: 라이트 모드에서만 적용 (다크 모드는 고정 dark palette)
 * - 커스텀 hex color picker
 * - 기본값으로 리셋
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Check, RotateCcw, Sun, Moon } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { useAppearance, DEFAULT_PAGE_BG, type ThemeMode } from 'modules/contexts/appearance';

type IconVariant = 'dark' | 'light';

const ICON_PREVIEW_SRC: Record<IconVariant, string> = {
  dark: 'images/app-icon-dark.png',
  light: 'images/app-icon-light.png',
};

const AppearanceSettings = () => {
  const { mode, setMode, pageBg, setPageBg, resetPageBg, presets } = useAppearance();
  const [draft, setDraft] = useState<string>(pageBg);

  // 외부 변경(reset/preset 클릭/다른 탭 동기화)에 hex input 동기
  useEffect(() => { setDraft(pageBg); }, [pageBg]);

  // 앱 아이콘 배색 (Electron 메인 프로세스 electron-store에 영구 저장 — 앱 재시작 후에도 유지)
  const [iconVariant, setIconVariantState] = useState<IconVariant>('dark');
  const iconApiAvailable = typeof window.workspaceAPI?.settings?.getIconVariant === 'function';

  useEffect(() => {
    window.workspaceAPI?.settings?.getIconVariant?.().then((v) => {
      if (v) setIconVariantState(v);
    });
  }, []);

  const handlePickIconVariant = (variant: IconVariant) => {
    setIconVariantState(variant);
    window.workspaceAPI?.settings?.setIconVariant?.(variant);
  };

  const activePreset = presets.find((p) => p.value.toLowerCase() === pageBg.toLowerCase());
  const isDefault = pageBg.toLowerCase() === DEFAULT_PAGE_BG.toLowerCase();
  const isDark = mode === 'dark';

  const handlePickColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setDraft(next);
    setPageBg(next);
  };

  return (
    <Wrap>
      {/* 1) Theme Mode */}
      <Section>
        <SectionLabel>테마 모드</SectionLabel>
        <SectionHint>라이트 또는 다크 모드를 선택하세요. 모드는 전체 컴포넌트의 색·폰트·테두리를 반전시킵니다.</SectionHint>

        <ModeGrid>
          <ModeCard type="button" $active={mode === 'light'} onClick={() => setMode('light')} aria-pressed={mode === 'light'}>
            <ModeSwatch $variant="light">
              <Sun size={20} />
              {mode === 'light' && <ModeCheck><Check size={14} strokeWidth={3} /></ModeCheck>}
            </ModeSwatch>
            <ModeName>라이트</ModeName>
            <ModeDesc>밝은 배경 · 어두운 텍스트</ModeDesc>
          </ModeCard>

          <ModeCard type="button" $active={mode === 'dark'} onClick={() => setMode('dark')} aria-pressed={mode === 'dark'}>
            <ModeSwatch $variant="dark">
              <Moon size={20} />
              {mode === 'dark' && <ModeCheck><Check size={14} strokeWidth={3} /></ModeCheck>}
            </ModeSwatch>
            <ModeName>다크</ModeName>
            <ModeDesc>어두운 배경 · 밝은 텍스트</ModeDesc>
          </ModeCard>
        </ModeGrid>
      </Section>

      {/* 2) App icon variant (Electron 데스크톱 앱에서만 표시) */}
      {iconApiAvailable && (
        <Section>
          <SectionLabel>앱 아이콘</SectionLabel>
          <SectionHint>Dock/작업표시줄에 표시되는 아이콘 배색을 선택하세요. 선택은 앱을 재시작해도 유지됩니다.</SectionHint>

          <ModeGrid>
            <ModeCard
              type="button"
              $active={iconVariant === 'dark'}
              onClick={() => handlePickIconVariant('dark')}
              aria-pressed={iconVariant === 'dark'}
            >
              <IconSwatch $variant="dark">
                <IconPreviewImg src={ICON_PREVIEW_SRC.dark} alt="" />
                {iconVariant === 'dark' && <ModeCheck><Check size={14} strokeWidth={3} /></ModeCheck>}
              </IconSwatch>
              <ModeName>다크</ModeName>
              <ModeDesc>검은 배경 · 흰색 아이콘 (기본값)</ModeDesc>
            </ModeCard>

            <ModeCard
              type="button"
              $active={iconVariant === 'light'}
              onClick={() => handlePickIconVariant('light')}
              aria-pressed={iconVariant === 'light'}
            >
              <IconSwatch $variant="light">
                <IconPreviewImg src={ICON_PREVIEW_SRC.light} alt="" />
                {iconVariant === 'light' && <ModeCheck><Check size={14} strokeWidth={3} /></ModeCheck>}
              </IconSwatch>
              <ModeName>라이트</ModeName>
              <ModeDesc>흰 배경 · 검은색 아이콘</ModeDesc>
            </ModeCard>
          </ModeGrid>
        </Section>
      )}

      {/* 3) Page bg color (light mode only) */}
      <Section $disabled={isDark}>
        <SectionLabel>페이지 배경색</SectionLabel>
        <SectionHint>
          {isDark
            ? '다크 모드에서는 페이지 배경이 고정됩니다. 라이트 모드로 전환하면 직접 변경할 수 있습니다.'
            : '앱 캔버스(대시보드·디테일 페이지) 배경색을 선택하세요. 사이드바와 카드는 항상 흰색입니다.'}
        </SectionHint>

        <PresetGrid>
          {presets.map((p) => {
            const isActive = !isDark && activePreset?.id === p.id;
            return (
              <PresetChip
                key={p.id}
                type="button"
                $active={isActive}
                disabled={isDark}
                onClick={() => {
                  setPageBg(p.value);
                  setDraft(p.value);
                }}
                aria-pressed={isActive}
                aria-label={`${p.label} (${p.value})`}
                title={`${p.label} ${p.value}`}
              >
                <Swatch $bg={p.value}>{isActive && <Check size={14} strokeWidth={3} />}</Swatch>
                <ChipLabel>{p.label}</ChipLabel>
              </PresetChip>
            );
          })}
        </PresetGrid>

        <CustomRow>
          <CustomLabel htmlFor="appearance-page-bg-picker">사용자 지정</CustomLabel>
          <PickerWrap>
            <ColorPicker
              id="appearance-page-bg-picker"
              type="color"
              value={pageBg}
              onChange={handlePickColor}
              disabled={isDark}
            />
            <HexInput
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(draft)) setPageBg(draft);
                else setDraft(pageBg);
              }}
              maxLength={7}
              placeholder="#e8f0fa"
              spellCheck={false}
              disabled={isDark}
            />
          </PickerWrap>
          <ResetBtn type="button" onClick={resetPageBg} disabled={isDefault || isDark} title="기본값으로 되돌리기">
            <RotateCcw size={14} />
            기본값
          </ResetBtn>
        </CustomRow>

        <Preview $bg={isDark ? '#1e1f22' : pageBg}>
          <MockSidebar $dark={isDark}>
            <MockSidebarDot $dark={isDark} $active />
            <MockSidebarDot $dark={isDark} />
            <MockSidebarDot $dark={isDark} />
          </MockSidebar>
          <PreviewCard $dark={isDark}>
            <PreviewTitle $dark={isDark}>미리보기</PreviewTitle>
            <PreviewBody $dark={isDark}>현재 모드: {mode === 'dark' ? '다크' : '라이트'} · 배경: {isDark ? '고정' : pageBg}</PreviewBody>
            <MockRow $dark={isDark} $w="78%" />
            <MockRow $dark={isDark} $w="55%" />
          </PreviewCard>
        </Preview>
      </Section>
    </Wrap>
  );
};

export default AppearanceSettings;

// ── styled-components ───────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 28px;
  max-width: 720px;
`;

const Section = styled.section<{ $disabled?: boolean }>`
  background: ${theme.color.surface};
  border: 1px solid ${theme.color.borderDefault};
  border-radius: ${theme.radius.card};
  box-shadow: ${theme.shadow.card};
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  opacity: ${({ $disabled }) => ($disabled ? 0.65 : 1)};
  transition: opacity ${theme.motion.fast};
`;

const SectionLabel = styled.h3`
  margin: 0;
  font-family: ${theme.font.body};
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.color.gray8};
`;

const SectionHint = styled.p`
  margin: 0;
  font-family: ${theme.font.body};
  font-size: 13px;
  color: ${theme.color.gray6};
  line-height: 1.5;
`;

// ── Mode selector ──

const ModeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
`;

const ModeCard = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px 18px;
  background: ${theme.color.surface};
  border: 1.5px solid ${({ $active }) => ($active ? theme.color.accent : theme.color.borderStrong)};
  border-radius: ${theme.radius.ctl};
  cursor: pointer;
  transition: border-color ${theme.motion.fast}, transform ${theme.motion.fast};
  text-align: left;

  &:hover { transform: translateY(-1px); }
`;

const ModeSwatch = styled.span<{ $variant: ThemeMode }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${theme.radius.ctl};
  margin-bottom: 6px;
  background: ${({ $variant }) => ($variant === 'dark' ? '#1e1f22' : '#e8f0fa')};
  color: ${({ $variant }) => ($variant === 'dark' ? '#f0f1f3' : '#1c1b1a')};
  border: 1px solid ${({ $variant }) => ($variant === 'dark' ? '#4b4e54' : '#dbe5f0')};
`;

const IconSwatch = styled.span<{ $variant: IconVariant }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${theme.radius.ctl};
  margin-bottom: 6px;
  background: ${({ $variant }) => ($variant === 'dark' ? '#1e1f22' : '#f5f4f2')};
  border: 1px solid ${({ $variant }) => ($variant === 'dark' ? '#4b4e54' : '#dbe5f0')};
  overflow: hidden;
`;

const IconPreviewImg = styled.img`
  width: 38px;
  height: 38px;
  object-fit: contain;
`;

const ModeCheck = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${theme.color.accent};
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
`;

const ModeName = styled.span`
  font-family: ${theme.font.body};
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.color.gray8};
`;

const ModeDesc = styled.span`
  font-family: ${theme.font.body};
  font-size: 12px;
  color: ${theme.color.gray6};
`;

// ── Page bg presets ──

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
  margin-top: 6px;
`;

const PresetChip = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  background: ${theme.color.surface};
  border: 1.5px solid ${({ $active }) => ($active ? theme.color.accent : theme.color.borderStrong)};
  border-radius: ${theme.radius.ctl};
  cursor: pointer;
  transition: border-color ${theme.motion.fast}, transform ${theme.motion.fast};

  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { cursor: not-allowed; }
`;

const Swatch = styled.span<{ $bg: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: ${theme.color.accent};
`;

const ChipLabel = styled.span`
  font-family: ${theme.font.body};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.color.gray8};
`;

// ── Custom hex ──

const CustomRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const CustomLabel = styled.label`
  font-family: ${theme.font.body};
  font-size: 13px;
  font-weight: 600;
  color: ${theme.color.gray7};
  flex-shrink: 0;
`;

const PickerWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1.5px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  background: ${theme.color.surface};

  &:focus-within { border-color: ${theme.color.accent}; }
`;

const ColorPicker = styled.input`
  appearance: none;
  -webkit-appearance: none;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper { padding: 0; }
  &::-webkit-color-swatch { border: 1px solid rgba(0,0,0,.08); border-radius: 8px; }
  &::-moz-color-swatch { border: 1px solid rgba(0,0,0,.08); border-radius: 8px; }
  &:disabled { cursor: not-allowed; opacity: 0.5; }
`;

const HexInput = styled.input`
  width: 96px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  font-weight: 500;
  color: ${theme.color.gray8};
  background: transparent;
  border: none;
  outline: none;
  text-transform: lowercase;

  &:disabled { cursor: not-allowed; opacity: 0.5; }
`;

const ResetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  color: ${theme.color.gray6};
  border: 1px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  font-family: ${theme.font.body};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${theme.motion.fast}, color ${theme.motion.fast};

  &:hover:not(:disabled) { background: ${theme.color.hairline}; color: ${theme.color.gray8}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ── Preview ──

const Preview = styled.div<{ $bg: string }>`
  margin-top: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  border-radius: ${theme.radius.card};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${theme.color.borderStrong};
`;

const MockSidebar = styled.div<{ $dark: boolean }>`
  flex: 0 0 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  background: ${({ $dark }) => ($dark ? '#2b2d30' : '#ffffff')};
  border: 1px solid ${({ $dark }) => ($dark ? '#4b4e54' : '#dbe5f0')};
  border-radius: ${theme.radius.ctl};
`;

const MockSidebarDot = styled.div<{ $dark: boolean; $active?: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: ${({ $active, $dark }) => ($active ? theme.color.accent : $dark ? '#43454a' : '#eeeceb')};
`;

const MockRow = styled.div<{ $dark: boolean; $w: string }>`
  height: 8px;
  width: ${({ $w }) => $w};
  margin-top: 8px;
  border-radius: 4px;
  background: ${({ $dark }) => ($dark ? '#43454a' : '#eeeceb')};
`;

const PreviewCard = styled.div<{ $dark: boolean }>`
  flex: 1;
  min-width: 0;
  padding: 18px 20px;
  background: ${({ $dark }) => ($dark ? '#2b2d30' : '#ffffff')};
  border: 1px solid ${({ $dark }) => ($dark ? '#4b4e54' : '#dbe5f0')};
  border-radius: ${theme.radius.ctl};
  box-shadow: ${({ $dark }) =>
    $dark
      ? 'inset 0 1px 0 rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.45), 0 6px 16px rgba(0,0,0,.4)'
      : '0 1px 2px rgba(28,27,26,.06), 0 6px 16px rgba(28,27,26,.06)'};
`;

const PreviewTitle = styled.div<{ $dark: boolean }>`
  font-family: ${theme.font.body};
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ $dark }) => ($dark ? '#f0f1f3' : '#1c1b1a')};
  margin-bottom: 4px;
`;

const PreviewBody = styled.div<{ $dark: boolean }>`
  font-family: ${theme.font.body};
  font-size: 12.5px;
  color: ${({ $dark }) => ($dark ? '#c5c8ce' : '#5d5957')};
`;
