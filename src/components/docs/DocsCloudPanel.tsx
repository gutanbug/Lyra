import styled from 'styled-components';
import { X } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsOverlay, DocsModal } from 'lib/styles/docsCommon';

const SQL = `create table lyra_docs (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);
alter table lyra_docs enable row level security;
create policy "anon rw" on lyra_docs
  for all using (true) with check (true);`;

const DocsCloudPanel = () => {
  const {
    state, closeCloud, setCloudField, toggleAuto, cloudTest, cloudSave, cloudLoad,
  } = useDocs();
  if (!state.cloudOpen) return null;
  const { cloud } = state;
  const statusColor = cloud.statusKind === 'ok' ? docsTheme.status['완료'].ink
    : cloud.statusKind === 'err' ? '#e5484d' : docsTheme.muted;

  return (
    <DocsOverlay data-docs-menu onClick={closeCloud}>
      <DocsModal style={{ width: 540, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <Head>
          <Logo>S</Logo>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700 }}>Supabase 동기화</div>
            <div style={{ fontSize: 12, color: docsTheme.muted }}>온라인 또는 셀프호스팅 Supabase에 워크스페이스를 저장·조회</div>
          </div>
          <Close onClick={closeCloud}><X size={16} /></Close>
        </Head>
        <Body>
          <Field>
            <Label>프로젝트 URL</Label>
            <Input value={cloud.url} onChange={(e) => setCloudField('url', e.target.value)} placeholder="https://xxxx.supabase.co" />
          </Field>
          <Field>
            <Label>anon (public) API key</Label>
            <Input value={cloud.key} onChange={(e) => setCloudField('key', e.target.value)} type="password" placeholder="eyJhbGciOi…" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5 }} />
          </Field>
          <Row>
            <Field style={{ flex: 1 }}>
              <Label>테이블</Label>
              <Input value={cloud.table} onChange={(e) => setCloudField('table', e.target.value)} />
            </Field>
            <Field style={{ flex: 1 }}>
              <Label>워크스페이스 ID</Label>
              <Input value={cloud.wsId} onChange={(e) => setCloudField('wsId', e.target.value)} />
            </Field>
          </Row>
          <AutoRow>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>자동 동기화</div>
              <div style={{ fontSize: 11.5, color: docsTheme.muted }}>편집할 때마다 자동 업로드 (연결 후)</div>
            </div>
            <Toggle $on={cloud.auto} onClick={toggleAuto}><Knob $on={cloud.auto} /></Toggle>
          </AutoRow>
          <Actions>
            <Btn onClick={cloudTest}>연결 테스트</Btn>
            <BtnAccent onClick={() => cloudSave(false)}>지금 저장 ↑</BtnAccent>
            <Btn onClick={cloudLoad}>불러오기 ↓</Btn>
            <Status style={{ color: statusColor }}>{cloud.status}</Status>
          </Actions>
          <SqlSection>
            <SqlLabel>최초 1회 — 테이블 생성 SQL</SqlLabel>
            <Pre>{SQL}</Pre>
            <Note>셀프호스팅도 프로젝트 URL만 바꾸면 동일하게 동작합니다. 브라우저에서 직접 호출하므로 Supabase의 CORS·RLS 설정이 열려 있어야 합니다.</Note>
          </SqlSection>
        </Body>
      </DocsModal>
    </DocsOverlay>
  );
};

export default DocsCloudPanel;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 18px 22px;
  border-bottom: 1px solid ${docsTheme.hairline};
`;

const Logo = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: #3ecf8e;
  color: #0a2a1c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 800;
  font-family: 'Sora', sans-serif;
  flex: 0 0 auto;
`;

const Close = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  &:hover { background: ${docsTheme.hover}; }
`;

const Body = styled.div`
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${docsTheme.text2};
`;

const Input = styled.input`
  font-family: inherit;
  font-size: 14px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1.5px solid ${docsTheme.border};
  border-radius: 9px;
  padding: 10px 12px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; background: ${docsTheme.surface}; }
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
`;

const AutoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  background: ${docsTheme.surfaceSoft};
  border-radius: 11px;
`;

const Toggle = styled.button<{ $on: boolean }>`
  width: 44px;
  height: 26px;
  border: none;
  border-radius: 99px;
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
  transition: background 0.15s;
  background: ${({ $on }) => ($on ? docsTheme.accent : docsTheme.borderStrong)};
`;

const Knob = styled.span<{ $on: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
  transform: ${({ $on }) => ($on ? 'translateX(18px)' : 'translateX(0)')};
`;

const Actions = styled.div`
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  align-items: center;
`;

const Btn = styled.button`
  appearance: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surface};
  color: ${docsTheme.text};
  border-radius: 9px;
  padding: 10px 15px;
  &:hover { background: ${docsTheme.hover}; }
`;

const BtnAccent = styled(Btn)`
  border: none;
  background: ${docsTheme.accent};
  color: #fff;
  &:hover { background: ${docsTheme.accent}; opacity: .92; }
`;

const Status = styled.span`
  flex: 1;
  min-width: 0;
  align-self: center;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SqlSection = styled.div`
  border-top: 1px solid ${docsTheme.hairline};
  padding-top: 14px;
`;

const SqlLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${docsTheme.muted};
  margin-bottom: 7px;
`;

const Pre = styled.pre`
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  line-height: 1.6;
  color: ${docsTheme.codeText};
  background: ${docsTheme.codeBg};
  border: 1px solid ${docsTheme.border};
  border-radius: 10px;
  padding: 13px 15px;
  overflow-x: auto;
  white-space: pre;
`;

const Note = styled.div`
  font-size: 11.5px;
  color: ${docsTheme.muted};
  margin-top: 9px;
  line-height: 1.6;
`;
