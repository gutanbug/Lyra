import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import{o as n,t as r}from"./jsx-runtime-CLmotcMK.js";import{p as i}from"./index-DlQa474I.js";import{t as a}from"./createLucideIcon-C8aM4Rfc.js";var o=a(`panel-left-close`,[[`rect`,{width:`18`,height:`18`,x:`3`,y:`3`,rx:`2`,key:`afitv7`}],[`path`,{d:`M9 3v18`,key:`fh3hqa`}],[`path`,{d:`m16 15-3-3 3-3`,key:`14y99z`}]]),s=e(t()),c=r(),l=({sidebar:e,children:t})=>{let[n,r]=(0,s.useState)(!1),i=(0,s.useCallback)(()=>r(e=>!e),[]);return(0,s.useEffect)(()=>{let e=e=>{(e.metaKey||e.ctrlKey)&&e.key===`\\`&&(e.preventDefault(),i())};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[i]),(0,c.jsxs)(u,{children:[(0,c.jsxs)(d,{$open:n,children:[(0,c.jsx)(f,{children:(0,c.jsx)(m,{onClick:i,title:`메뉴 닫기 (⌘\\)`,children:(0,c.jsx)(o,{size:16})})}),(0,c.jsx)(p,{children:e})]}),(0,c.jsx)(h,{children:t})]})},u=n.div`
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`,d=n.div`
  width: 280px;
  min-width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${i.bgSecondary};
  border-right: 1px solid ${i.border};
  transition: margin-left 0.2s ease;
  margin-left: ${({$open:e})=>e?`0`:`-280px`};
  flex-shrink: 0;
`,f=n.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  flex-shrink: 0;
`,p=n.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`,m=n.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${i.textMuted};
  cursor: pointer;

  &:hover {
    background: ${i.bgTertiary};
    color: ${i.textPrimary};
  }
`,h=n.div`
  position: relative;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
`;export{l as t};