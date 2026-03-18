const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./ConfluencePageDetail-CVjs8m35.js","./chunk-zsgVPwQN.js","./index-DlQa474I.js","./extends-B9xiNNeF.js","./emotion-memoize.esm-DTPIthkX.js","./jsx-runtime-CLmotcMK.js","./inheritsLoose-BoRPnkVY.js","./setPrototypeOf-DlWRQUIq.js","./objectWithoutPropertiesLoose-Cdeg4igX.js","./emotion-is-prop-valid.esm-D0wmUM1l.js","./hoist-non-react-statics.cjs-y9ytJ0rQ.js","./prop-types-BxpQat5H.js","./react-CImqQUc5.js","./tiny-invariant-C2pmS1_y.js","./browser-BW_oQsLB.js","./react-fast-compare-BUZ6R6YJ.js","./scheduler-Cc747TmB.js","./external-link-s-dDyJXs.js","./createLucideIcon-C8aM4Rfc.js","./confluenceTheme-BQt0q3kv.js"])))=>i.map(i=>d[i]);
import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import"./hoist-non-react-statics.cjs-y9ytJ0rQ.js";import{_ as n,a as r,f as i,i as a,m as o,o as s,p as c,t as l}from"./jsx-runtime-CLmotcMK.js";import"./react-fast-compare-BUZ6R6YJ.js";import"./browser-BW_oQsLB.js";import{c as u,d,f,l as p,n as m,o as h,p as g,t as _,u as ee}from"./index-DlQa474I.js";import{t as v}from"./confluenceTheme-BQt0q3kv.js";import{t as y}from"./createLucideIcon-C8aM4Rfc.js";import{t as b}from"./loader-DQlVBXqR.js";import{t as x}from"./SidebarLayout-B9y39Le3.js";import{t as S}from"./search-CnUSziej.js";import{t as C}from"./settings-CDsETrSH.js";var te=y(`chevron-down`,[[`path`,{d:`m6 9 6 6 6-6`,key:`qrunsl`}]]),w=y(`chevron-right`,[[`path`,{d:`m9 18 6-6-6-6`,key:`mthhwq`}]]),T=y(`file-text`,[[`path`,{d:`M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z`,key:`1oefj6`}],[`path`,{d:`M14 2v5a1 1 0 0 0 1 1h5`,key:`wfsgrz`}],[`path`,{d:`M10 9H8`,key:`b1mrlr`}],[`path`,{d:`M16 13H8`,key:`t4e002`}],[`path`,{d:`M16 17H8`,key:`z1uh3a`}]]),ne=y(`folder-open`,[[`path`,{d:`m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2`,key:`usdka0`}]]),E=e(t()),D=l();function O(e){return typeof e==`string`?e:typeof e==`number`?String(e):``}function k(e){return e&&typeof e==`object`&&!Array.isArray(e)?e:null}function A(e){return e.startsWith(`~`)||/^-?\d{10,}/.test(e)}function j(e){let t=O(e.id),n=O(e.title),r=O(e.status)||`current`,i=k(e.space)||k(e.spaceInfo),a=O(e.spaceId)||O(i?.id)||``,o=O(i?.name)||``,s=O(i?.key)||``,c=k(e.author)||k(e.ownedBy)||k(e.createdBy),l=O(c?.accountId)||O(c?.publicName)||``,u=O(c?.displayName)||O(c?.publicName)||``,d=O(e.createdAt)||O(e.created)||``,f=O(e.updatedAt)||O(e.lastModified)||``,p=O(e.parentId)||``,m=O(e.parentTitle)||``,h=k(e.version);return{id:t,title:n,spaceId:a,spaceName:o,spaceKey:s,status:r,authorId:l,authorName:u,createdAt:d,updatedAt:f,parentId:p,parentTitle:m,version:h?Number(h.number)||1:typeof e.version==`number`?e.version:1}}function M(e){if(!e||typeof e!=`object`)return[];let t=e,n=t.results??t.pages??t.values??[];return Array.isArray(n)?n.filter(e=>e&&typeof e==`object`).map(j).filter(e=>e.id&&e.title):[]}function N(e){if(!e||typeof e!=`object`)return[];let t=e,n=t.results??t.spaces??t.values??[];return Array.isArray(n)?n.filter(e=>e&&typeof e==`object`).map(e=>({id:O(e.id),key:O(e.key),name:O(e.name),type:O(e.type),status:O(e.status)})).filter(e=>e.id&&e.key):[]}function P(e,t){let n=new Map,r=`__no_space__`,i=new Map;for(let e of t)i.set(e.id,{name:e.name,key:e.key});for(let t of e){let e=t.spaceId||r;if(!n.has(e)){let a=i.get(e),o=t.spaceKey||a?.key||``,s=t.spaceName||a?.name||(e===r?`기타`:e);A(o)&&(!s||s===o)&&(s=t.authorName||s),n.set(e,{spaceId:e,spaceName:s,spaceKey:o,pages:[]})}n.get(e).pages.push(t)}let a=Array.from(n.values()).filter(e=>e.pages.length>0);return a.sort((e,t)=>e.spaceId===r?1:t.spaceId===r?-1:e.spaceName.localeCompare(t.spaceName)),a}function re(e){if(!e)return`-`;try{return new Date(e).toLocaleDateString(`ko-KR`,{year:`numeric`,month:`2-digit`,day:`2-digit`})}catch{return e.slice(0,10)}}function ie(e){return[]}async function ae(e){try{if(window.workspaceAPI?.settings)return await window.workspaceAPI.settings.getSelectedSpaces?.(e)??[];let t=localStorage.getItem(`lyra:confluence:selectedSpaces:${e}`);if(t){let e=JSON.parse(t);if(Array.isArray(e))return e}}catch{}return[]}function oe(e,t){try{window.workspaceAPI?.settings&&window.workspaceAPI.settings.setSelectedSpaces?.(e,t),localStorage.setItem(`lyra:confluence:selectedSpaces:${e}`,JSON.stringify(t))}catch{}}var F={myPages:[],spaces:[],selectedSpaces:[],searchQuery:``,searchResults:null,expandedSpaces:new Set,accountId:``},I=()=>{let{activeAccount:e}=h(),t=e?.metadata?.userDisplayName,n=o(),{addTab:r}=ee(),[i,a]=(0,E.useState)(null),s=(e,t,n)=>{e.preventDefault(),e.stopPropagation();let r=1.2;a({x:e.clientX/r,y:e.clientY/r,path:t,label:n})},c=()=>{i&&(r(`confluence`,i.path,i.label),a(null))},l=e?.id||``,m=F.accountId===l&&l!==``,[g,_]=(0,E.useState)(m?F.myPages:[]),[v,y]=(0,E.useState)(!1),[b,x]=(0,E.useState)(m?F.spaces:[]),[S,C]=(0,E.useState)(m?F.selectedSpaces:ie(l)),[te,w]=(0,E.useState)(!1),[T,ne]=(0,E.useState)(``),[O,k]=(0,E.useState)(m?F.searchQuery:``),[j,I]=(0,E.useState)(m?F.searchResults:null),[z,B]=(0,E.useState)(!1),Tt={title:`제목`,body:`본문`,title_body:`제목+본문`,contributor:`작성자`},[V,Et]=(0,E.useState)(`title`),[Dt,Ot]=(0,E.useState)(!1),kt=(0,E.useRef)(null),[H,U]=(0,E.useState)([]),[At,W]=(0,E.useState)(!1),[jt,Mt]=(0,E.useState)(!1),[G,K]=(0,E.useState)(-1),q=(0,E.useRef)(null),Nt=(0,E.useRef)(null),[Pt,J]=(0,E.useState)(m?F.expandedSpaces:new Set),[Ft,It]=(0,E.useState)(m),Y=(0,E.useRef)(!1);(0,E.useEffect)(()=>{Y.current||!l||m||(Y.current=!0,ae(l).then(e=>{e.length>0&&C(e),It(!0)}))},[l,m]);let X=(0,E.useRef)(l);(0,E.useEffect)(()=>{X.current!==l&&(X.current=l,_([]),x([]),C([]),k(``),I(null),U([]),W(!1),J(new Set),It(!1),l&&ae(l).then(e=>{e.length>0&&C(e),It(!0)}))},[l]),(0,E.useEffect)(()=>{F.accountId=l,F.myPages=g,F.spaces=b,F.selectedSpaces=S,F.searchQuery=O,F.searchResults=j,F.expandedSpaces=Pt},[l,g,b,S,O,j,Pt]);let Lt=(0,E.useCallback)(async()=>{if(e)try{let t=N(await u.invoke({accountId:e.id,serviceType:`confluence`,action:`getSpaces`,params:{limit:250}}));t.sort((e,t)=>e.name.localeCompare(t.name)),x(t)}catch{x([])}},[e]),Z=(0,E.useCallback)(async()=>{if(e){y(!0);try{let t={limit:100,sort:`-modified-date`,status:`current`,contributor:`currentUser()`};S.length>0&&(t.spaceKeys=S),_(M(await u.invoke({accountId:e.id,serviceType:`confluence`,action:`getMyPages`,params:t})))}catch(e){console.error(`[ConfluenceDashboard] fetchMyPages error:`,e),_([])}finally{y(!1)}}},[e,S]),Rt=(0,E.useCallback)(async()=>{if(!e)return;let t=O.trim();if(!t){I(null);return}B(!0);try{let n={query:t,limit:100,searchField:V};S.length>0&&(n.spaceKeys=S);let r=M(await u.invoke({accountId:e.id,serviceType:`confluence`,action:`searchPages`,params:n}));I(r),J(new Set(r.map(e=>e.spaceId||`__no_space__`)))}catch(e){console.error(`[ConfluenceDashboard] searchPages error:`,e),I([])}finally{B(!1)}},[e,O,S,V]),zt=(0,E.useCallback)(async t=>{if(!e||!t.trim()){U([]),W(!1);return}Mt(!0);try{let n={query:t.trim(),limit:10,searchField:V};S.length>0&&(n.spaceKeys=S);let r=M(await u.invoke({accountId:e.id,serviceType:`confluence`,action:`searchPages`,params:n}));U(r),W(r.length>0),K(-1)}catch{U([]),W(!1)}finally{Mt(!1)}},[e,S,V]),Bt=(0,E.useCallback)(e=>{if(k(e),q.current&&clearTimeout(q.current),!e.trim()){U([]),W(!1);return}q.current=setTimeout(()=>{zt(e)},300)},[zt]);(0,E.useEffect)(()=>{let e=e=>{Nt.current&&!Nt.current.contains(e.target)&&W(!1),kt.current&&!kt.current.contains(e.target)&&Ot(!1)};return document.addEventListener(`mousedown`,e),()=>document.removeEventListener(`mousedown`,e)},[]),(0,E.useEffect)(()=>()=>{q.current&&clearTimeout(q.current)},[]);let Vt=()=>{k(``),I(null),U([]),W(!1)},Ht=e=>{e&&n.push(`/confluence/page/${e}`)},Ut=E.useRef(m&&F.myPages.length>0);(0,E.useEffect)(()=>{if(!e){x([]),_([]);return}if(Ut.current){Ut.current=!1;return}Ft&&(Lt(),Z())},[e,Lt,Z,Ft]);let Wt=e=>{J(t=>{let n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n})},Gt=e=>{J(new Set(e.map(e=>e.spaceId)))},Kt=()=>{J(new Set)},qt=(0,E.useRef)([]);(0,E.useEffect)(()=>{let e=()=>Gt(qt.current),t=()=>Kt();return window.addEventListener(`lyra:expand-all`,e),window.addEventListener(`lyra:collapse-all`,t),()=>{window.removeEventListener(`lyra:expand-all`,e),window.removeEventListener(`lyra:collapse-all`,t)}},[]);let Q=E.useMemo(()=>{let e=T.trim().toLowerCase();return e?b.filter(t=>t.name.toLowerCase().includes(e)||t.key.toLowerCase().includes(e)):b},[b,T]);if(!e||!p(e.serviceType))return(0,D.jsx)(L,{children:(0,D.jsx)(Ve,{children:(0,D.jsx)(He,{children:`Atlassian 계정을 추가하고 활성화해주세요. 계정 설정에서 Atlassian을 연결할 수 있습니다.`})})});let Jt=j!==null,$=P(Jt?j:g,b);return qt.current=$,(0,D.jsxs)(L,{children:[(0,D.jsxs)(le,{children:[(0,D.jsxs)(ue,{children:[f(`confluence`)&&(0,D.jsx)(de,{children:d(`confluence`,24)}),`Confluence`]}),(0,D.jsxs)(fe,{ref:Nt,children:[(0,D.jsxs)(pe,{onClick:()=>{ne(``),w(!0)},children:[`스페이스`,S.length>0&&(0,D.jsx)(me,{children:S.length})]}),(0,D.jsxs)(he,{children:[(0,D.jsx)(ge,{"data-search-input":!0,placeholder:`문서 제목, 내용 검색...`,value:O,onChange:e=>Bt(e.target.value),style:{paddingRight:`5.5rem`},onKeyDown:e=>{e.key===`Enter`?At&&G>=0&&H[G]?(W(!1),Ht(H[G].id)):(W(!1),Rt()):e.key===`ArrowDown`?(e.preventDefault(),K(e=>Math.min(e+1,H.length-1))):e.key===`ArrowUp`?(e.preventDefault(),K(e=>Math.max(e-1,-1))):e.key===`Escape`&&W(!1)},onFocus:()=>{H.length>0&&W(!0)}}),(0,D.jsxs)(_e,{ref:kt,children:[(0,D.jsxs)(ve,{onClick:()=>Ot(e=>!e),children:[Tt[V],(0,D.jsx)(ye,{children:Dt?`▲`:`▼`})]}),Dt&&(0,D.jsx)(be,{children:Object.keys(Tt).map(e=>(0,D.jsxs)(xe,{$active:e===V,onMouseDown:t=>{t.preventDefault(),Et(e),Ot(!1)},children:[Tt[e],e===V&&(0,D.jsx)(Se,{children:`✓`})]},e))})]}),At&&(0,D.jsxs)(Ce,{children:[H.map((e,t)=>(0,D.jsxs)(we,{$active:t===G,onMouseDown:t=>{t.preventDefault(),W(!1),Ht(e.id)},onMouseEnter:()=>K(t),children:[(0,D.jsx)(Te,{children:(0,D.jsx)(se,{})}),(0,D.jsx)(Ee,{children:e.title}),e.authorName&&(0,D.jsx)(De,{children:e.authorName}),e.spaceKey&&(0,D.jsx)(Oe,{children:A(e.spaceKey)&&(e.spaceName||e.authorName)||e.spaceKey})]},e.id)),jt&&(0,D.jsx)(ke,{children:`검색 중...`})]}),jt&&!At&&O.trim()&&(0,D.jsx)(Ce,{children:(0,D.jsx)(ke,{children:`검색 중...`})})]}),(0,D.jsx)(Ae,{onClick:()=>{W(!1),Rt()},disabled:z,children:z?`검색 중...`:`검색`}),j!==null&&(0,D.jsx)(je,{onClick:Vt,children:`초기화`})]}),(0,D.jsx)(Me,{onClick:Z,disabled:v,children:`새로고침`})]}),(0,D.jsxs)(Ne,{children:[(0,D.jsxs)(Pe,{children:[(0,D.jsx)(Fe,{children:Jt?`검색 결과 (${$.reduce((e,t)=>e+t.pages.length,0)}건)`:`내가 작성한 문서 (${$.reduce((e,t)=>e+t.pages.length,0)}건)`}),$.length>0&&(0,D.jsxs)(Ie,{children:[(0,D.jsx)(R,{onClick:()=>Gt($),children:`모두 펼치기`}),(0,D.jsx)(R,{onClick:Kt,children:`모두 접기`})]})]}),v||z?(0,D.jsxs)(Le,{children:[(0,D.jsx)(Re,{}),(0,D.jsx)(ze,{children:z?`검색 중`:`로딩 중`})]}):$.length===0?(0,D.jsx)(Be,{children:Jt?`검색 결과가 없습니다.`:`작성한 문서가 없습니다.`}):(0,D.jsx)(Ue,{children:$.map(e=>{let n=Pt.has(e.spaceId);return(0,D.jsxs)(We,{children:[(0,D.jsxs)(Ge,{onClick:()=>Wt(e.spaceId),children:[(0,D.jsx)(Ke,{children:n?`▼`:`▶`}),(0,D.jsx)(qe,{children:(0,D.jsx)(ce,{})}),(0,D.jsx)(Je,{children:e.spaceName}),e.spaceKey&&!A(e.spaceKey)&&(0,D.jsx)(Ye,{children:e.spaceKey}),(0,D.jsx)(Xe,{children:e.pages.length})]}),n&&(0,D.jsxs)(Ze,{children:[(0,D.jsxs)(Qe,{children:[(0,D.jsx)(`span`,{children:`제목`}),(0,D.jsx)(`span`,{children:`상태`}),(0,D.jsx)(`span`,{children:`작성자`}),(0,D.jsx)(`span`,{children:`수정일`})]}),e.pages.map(e=>(0,D.jsxs)($e,{onClick:()=>Ht(e.id),onContextMenu:t=>s(t,`/confluence/page/${e.id}`,e.title||`(제목 없음)`),children:[(0,D.jsxs)(et,{children:[(0,D.jsx)(se,{}),(0,D.jsx)(tt,{children:e.title||`(제목 없음)`})]}),(0,D.jsx)(nt,{children:e.status}),(0,D.jsx)(rt,{$isMe:e.authorName===t,children:e.authorName||`-`}),(0,D.jsx)(it,{children:re(e.updatedAt||e.createdAt)})]},e.id))]})]},e.spaceId)})})]}),te&&(0,D.jsx)(at,{onClick:()=>w(!1),children:(0,D.jsxs)(ot,{onClick:e=>e.stopPropagation(),children:[(0,D.jsxs)(st,{children:[(0,D.jsx)(ct,{children:`스페이스 필터 설정`}),(0,D.jsx)(lt,{onClick:()=>w(!1),children:`✕`})]}),(0,D.jsxs)(ut,{children:[`선택한 스페이스의 문서만 조회 및 검색됩니다.`,S.length>0?` (${S.length}개 선택됨)`:` (전체)`]}),(0,D.jsxs)(dt,{children:[(0,D.jsx)(ft,{placeholder:`스페이스 검색...`,value:T,onChange:e=>ne(e.target.value),autoFocus:!0}),(0,D.jsx)(R,{onClick:()=>{let e=Q.map(e=>e.key);C(t=>Array.from(new Set(t.concat(e))))},children:`전체 선택`}),(0,D.jsx)(R,{onClick:()=>{if(T){let e=new Set(Q.map(e=>e.key));C(t=>t.filter(t=>!e.has(t)))}else C([])},children:`전체 해제`})]}),(0,D.jsx)(pt,{children:(()=>{let e=new Set(S),t=Q.filter(t=>e.has(t.key)),n=Q.filter(t=>!e.has(t.key));return(0,D.jsxs)(D.Fragment,{children:[t.length>0&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(mt,{children:`선택됨`}),t.map(e=>(0,D.jsxs)(gt,{$active:!0,onClick:()=>{C(t=>t.filter(t=>t!==e.key))},children:[(0,D.jsx)(_t,{$checked:!0,children:`✓`}),(0,D.jsx)(vt,{children:e.name}),!A(e.key)&&(0,D.jsx)(yt,{children:e.key})]},e.id))]}),n.length>0&&(0,D.jsxs)(D.Fragment,{children:[t.length>0&&(0,D.jsx)(mt,{children:`전체`}),n.map(e=>(0,D.jsxs)(gt,{$active:!1,onClick:()=>{C(t=>[...t,e.key])},children:[(0,D.jsx)(_t,{$checked:!1}),(0,D.jsx)(vt,{children:e.name}),!A(e.key)&&(0,D.jsx)(yt,{children:e.key})]},e.id))]}),t.length===0&&n.length===0&&(0,D.jsx)(ht,{children:`일치하는 스페이스가 없습니다.`})]})})()}),(0,D.jsx)(bt,{children:(0,D.jsx)(xt,{onClick:()=>{oe(l,S),w(!1),Z(),window.dispatchEvent(new CustomEvent(`lyra:confluence-space-settings-changed`))},children:`저장`})})]})}),i&&(0,D.jsx)(St,{onClick:()=>a(null),children:(0,D.jsx)(Ct,{style:{left:i.x,top:i.y},onClick:e=>e.stopPropagation(),children:(0,D.jsx)(wt,{onClick:c,children:`새 탭으로 열기`})})})]})},se=()=>(0,D.jsxs)(`svg`,{width:`16`,height:`16`,viewBox:`0 0 24 24`,fill:`none`,stroke:v.page.color,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`,children:[(0,D.jsx)(`path`,{d:`M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z`}),(0,D.jsx)(`polyline`,{points:`14 2 14 8 20 8`}),(0,D.jsx)(`line`,{x1:`16`,y1:`13`,x2:`8`,y2:`13`}),(0,D.jsx)(`line`,{x1:`16`,y1:`17`,x2:`8`,y2:`17`}),(0,D.jsx)(`polyline`,{points:`10 9 9 9 8 9`})]}),ce=()=>(0,D.jsxs)(`svg`,{width:`16`,height:`16`,viewBox:`0 0 24 24`,fill:`none`,stroke:v.space.color,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`,children:[(0,D.jsx)(`path`,{d:`M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z`}),(0,D.jsx)(`polyline`,{points:`9 22 9 12 15 12 15 22`})]}),L=s.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: ${v.bg.subtle};
  overflow: hidden;
  zoom: 1.2;
`,le=s.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${v.bg.default};
  border-bottom: 1px solid ${v.border};
  flex-wrap: wrap;
  flex-shrink: 0;
`,ue=s.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.125rem;
  color: ${v.text.primary};
  flex-shrink: 0;
`,de=s.span`
  display: inline-flex;
  align-items: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  & > svg { width: 100%; height: 100%; }
`,fe=s.div`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`,pe=s.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${v.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${v.bg.subtle};
  color: ${v.text.primary};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${a};
  &:hover {
    background: ${v.bg.hover};
    border-color: ${v.primary};
  }
`,me=s.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.25rem;
  border-radius: 9px;
  background: ${v.primary};
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
`,he=s.div`
  flex: 1;
  position: relative;
  min-width: 120px;
`,ge=s.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid ${v.border};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${v.bg.subtle} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2397A0AF' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 0.5rem center;
  box-sizing: border-box;
  &::placeholder { color: ${v.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${v.primary};
    background-color: ${v.bg.default};
  }
`,_e=s.div`
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
`,ve=s.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: transparent;
  border: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${v.text.secondary};
  cursor: pointer;
  transition: color 0.15s ${a};
  white-space: nowrap;

  &:hover {
    color: ${v.primary};
  }
`,ye=s.span`
  font-size: 0.5rem;
  line-height: 1;
`,be=s.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: ${v.bg.default};
  border: 1px solid ${v.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 100px;
  padding: 0.25rem 0;
  z-index: 300;
`,xe=s.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  color: ${({$active:e})=>e?v.primary:v.text.primary};
  background: ${({$active:e})=>e?v.primaryLight:`transparent`};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${({$active:e})=>e?v.primaryLight:v.bg.hover};
  }
`,Se=s.span`
  font-size: 0.6875rem;
  color: ${v.primary};
  margin-left: 0.5rem;
`,Ce=s.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${v.bg.default};
  border: 1px solid ${v.border};
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 200;
  max-height: 420px;
  overflow-y: auto;
`,we=s.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  background: ${({$active:e})=>e?v.bg.hover:`transparent`};
  transition: background 0.1s;
  &:hover { background: ${v.bg.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${v.border}; }
`,Te=s.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`,Ee=s.span`
  flex: 1;
  font-size: 0.8125rem;
  color: ${v.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,De=s.span`
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: ${v.text.secondary};
  white-space: nowrap;
`,Oe=s.span`
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 20px;
  background: ${v.space.bg};
  color: ${v.space.color};
`,ke=s.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${v.text.muted};
`,Ae=s.button`
  padding: 0.5rem 1rem;
  background: ${v.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${a};
  flex-shrink: 0;
  &:hover { background: ${v.primaryHover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`,je=s.button`
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: ${v.text.secondary};
  border: 1px solid ${v.border};
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: ${v.bg.hover}; color: ${v.text.primary}; }
`,Me=s.button`
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  background: transparent;
  border: 1px solid ${v.border};
  border-radius: 20px;
  color: ${v.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: ${v.bg.hover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`,Ne=s.main`
  flex: 1;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
`,Pe=s.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`,Fe=s.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${v.text.primary};
`,Ie=s.div`
  display: flex;
  gap: 0.5rem;
`,R=s.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid ${v.border};
  border-radius: 20px;
  color: ${v.text.secondary};
  cursor: pointer;
  &:hover { background: ${v.bg.hover}; color: ${v.text.primary}; }
`,z=r`
  to { transform: rotate(360deg); }
`,Le=s.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
`,Re=s.div`
  width: 1.5rem;
  height: 1.5rem;
  border: 2.5px solid ${v.border};
  border-top-color: ${v.primary};
  border-radius: 50%;
  animation: ${z} 0.7s linear infinite;
`,ze=s.span`
  font-size: 0.8125rem;
  color: ${v.text.secondary};
`,Be=s.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${v.text.secondary};
`,Ve=s.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 20vh;
`,He=s.div`
  text-align: center;
  color: ${v.text.muted};
  font-size: 0.95rem;
`,Ue=s.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,We=s.div`
  border-radius: 6px;
  border: 1px solid ${v.border};
  overflow: hidden;
`,Ge=s.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background: #F8F9FB;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${a};
  min-width: 0;
  border-left: 3px solid ${v.space.color};
  &:hover { background: ${v.bg.hover}; }
`,Ke=s.span`
  font-size: 0.625rem;
  color: ${v.text.muted};
  width: 0.875rem;
  flex-shrink: 0;
`,qe=s.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`,Je=s.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${v.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`,Ye=s.span`
  font-size: 0.6875rem;
  font-weight: 500;
  color: ${v.space.color};
  flex-shrink: 0;
`,Xe=s.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${v.space.color};
  background: ${v.space.bg};
  border-radius: 10px;
  padding: 0.125rem 0.5rem;
  flex-shrink: 0;
`,Ze=s.div``,Qe=s.div`
  display: grid;
  grid-template-columns: 1fr minmax(70px, 90px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 0.75rem;
  padding: 0.4rem 1rem 0.4rem 2.25rem;
  background: #ECEEF2;
  border-top: 1px solid ${v.border};
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${v.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: center;

  & > span:first-of-type { text-align: left; }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding-left: 1rem;
    span:nth-child(2),
    span:nth-child(3),
    span:nth-child(4) { display: none; }
  }
`,$e=s.div`
  display: grid;
  grid-template-columns: 1fr minmax(70px, 90px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.5rem 2.25rem;
  background: ${v.bg.default};
  border-top: 1px solid #F0F1F3;
  align-items: center;
  cursor: pointer;
  transition: background 0.12s ${a};

  &:first-of-type { border-top: none; }
  &:hover { background: #F5F7FA; }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding-left: 1rem;
  }
`,et=s.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
`,tt=s.span`
  font-size: 0.8125rem;
  color: ${v.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,nt=s.span`
  font-size: 0.6875rem;
  font-weight: 500;
  color: ${v.text.secondary};
  text-align: center;
  text-transform: capitalize;

  @media (max-width: 600px) { display: none; }
`,rt=s.span`
  font-size: 0.75rem;
  color: ${({$isMe:e})=>e?v.primary:v.text.secondary};
  font-weight: ${({$isMe:e})=>e?600:400};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;

  @media (max-width: 600px) { display: none; }
`,it=s.span`
  font-size: 0.75rem;
  color: ${v.text.muted};
  text-align: center;
  white-space: nowrap;

  @media (max-width: 600px) { display: none; }
`,at=s.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`,ot=s.div`
  background: ${v.bg.default};
  border-radius: 6px;
  border: 1px solid ${v.border};
  width: 420px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`,st=s.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${v.border};
`,ct=s.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${v.text.primary};
`,lt=s.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${v.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  &:hover { color: ${v.text.primary}; }
`,ut=s.div`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: ${v.text.secondary};
  border-bottom: 1px solid ${v.border};
`,dt=s.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid ${v.border};
`,ft=s.input`
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid ${v.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${v.bg.subtle};
  color: ${v.text.primary};
  &::placeholder { color: ${v.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${v.primary};
    background: ${v.bg.default};
  }
`,pt=s.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  max-height: 400px;
`,mt=s.div`
  padding: 0.375rem 1.25rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${v.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${v.border};
  margin-bottom: 0.125rem;
  &:not(:first-of-type) {
    margin-top: 0.375rem;
    border-top: 1px solid ${v.border};
    padding-top: 0.5rem;
  }
`,ht=s.div`
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${v.text.muted};
`,gt=s.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({$active:e})=>e?v.primaryLight:`transparent`};
  &:hover {
    background: ${({$active:e})=>e?v.primaryLight:v.bg.hover};
  }
`,_t=s.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid ${({$checked:e})=>e?v.primary:v.border};
  background: ${({$checked:e})=>e?v.primary:`transparent`};
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  flex-shrink: 0;
`,vt=s.span`
  flex: 1;
  font-size: 0.8125rem;
  color: ${v.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,yt=s.span`
  font-size: 0.6875rem;
  color: ${v.text.muted};
  flex-shrink: 0;
`,bt=s.div`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${v.border};
  display: flex;
  justify-content: flex-end;
`,xt=s.button`
  padding: 0.5rem 1.25rem;
  background: ${v.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${a};
  &:hover { background: ${v.primaryHover}; }
`,St=s.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`,Ct=s.div`
  position: fixed;
  background: ${v.bg.default};
  border: 1px solid ${v.border};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.25rem 0;
  z-index: 501;
`,wt=s.div`
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: ${v.text.primary};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${v.bg.subtle};
  }
`;function B(e){return typeof e==`string`?e:``}async function Tt(e){try{if(window.workspaceAPI?.settings)return await window.workspaceAPI.settings.getSelectedSpaces?.(e)??[];let t=localStorage.getItem(`lyra:confluence:selectedSpaces:${e}`);if(t){let e=JSON.parse(t);if(Array.isArray(e))return e}}catch{}return[]}var V=()=>{let{activeAccount:e}=h(),t=o(),[n,r]=(0,E.useState)([]),[i,a]=(0,E.useState)([]),[s,c]=(0,E.useState)(null),[l,d]=(0,E.useState)([]),[f,p]=(0,E.useState)(new Set),[m,_]=(0,E.useState)(``),[ee,v]=(0,E.useState)(!0),[y,x]=(0,E.useState)(!1),[O,k]=(0,E.useState)(!1),A=(0,E.useCallback)(async()=>{if(e){v(!0);try{let t=await Tt(e.id);r(t),t.length===0&&(a([]),c(null),d([]))}catch{}v(!1)}},[e]);(0,E.useEffect)(()=>{A()},[A]),(0,E.useEffect)(()=>{let e=()=>A();return window.addEventListener(`lyra:confluence-space-settings-changed`,e),()=>window.removeEventListener(`lyra:confluence-space-settings-changed`,e)},[A]),(0,E.useEffect)(()=>{if(!e||n.length===0){a([]);return}x(!0),u.invoke({accountId:e.id,serviceType:`confluence`,action:`getSpaces`,params:{}}).then(e=>{let t=e.results??[],r=new Set(n),i=t.map(e=>({id:B(e.id),key:B(e.key),name:B(e.name),type:B(e.type)})).filter(e=>e.key&&r.has(e.key)).sort((e,t)=>e.name.localeCompare(t.name));a(i),i.length>0?c(e=>e&&i.some(t=>t.key===e)?e:i[0].key):(c(null),d([]))}).catch(()=>a([])).finally(()=>x(!1))},[e,n]);let[j,M]=(0,E.useState)(new Set),N=(0,E.useCallback)(e=>e.map(e=>({id:B(e.id),title:B(e.title),parentId:e.parentId?B(e.parentId):null,children:[],hasChildren:!!e.hasChildren,childrenLoaded:!1})),[]),P=(0,E.useCallback)((e,t,n)=>e.map(e=>{if(e.id===t)return{...e,children:n,childrenLoaded:!0,hasChildren:n.length>0};if(e.children.length>0){let r=P(e.children,t,n);if(r!==e.children)return{...e,children:r}}return e}),[]);(0,E.useEffect)(()=>{if(!e||!s){d([]);return}let t=!1;return k(!0),d([]),p(new Set),M(new Set),_(``),(async()=>{try{let n=await u.invoke({accountId:e.id,serviceType:`confluence`,action:`getSpacePages`,params:{spaceKey:s}});if(t)return;let r=N(n.results??[]),i=r.length===1&&r[0].hasChildren?[{...r[0],childrenLoaded:!1}]:r;t||d(i)}catch(e){console.error(`[ConfluenceSidebar] load error:`,e),t||d([])}finally{t||k(!1)}})(),()=>{t=!0}},[e,s,N]);let re=(0,E.useCallback)(async t=>{if(e){M(e=>new Set(e).add(t));try{let n=N((await u.invoke({accountId:e.id,serviceType:`confluence`,action:`getChildPages`,params:{pageId:t}})).results??[]);d(e=>P(e,t,n))}catch(e){console.error(`[ConfluenceSidebar] loadChildren error:`,e),d(e=>P(e,t,[]))}finally{M(e=>{let n=new Set(e);return n.delete(t),n})}}},[e,N,P]),ie=(0,E.useCallback)(e=>{c(t=>t===e?t:e)},[]),ae=(0,E.useCallback)(e=>{p(t=>{let n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n})},[]),oe=(0,E.useCallback)(e=>{t.push(`/confluence/page/${e}`)},[t]),F=(0,E.useCallback)((e,t)=>{if(!t)return e;let n=t.toLowerCase(),r=[];for(let i of e){let e=F(i.children,t);(i.title.toLowerCase().includes(n)||e.length>0)&&r.push({...i,children:e})}return r},[]),I=m?F(l,m):l,se=(0,E.useCallback)(e=>{let t=f.has(e.id);ae(e.id),!t&&e.hasChildren&&!e.childrenLoaded&&re(e.id)},[f,ae,re]),ce=(e,t)=>{let n=e.hasChildren||e.children.length>0,r=f.has(e.id),i=j.has(e.id);return(0,D.jsxs)(`div`,{children:[(0,D.jsxs)(Pt,{$depth:t,children:[n?(0,D.jsx)(J,{onClick:()=>se(e),children:i?(0,D.jsx)(b,{size:12}):r?(0,D.jsx)(te,{size:14}):(0,D.jsx)(w,{size:14})}):(0,D.jsx)(Ft,{}),n?(0,D.jsx)(ne,{size:15,color:g.textMuted}):(0,D.jsx)(T,{size:15,color:g.textMuted}),(0,D.jsx)(It,{onClick:()=>{n&&se(e),oe(e.id)},title:e.title,children:e.title})]}),r&&e.children.map(e=>ce(e,t+1))]},e.id)},L=i.find(e=>e.key===s);return ee?(0,D.jsx)(Et,{children:(0,D.jsxs)(Y,{children:[(0,D.jsx)(b,{size:14}),(0,D.jsx)(`span`,{children:`로딩 중...`})]})}):n.length===0?(0,D.jsx)(Et,{children:(0,D.jsxs)(Lt,{children:[(0,D.jsx)(C,{size:20,color:g.textMuted}),(0,D.jsx)(Z,{children:`스페이스 설정을 진행해야만 조회할 수 있습니다.`}),(0,D.jsx)(Rt,{onClick:()=>t.push(`/confluence`),children:`스페이스 설정하기`})]})}):(0,D.jsxs)(Et,{children:[i.length>1&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(Dt,{children:`스페이스`}),y?(0,D.jsxs)(Y,{children:[(0,D.jsx)(b,{size:14}),(0,D.jsx)(`span`,{children:`로딩 중...`})]}):(0,D.jsx)(Ot,{children:i.map(e=>(0,D.jsxs)(kt,{$active:s===e.key,onClick:()=>ie(e.key),children:[(0,D.jsx)(ne,{size:14}),(0,D.jsx)(H,{children:e.name}),!e.key.startsWith(`~`)&&(0,D.jsx)(U,{children:e.key})]},e.key))}),(0,D.jsx)(Mt,{})]}),L&&(0,D.jsxs)(At,{children:[(0,D.jsx)(W,{title:L.name,children:L.name}),!L.key.startsWith(`~`)&&(0,D.jsx)(jt,{children:L.key})]}),s&&l.length>0&&(0,D.jsxs)(G,{children:[(0,D.jsx)(K,{children:(0,D.jsx)(S,{size:14})}),(0,D.jsx)(q,{placeholder:`제목으로 검색`,value:m,onChange:e=>_(e.target.value)})]}),O?(0,D.jsxs)(Y,{children:[(0,D.jsx)(b,{size:14}),(0,D.jsx)(`span`,{children:`페이지 로딩 중...`})]}):s?I.length===0?(0,D.jsx)(X,{children:m?`검색 결과가 없습니다.`:`페이지가 없습니다.`}):(0,D.jsx)(Nt,{children:I.map(e=>ce(e,0))}):(0,D.jsx)(X,{children:`스페이스를 선택해주세요.`})]})},Et=s.div`
  font-size: 0.8125rem;
  display: flex;
  flex-direction: column;
  height: 100%;
`,Dt=s.div`
  padding: 4px 12px;
  font-weight: 600;
  font-size: 0.6875rem;
  color: ${g.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`,Ot=s.div`
  max-height: 160px;
  overflow-y: auto;
`,kt=s.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  cursor: pointer;
  color: ${({$active:e})=>e?g.blue:g.textPrimary};
  background: ${({$active:e})=>e?g.blueLight:`transparent`};
  font-weight: ${({$active:e})=>e?600:400};
  font-size: 0.8125rem;
  transition: background 0.1s ease;

  &:hover {
    background: ${({$active:e})=>e?g.blueLight:g.bgTertiary};
  }
`,H=s.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
`,U=s.span`
  font-size: 0.6875rem;
  color: ${g.textMuted};
  flex-shrink: 0;
`,At=s.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
`,W=s.span`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${g.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`,jt=s.span`
  font-size: 0.6875rem;
  color: ${g.textMuted};
  flex-shrink: 0;
`,Mt=s.hr`
  border: none;
  border-top: 1px solid ${g.border};
  margin: 4px 0;
`,G=s.div`
  position: relative;
  margin: 4px 10px 8px;
`,K=s.span`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: ${g.textMuted};
  display: flex;
  align-items: center;
`,q=s.input`
  width: 100%;
  padding: 6px 8px 6px 28px;
  border: 1px solid ${g.border};
  border-radius: 6px;
  background: ${g.bgPrimary};
  color: ${g.textPrimary};
  font-size: 0.8125rem;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${g.blue};
  }

  &::placeholder {
    color: ${g.textMuted};
  }
`,Nt=s.div`
  flex: 1;
  overflow-y: auto;
`,Pt=s.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px 5px ${({$depth:e})=>12+e*16}px;
  min-height: 32px;

  &:hover {
    background: ${g.bgTertiary};
  }
`,J=s.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: none;
  border: none;
  color: ${g.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 3px;

  &:hover {
    background: ${g.border};
    color: ${g.textPrimary};
  }
`,Ft=s.span`
  width: 18px;
  flex-shrink: 0;
`,It=s.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${g.textSecondary};
  cursor: pointer;
  font-size: 0.875rem;

  &:hover {
    color: ${g.blue};
  }
`,Y=s.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: ${g.textMuted};
  font-size: 0.8125rem;

  svg {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`,X=s.div`
  padding: 12px;
  color: ${g.textMuted};
  font-size: 0.8125rem;
`,Lt=s.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  text-align: center;
`,Z=s.p`
  margin: 0;
  color: ${g.textMuted};
  font-size: 0.8125rem;
  line-height: 1.5;
`,Rt=s.button`
  padding: 6px 14px;
  background: ${g.blue};
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`,zt=(0,E.lazy)(()=>m(()=>import(`./ConfluencePageDetail-CVjs8m35.js`),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]),import.meta.url)),Bt=s.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: ${g.bgPrimary};
`,Vt=()=>{let{path:e}=n();return(0,D.jsxs)(Bt,{children:[(0,D.jsx)(_,{children:(0,D.jsx)(`title`,{children:`Confluence - Workspace`})}),(0,D.jsx)(x,{sidebar:(0,D.jsx)(V,{}),children:(0,D.jsx)(E.Suspense,{fallback:null,children:(0,D.jsxs)(c,{children:[(0,D.jsx)(i,{path:`${e}${e.endsWith(`/confluence`)?``:`/confluence`}/page/:pageId`,component:zt}),(0,D.jsx)(i,{path:`${e}/page/:pageId`,component:zt}),(0,D.jsx)(i,{path:e,component:I,exact:!0})]})})})]})};export{Vt as default};