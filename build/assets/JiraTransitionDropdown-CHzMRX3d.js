import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import{o as n,t as r}from"./jsx-runtime-CLmotcMK.js";import{N as i,c as a}from"./index-DlQa474I.js";import{a as o}from"./JiraTaskIcon-DQ38HPSa.js";function s(e){if(!e)return``;if(e.text)return e.text;let t=e.content,n=(e,t=``)=>e?.map(s).join(t)??``;switch(e.type){case`paragraph`:case`heading`:return n(t)+`
`;case`bulletList`:case`orderedList`:return t?.map(e=>`• `+s(e)).join(`
`)??``;case`listItem`:return n(t)+`
`;case`codeBlock`:return n(t)+`
`;case`blockquote`:return`> `+n(t)+`
`;case`rule`:return`---
`;case`table`:return t?.map(e=>e.content?.map(e=>s(e)).join(`	`)??``).join(`
`)??``;case`tableRow`:case`tableHeader`:case`tableCell`:return n(t);default:return n(t)}}function c(e){if(!e)return``;if(typeof e==`string`)return e;let t=e;return t.type===`doc`&&Array.isArray(t.content)?t.content.map(s).join(``).trim():s(t).trim()}function l(e){return typeof e==`string`?e:``}function u(e){return e&&typeof e==`object`&&!Array.isArray(e)?e:null}function d(e){return e.toLowerCase().includes(`epic`)||e===`에픽`}function f(e){let t=e.toLowerCase();return t.includes(`sub-task`)||t.includes(`subtask`)||t===`하위 작업`}function p(e,t){let n=(e+` `+t).toLowerCase();return n.includes(`done`)||n.includes(`완료`)?o.status.done:n.includes(`progress`)||n.includes(`진행`)?o.status.inProgress:o.status.default}function m(e){if(!e)return o.priority.default;let t=e.toLowerCase();return t.includes(`highest`)||t.includes(`critical`)||t.includes(`긴급`)?o.priority.highest:t.includes(`high`)||t.includes(`높음`)?o.priority.high:t.includes(`medium`)||t.includes(`보통`)?o.priority.medium:t.includes(`low`)||t.includes(`낮음`)?o.priority.low:o.priority.default}function h(e){if(!e)return`-`;try{return new Date(e).toLocaleString(`ko-KR`)}catch{return e}}function g(e){return e.replace(/\\/g,`\\\\`).replace(/"/g,`\\"`)}var _=/^[A-Z][A-Z0-9]+-\d+$/i,v=/^\d+$/,y=e(t());function b({accountId:e,serviceType:t,onTransitioned:n}){let[r,i]=(0,y.useState)(null),[o,s]=(0,y.useState)([]),[c,l]=(0,y.useState)(!1),u=(0,y.useRef)(null),d=(0,y.useCallback)(async(n,o,c)=>{if(!e)return;if(r?.issueKey===n){i(null);return}let u=c.currentTarget.getBoundingClientRect();i({issueKey:n,top:u.bottom+4,left:u.left+u.width/2}),s([]),l(!0);try{let r=(await a.invoke({accountId:e,serviceType:t,action:`getTransitions`,params:{issueKey:n}})).transitions??[];s((Array.isArray(r)?r:[]).filter(e=>e.to?.name!==o).filter((e,t,n)=>n.findIndex(t=>t.to?.name===e.to?.name)===t))}catch(e){console.error(`[useTransitionDropdown] getTransitions error:`,e),s([])}finally{l(!1)}},[e,t,r]),f=(0,y.useCallback)(async(r,o,s,c)=>{if(e)try{await a.invoke({accountId:e,serviceType:t,action:`transitionIssue`,params:{issueKey:r,transitionId:o}}),n?.(r,s,c)}catch(e){console.error(`[useTransitionDropdown] transitionIssue error:`,e)}finally{i(null)}},[e,t,n]),p=(0,y.useCallback)(()=>i(null),[]);return(0,y.useEffect)(()=>{if(!r)return;let e=e=>{u.current&&!u.current.contains(e.target)&&i(null)};return document.addEventListener(`mousedown`,e),()=>document.removeEventListener(`mousedown`,e)},[r]),{target:r,transitions:o,isLoading:c,dropdownRef:u,open:d,execute:f,close:p}}var x=e(i()),S=r(),C=({target:e,transitions:t,isLoading:n,dropdownRef:r,onSelect:i,onClose:a})=>(0,x.createPortal)((0,S.jsx)(w,{onClick:a,children:(0,S.jsx)(T,{ref:r,style:{top:e.top,left:e.left},onClick:e=>e.stopPropagation(),children:n?(0,S.jsx)(O,{children:`로딩 중...`}):t.length===0?(0,S.jsx)(O,{children:`전환 가능한 상태가 없습니다.`}):t.map(t=>{let n=t.to?.statusCategory?.name||``;return(0,S.jsxs)(E,{onClick:()=>i(e.issueKey,t.id,t.to?.name||t.name,n),children:[(0,S.jsx)(D,{$color:p(t.to?.name||t.name,n)}),t.to?.name||t.name]},t.id)})})}),document.getElementById(`portal-root`)||document.body),w=n.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
`,T=n.div`
  position: fixed;
  transform: translateX(-50%);
  background: ${o.bg.default};
  border: 1px solid ${o.border};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 160px;
  max-height: 240px;
  overflow-y: auto;
`,E=n.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: ${o.text.primary};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;

  &:hover { background: ${o.bg.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${o.border}; }
`,D=n.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({$color:e})=>e||o.status.default};
  flex-shrink: 0;
`,O=n.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: ${o.text.muted};
`;export{g as a,p as c,u as d,l as f,v as i,d as l,b as n,h as o,c as p,_ as r,m as s,C as t,f as u};