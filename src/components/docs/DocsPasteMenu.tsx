import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup } from 'lib/styles/docsCommon';

const DocsPasteMenu = () => {
  const { state, choosePaste } = useDocs();
  const { pasteMenu } = state;
  if (!pasteMenu) return null;

  const opts = pasteMenu.isJira
    ? [
      { icon: '@', label: '인라인 멘션', desc: '문장 속에 이슈 칩 삽입', mode: 'inline' as const },
      { icon: '▭', label: '카드', desc: '제목·상태·담당자 미리보기', mode: 'card' as const },
      { icon: '🔖', label: '링크', desc: '북마크 형태', mode: 'link' as const },
      { icon: '¶', label: 'URL 텍스트로', desc: '일반 텍스트로 붙여넣기', mode: 'text' as const },
    ]
    : [
      { icon: '🔖', label: '북마크로 붙여넣기', desc: '링크 미리보기', mode: 'link' as const },
      { icon: '¶', label: 'URL 텍스트로', desc: '일반 텍스트로 붙여넣기', mode: 'text' as const },
    ];

  return (
    <DocsPopup data-docs-menu style={{ left: pasteMenu.x, top: pasteMenu.y, width: 296 }}>
      <Head>
        <span style={{
          flex: '0 0 auto', width: 18, height: 18, borderRadius: 4, background: '#2684ff', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora',
        }}
        >J
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: docsTheme.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
        }}
        >{pasteMenu.title}
        </span>
      </Head>
      {opts.map((o) => (
        <Item key={o.mode} onClick={() => choosePaste(o.mode)}>
          <IconBox>{o.icon}</IconBox>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label>{o.label}</Label>
            <Desc>{o.desc}</Desc>
          </div>
        </Item>
      ))}
    </DocsPopup>
  );
};

export default DocsPasteMenu;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px 9px;
  border-bottom: 1px solid ${docsTheme.hairline};
  margin-bottom: 5px;
`;

const Item = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  border-radius: 9px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const IconBox = styled.span`
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: ${docsTheme.text2};
`;

const Label = styled.span`
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: ${docsTheme.text};
`;

const Desc = styled.span`
  display: block;
  font-size: 11.5px;
  color: ${docsTheme.muted};
`;
