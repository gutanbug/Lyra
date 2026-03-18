import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import"./hoist-non-react-statics.cjs-y9ytJ0rQ.js";import{i as n,m as r,o as i,t as a}from"./jsx-runtime-CLmotcMK.js";import"./react-fast-compare-BUZ6R6YJ.js";import"./browser-BW_oQsLB.js";import{a as o,c as s,d as c,f as l,i as u,l as d,o as f,p,s as m,t as h}from"./index-DlQa474I.js";import{t as g}from"./createLucideIcon-C8aM4Rfc.js";import{t as _}from"./arrow-left-CYJ8njMe.js";import{t as v}from"./loader-DQlVBXqR.js";var y=g(`check`,[[`path`,{d:`M20 6 9 17l-5-5`,key:`1gmf2c`}]]),b=e(t()),x=a(),ee=i.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
`,S=i.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${p.textPrimary};
`,C=i.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${p.border};
  border-radius: 4px;
  font-size: 0.875rem;
  background: ${p.bgPrimary};

  &:focus {
    outline: none;
    border-color: ${p.borderFocus};
  }
`,w=i.button`
  padding: 0.5rem 1rem;
  background: ${p.blue};
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${n};

  &:hover {
    background: ${p.blueDark};
  }

  &:disabled {
    background: ${p.textMuted};
    cursor: not-allowed;
  }
`,te=i.div`
  position: relative;
`,ne=i.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${p.border};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${p.bgPrimary};
  text-align: left;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${p.borderFocus};
  }
`,re=i.span`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,ie=i.svg`
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  color: ${p.textMuted};
  transition: transform 0.15s ease;
  transform: rotate(${({$open:e})=>e?`180deg`:`0deg`});
`,T=i.span`
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`,ae=i.ul`
  display: ${({$open:e})=>e?`block`:`none`};
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0.25rem 0 0 0;
  padding: 0.25rem 0;
  list-style: none;
  background: ${p.bgPrimary};
  border: 1px solid ${p.border};
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
`,oe=i.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;

  &:hover {
    background: ${p.blueLight};
  }
`,E=({onSuccess:e,editAccount:t})=>{let n=!!t,{dispatch:r}=b.useContext(u),[i,a]=(0,b.useState)([]),[f,p]=(0,b.useState)(t?.serviceType||`atlassian`),[h,g]=(0,b.useState)(!1),_=b.useRef(null);b.useEffect(()=>{let e=e=>{_.current&&!_.current.contains(e.target)&&g(!1)};return document.addEventListener(`click`,e),()=>document.removeEventListener(`click`,e)},[]);let v=t?.credentials,[y,E]=(0,b.useState)(t?.displayName||``),[D,O]=(0,b.useState)(v?.baseUrl||``),[k,A]=(0,b.useState)(v?.email||``),[j,M]=(0,b.useState)(``),[N,P]=(0,b.useState)(!1),[F,I]=(0,b.useState)(!1);b.useEffect(()=>{s.getAvailable().then(e=>{if(e.some(e=>d(e.type))){let t=[{type:`atlassian`,displayName:`Atlassian`,icon:`atlassian`}];for(let n of e)d(n.type)||t.push(n);a(t)}else a(e)})},[]);let L=async i=>{if(i.preventDefault(),!y.trim()){o(r,`표시 이름을 입력해주세요.`,`WARNING`);return}if(d(f)&&(!D.trim()||!k.trim()||!n&&!j.trim())){o(r,`모든 필드를 입력해주세요.`,`WARNING`);return}P(!0);try{let i={baseUrl:D.trim().replace(/\/$/,``),email:k.trim(),apiToken:j.trim()||v?.apiToken||``},a=t?.metadata||{};if(j.trim()||!n){let e=await s.validate(f,i);if(!e||typeof e==`object`&&!e.valid){o(r,`연결 실패. URL, 이메일, API 토큰을 확인해주세요.`,`ERROR`),P(!1);return}if(typeof e==`object`){let t=e;a={...a,userDisplayName:t.userDisplayName,userAccountId:t.userAccountId}}}if(n&&t)await m.update(t.id,{serviceType:f,displayName:y.trim(),credentials:i,metadata:a}),o(r,`계정이 수정되었습니다.`,`SUCCESS`);else{let e={serviceType:f,displayName:y.trim(),credentials:i,metadata:a};await m.add(e),o(r,`계정이 추가되었습니다.`,`SUCCESS`)}e()}catch(e){o(r,n?`계정 수정에 실패했습니다.`:`계정 추가에 실패했습니다.`,`ERROR`),console.error(e)}finally{P(!1)}},R=async()=>{if(!d(f)||!D.trim()||!k.trim()||!j.trim()){o(r,`모든 필드를 입력해주세요.`,`WARNING`);return}I(!0);try{let e={baseUrl:D.trim().replace(/\/$/,``),email:k.trim(),apiToken:j.trim()},t=await s.validate(f,e);o(r,t?`연결 확인되었습니다.`:`연결 실패. 정보를 확인해주세요.`,t?`SUCCESS`:`ERROR`)}catch(e){o(r,`연결 확인에 실패했습니다.`,`ERROR`),console.error(e)}finally{I(!1)}},z=i.find(e=>e.type===f);return(0,x.jsxs)(ee,{onSubmit:L,children:[(0,x.jsxs)(S,{children:[`서비스`,(0,x.jsxs)(te,{ref:_,children:[(0,x.jsxs)(ne,{type:`button`,onClick:()=>!n&&g(!h),style:n?{opacity:.6,cursor:`default`}:void 0,children:[(0,x.jsxs)(re,{children:[l(f)?(0,x.jsx)(T,{children:c(f,20)}):null,z?.displayName??f]}),(0,x.jsx)(ie,{$open:h,viewBox:`0 0 12 12`,fill:`none`,stroke:`currentColor`,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`,children:(0,x.jsx)(`polyline`,{points:`2,4 6,8 10,4`})})]}),(0,x.jsx)(ae,{$open:h,children:i.map(e=>(0,x.jsxs)(oe,{onMouseDown:t=>{t.preventDefault(),p(e.type),g(!1)},children:[l(e.type)?(0,x.jsx)(T,{children:c(e.type,20)}):null,e.displayName]},e.type))})]})]}),(0,x.jsxs)(S,{children:[`표시 이름`,(0,x.jsx)(C,{type:`text`,placeholder:`예: 회사 Atlassian`,value:y,onChange:e=>E(e.target.value)})]}),d(f)&&(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)(S,{children:[`Atlassian URL`,(0,x.jsx)(C,{type:`url`,placeholder:`https://your-domain.atlassian.net`,value:D,onChange:e=>O(e.target.value)})]}),(0,x.jsxs)(S,{children:[`이메일`,(0,x.jsx)(C,{type:`email`,placeholder:`your@email.com`,value:k,onChange:e=>A(e.target.value)})]}),(0,x.jsxs)(S,{children:[`API 토큰`,(0,x.jsx)(C,{type:`password`,placeholder:n?`변경 시에만 입력`:`Atlassian API 토큰`,value:j,onChange:e=>M(e.target.value)})]})]}),(0,x.jsxs)(`div`,{style:{display:`flex`,gap:`0.5rem`},children:[(0,x.jsx)(w,{type:`submit`,disabled:N,children:N?n?`수정 중...`:`추가 중...`:n?`수정`:`추가`}),d(f)&&(0,x.jsx)(w,{type:`button`,onClick:R,disabled:F,children:F?`확인 중...`:`연결 확인`})]})]})},D=i.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
`,O=i.li`
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
  background: ${({$active:e})=>e?p.blueLight:p.bgSecondary};
  border: 2px solid ${({$active:e,$selected:t})=>t||e?p.blue:p.border};
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;

  ${({$selected:e})=>!e&&`
    &:hover { border-color: ${p.textMuted}; }
  `}
`,k=i.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`,A=i.span`
  font-weight: 600;
  color: ${p.textPrimary};
`,j=i.span`
  font-size: 0.75rem;
  color: ${p.textSecondary};
`,M=i.div`
  display: flex;
  gap: 0.5rem;
`,N=i.button`
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ${n};

  ${({$variant:e})=>e===`danger`?`
    background: #fef2f2;
    color: ${p.error};
    &:hover { background: #fee2e2; }
  `:`
    background: ${p.blueLight};
    color: ${p.blue};
    &:hover { background: ${p.blueLighter}; }
  `}
`,P=i.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 25rem);
  color: ${p.textMuted};
  font-size: 0.95rem;
`,F=i.span`
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.5rem;
  vertical-align: middle;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`,I=({onEdit:e,onSelect:t,selectedId:n})=>{let{accounts:r,activeAccount:i,refresh:a,setActive:s}=f(),{dispatch:d}=b.useContext(u),p=async e=>{try{await s(e),o(d,`활성 계정이 변경되었습니다.`,`SUCCESS`)}catch{o(d,`활성 계정 변경에 실패했습니다.`,`ERROR`)}},h=async e=>{if(window.confirm(`"${e.displayName}" 계정을 삭제하시겠습니까?`))try{await m.remove(e.id),o(d,`계정이 삭제되었습니다.`,`SUCCESS`),a()}catch{o(d,`계정 삭제에 실패했습니다.`,`ERROR`)}};return r.length===0?(0,x.jsx)(P,{children:`계정을 추가하고 활성화해주세요.`}):(0,x.jsx)(D,{children:r.map(r=>(0,x.jsxs)(O,{$active:i?.id===r.id,$selected:n===r.id,onClick:()=>t?.(r.id),children:[(0,x.jsxs)(k,{children:[(0,x.jsx)(A,{children:l(r.serviceType)?(0,x.jsxs)(x.Fragment,{children:[(0,x.jsx)(F,{children:c(r.serviceType,20)}),r.displayName]}):r.displayName}),(0,x.jsxs)(j,{children:[r.serviceType.charAt(0).toUpperCase()+r.serviceType.slice(1),`baseUrl`in r.credentials&&` · ${r.credentials.baseUrl}`]})]}),(0,x.jsxs)(M,{children:[i?.id!==r.id&&(0,x.jsx)(N,{onClick:()=>p(r.id),children:`활성화`}),e&&(0,x.jsx)(N,{onClick:()=>e(r),children:`수정`}),(0,x.jsx)(N,{$variant:`danger`,onClick:()=>h(r),children:`삭제`})]})]},r.id))})},L=[{id:`account`,label:`계정 설정`},{id:`shortcuts`,label:`단축키 관리`}],R=navigator.platform.toUpperCase().indexOf(`MAC`)>=0?`⌘`:`Ctrl`,z=[{title:`탐색`,items:[{label:`검색창 포커스`,keys:[R,`L`]},{label:`이전 메뉴`,keys:[`[`]},{label:`다음 메뉴`,keys:[`]`]},{label:`탭 닫기`,keys:[R,`W`]},{label:`탭 전환 (1=메인, 2~9=탭)`,keys:[R,`1~9`]}]},{title:`보기`,items:[{label:`모두 접기`,keys:[`-`]},{label:`모두 펼치기`,keys:[`+`]},{label:`사이드바 토글`,keys:[R,`\\`]}]},{title:`일반`,items:[{label:`환경설정`,keys:[R,`,`]},{label:`프로필 변경`,keys:[R,`;`]}]},{title:`편집기`,items:[{label:`굵게`,keys:[R,`B`]},{label:`기울임`,keys:[R,`I`]},{label:`밑줄`,keys:[R,`U`]},{label:`취소선`,keys:[R,`⇧`,`S`]},{label:`인라인 코드`,keys:[R,`E`]},{label:`코드블록`,keys:[R,`⇧`,`C`]},{label:`링크 삽입`,keys:[R,`K`]},{label:`댓글 전송`,keys:[R,`↵`]}]}],se=({account:e})=>{let[t,n]=(0,b.useState)([]),[r,i]=(0,b.useState)([]),[a,o]=(0,b.useState)(new Set),[c,l]=(0,b.useState)(new Set),[u,d]=(0,b.useState)(!0);(0,b.useEffect)(()=>{let t=!1;return d(!0),(async()=>{try{let r=await window.workspaceAPI?.settings.getSelectedProjects(e.id)??[],a=await window.workspaceAPI?.settings.getSelectedSpaces(e.id)??[];if(t)return;o(new Set(r)),l(new Set(a));let c=await s.invoke({accountId:e.id,serviceType:`jira`,action:`getProjects`,params:{}});if(!t){let e=c?.values??c??[];n((Array.isArray(e)?e:[]).map(e=>({key:String(e.key||``),name:String(e.name||``)})).filter(e=>e.key))}let u=await s.invoke({accountId:e.id,serviceType:`confluence`,action:`getSpaces`,params:{}});t||i((u?.results??[]).map(e=>({key:String(e.key||``),name:String(e.name||``)})).filter(e=>e.key))}catch(e){console.error(`[AtlassianSettings] load error:`,e)}finally{t||d(!1)}})(),()=>{t=!0}},[e.id]);let f=(0,b.useCallback)(t=>{o(n=>{let r=new Set(n);return r.has(t)?r.delete(t):r.add(t),window.workspaceAPI?.settings.setSelectedProjects(e.id,Array.from(r)),r})},[e.id]),p=(0,b.useCallback)(t=>{l(n=>{let r=new Set(n);return r.has(t)?r.delete(t):r.add(t),window.workspaceAPI?.settings.setSelectedSpaces(e.id,Array.from(r)),window.dispatchEvent(new CustomEvent(`lyra:confluence-space-settings-changed`)),r})},[e.id]);return u?(0,x.jsxs)(U,{children:[(0,x.jsx)(v,{size:16}),(0,x.jsx)(`span`,{children:`설정 로딩 중...`})]}):(0,x.jsxs)(Re,{children:[(0,x.jsxs)(W,{children:[(0,x.jsx)(G,{children:`Jira 프로젝트`}),(0,x.jsx)(K,{children:`사이드바에 표시할 프로젝트를 선택하세요.`}),(0,x.jsxs)(q,{children:[t.map(e=>(0,x.jsxs)(J,{onClick:()=>f(e.key),children:[(0,x.jsx)(Y,{$checked:a.has(e.key),children:a.has(e.key)&&(0,x.jsx)(y,{size:12})}),(0,x.jsxs)(X,{children:[(0,x.jsx)(Z,{children:e.name}),(0,x.jsx)(Q,{children:e.key})]})]},e.key)),t.length===0&&(0,x.jsx)($,{children:`프로젝트가 없습니다.`})]})]}),(0,x.jsxs)(W,{children:[(0,x.jsx)(G,{children:`Confluence 스페이스`}),(0,x.jsx)(K,{children:`사이드바에 표시할 스페이스를 선택하세요.`}),(0,x.jsxs)(q,{children:[r.map(e=>(0,x.jsxs)(J,{onClick:()=>p(e.key),children:[(0,x.jsx)(Y,{$checked:c.has(e.key),children:c.has(e.key)&&(0,x.jsx)(y,{size:12})}),(0,x.jsxs)(X,{children:[(0,x.jsx)(Z,{children:e.name}),!e.key.startsWith(`~`)&&(0,x.jsx)(Q,{children:e.key})]})]},e.key)),r.length===0&&(0,x.jsx)($,{children:`스페이스가 없습니다.`})]})]})]})},ce=()=>{let{accounts:e,refresh:t}=f(),n=typeof window<`u`&&!!window.workspaceAPI,[r,i]=(0,b.useState)(null),[a,o]=(0,b.useState)(void 0),[s,c]=(0,b.useState)(null);(0,b.useEffect)(()=>{e.length>0&&!s&&c(e[0].id)},[e,s]);let l=e.find(e=>e.id===s),u=()=>{t(),i(null),o(void 0)},p=()=>{i(null),o(void 0)};return(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)(Fe,{children:[(0,x.jsxs)(Ie,{children:[(0,x.jsxs)(B,{children:[(0,x.jsx)(V,{children:`계정 설정`}),n&&(0,x.jsx)(be,{onClick:()=>i(`add`),children:`+ 계정 추가`})]}),!n&&(0,x.jsx)(xe,{children:`계정 관리는 Electron 데스크톱 앱에서만 사용할 수 있습니다.`}),(0,x.jsx)(I,{onEdit:n?e=>{o(e),i(`edit`)}:void 0,onSelect:c,selectedId:s})]}),(0,x.jsx)(Le,{children:l?(0,x.jsxs)(x.Fragment,{children:[(0,x.jsx)(B,{children:(0,x.jsxs)(V,{children:[l.displayName,` 설정`]})}),d(l.serviceType)?(0,x.jsx)(se,{account:l},l.id):(0,x.jsx)(H,{children:`이 서비스 타입의 커스텀 설정은 아직 지원되지 않습니다.`})]}):(0,x.jsx)(H,{children:`계정을 선택하면 커스텀 설정을 진행할 수 있습니다.`})})]}),r&&(0,x.jsx)(Se,{onClick:p,children:(0,x.jsxs)(Ce,{onClick:e=>e.stopPropagation(),children:[(0,x.jsxs)(we,{children:[(0,x.jsx)(Te,{children:r===`edit`?`계정 수정`:`계정 추가`}),(0,x.jsx)(Ee,{onClick:p,children:`×`})]}),(0,x.jsx)(E,{onSuccess:u,editAccount:r===`edit`?a:void 0},a?.id||`new`)]})})]})},le=()=>(0,x.jsxs)(x.Fragment,{children:[(0,x.jsx)(B,{children:(0,x.jsx)(V,{children:`단축키 관리`})}),(0,x.jsx)(De,{children:z.map(e=>(0,x.jsxs)(Oe,{children:[(0,x.jsx)(ke,{children:e.title}),e.items.map(e=>(0,x.jsxs)(Ae,{children:[(0,x.jsx)(je,{children:e.label}),(0,x.jsx)(Me,{children:e.keys.map((e,t)=>(0,x.jsxs)(`span`,{children:[t>0&&(0,x.jsx)(Ne,{children:`+ `}),(0,x.jsx)(Pe,{children:e})]},t))})]},e.label))]},e.title))})]}),ue=()=>{let e=r(),[t,n]=(0,b.useState)(`account`);return(0,x.jsxs)(de,{children:[(0,x.jsx)(h,{children:(0,x.jsx)(`title`,{children:`환경설정 - Workspace`})}),(0,x.jsxs)(fe,{children:[(0,x.jsxs)(pe,{children:[(0,x.jsxs)(me,{children:[(0,x.jsx)(he,{onClick:()=>e.push(`/jira`),children:(0,x.jsx)(_,{size:16})}),(0,x.jsx)(ge,{children:`환경설정`})]}),(0,x.jsx)(_e,{children:L.map(e=>(0,x.jsx)(ve,{$active:t===e.id,onClick:()=>n(e.id),children:e.label},e.id))})]}),(0,x.jsxs)(ye,{children:[t===`account`&&(0,x.jsx)(ce,{}),t===`shortcuts`&&(0,x.jsx)(le,{})]})]})]})},de=i.div`
  width: 100%;
  flex: 1;
  min-height: 100%;
  background: ${p.bgPrimary};
  display: flex;
  flex-direction: column;
  zoom: 1.2;
`,fe=i.div`
  display: flex;
  flex: 1;
  min-height: 0;
`,pe=i.aside`
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid ${p.border};
  background: ${p.bgSecondary};
  display: flex;
  flex-direction: column;
  padding: 1.25rem 0;
`,me=i.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem 1rem;
`,he=i.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${p.border};
  border-radius: 50%;
  background: ${p.bgPrimary};
  color: ${p.textSecondary};
  cursor: pointer;
  transition: all 0.15s ${n};

  &:hover {
    border-color: ${p.blue};
    color: ${p.blue};
    background: ${p.blueLight};
  }
`,ge=i.span`
  font-size: 1rem;
  font-weight: 700;
  color: ${p.textPrimary};
`,_e=i.nav`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0 0.5rem;
`,ve=i.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  background: ${({$active:e})=>e?p.blueLight:`transparent`};
  color: ${({$active:e})=>e?p.blue:p.textSecondary};
  font-size: 0.8125rem;
  font-weight: ${({$active:e})=>e?600:500};
  cursor: pointer;
  transition: all 0.15s ${n};
  text-align: left;

  &:hover {
    background: ${({$active:e})=>e?p.blueLight:p.bgTertiary};
    color: ${({$active:e})=>e?p.blue:p.textPrimary};
  }
`,ye=i.main`
  flex: 1;
  min-width: 0;
  padding: 1.5rem 2rem;
  overflow-y: auto;
`,B=i.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
`,V=i.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${p.textPrimary};
`,be=i.button`
  padding: 0.4rem 0.875rem;
  background: ${p.blue};
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ${n};

  &:hover {
    background: ${p.blueDark};
  }
`,xe=i.p`
  padding: 1rem;
  background: ${p.blueLight};
  border: 1px solid ${p.blueLighter};
  border-radius: 8px;
  color: ${p.blueDarker};
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
`,Se=i.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
`,Ce=i.div`
  width: 100%;
  max-width: 460px;
  background: ${p.bgPrimary};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
`,we=i.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${p.border};
`,Te=i.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${p.textPrimary};
`,Ee=i.button`
  background: none;
  border: none;
  font-size: 1.375rem;
  color: ${p.textMuted};
  cursor: pointer;
  line-height: 1;
  padding: 0;

  &:hover {
    color: ${p.textPrimary};
  }
`,De=i.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,Oe=i.div``,ke=i.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${p.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
`,Ae=i.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
`,je=i.span`
  font-size: 0.8125rem;
  color: ${p.textPrimary};
`,Me=i.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`,Ne=i.span`
  font-size: 0.75rem;
  color: ${p.textMuted};
`,Pe=i.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.15rem 0.5rem;
  background: ${p.bgTertiary};
  border: 1px solid ${p.border};
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 500;
  color: ${p.textSecondary};
  box-shadow: 0 1px 0 ${p.border};
`,Fe=i.div`
  display: flex;
  gap: 2rem;
  min-height: 0;
`,Ie=i.div`
  flex: 0 0 480px;
  min-width: 0;
`,Le=i.div`
  flex: 1;
  min-width: 300px;
  border-left: 1px solid ${p.border};
  padding-left: 2rem;
`,H=i.div`
  color: ${p.textMuted};
  font-size: 0.875rem;
  padding: 2rem 0;
`,U=i.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${p.textMuted};
  font-size: 0.875rem;
  padding: 1rem 0;

  svg { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`,Re=i.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`,W=i.div``,G=i.h3`
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${p.textPrimary};
`,K=i.p`
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: ${p.textMuted};
`,q=i.div`
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid ${p.border};
  border-radius: 8px;
`,J=i.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${p.bgTertiary};
  }

  & + & {
    border-top: 1px solid ${p.border};
  }
`,Y=i.div`
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid ${({$checked:e})=>e?p.blue:p.border};
  background: ${({$checked:e})=>e?p.blue:`transparent`};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
`,X=i.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
`,Z=i.span`
  font-size: 0.8125rem;
  color: ${p.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Q=i.span`
  font-size: 0.6875rem;
  color: ${p.textMuted};
  flex-shrink: 0;
`,$=i.div`
  padding: 1rem;
  text-align: center;
  color: ${p.textMuted};
  font-size: 0.8125rem;
`;export{ue as default};