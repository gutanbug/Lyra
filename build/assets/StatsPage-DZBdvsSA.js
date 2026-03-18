import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import"./hoist-non-react-statics.cjs-y9ytJ0rQ.js";import{a as n,i as r,m as i,o as a,t as o}from"./jsx-runtime-CLmotcMK.js";import"./react-fast-compare-BUZ6R6YJ.js";import"./browser-BW_oQsLB.js";import{c as s,d as c,l as ee,o as te,p as l,t as ne,u as re}from"./index-DlQa474I.js";import{t as ie}from"./arrow-left-CYJ8njMe.js";import{i as ae,n as oe,r as se}from"./JiraTaskIcon-DQ38HPSa.js";import{t as u}from"./loader-DQlVBXqR.js";import{t as ce}from"./settings-CDsETrSH.js";import{t as le}from"./x-D7QIYFv5.js";var d=e(t()),f=o();function p(e){return typeof e==`string`?e:typeof e==`number`?String(e):``}function m(e){return e&&typeof e==`object`&&!Array.isArray(e)?e:null}var ue={완료:`#36B37E`,Done:`#36B37E`,"진행 중":`#0052CC`,"In Progress":`#0052CC`,"할 일":`#42526E`,"To Do":`#42526E`};function de(e){return ue[e]||`#6B778C`}function fe(e){if(!e)return`-`;try{return new Date(e).toLocaleDateString(`ko-KR`)}catch{return e}}function pe(){let e=[];for(let t=2040;t>=2020;t--)e.push(t);return e}var h=()=>{let e=i(),{accounts:t,activeAccount:n}=te(),{addTab:r}=re(),a=(0,d.useMemo)(()=>pe(),[]),o=t.some(e=>ee(e.serviceType)),[l,ue]=(0,d.useState)(new Date().getFullYear()),[h,g]=(0,d.useState)([]),[vt,N]=(0,d.useState)(!1),[P,F]=(0,d.useState)(null),[I,L]=(0,d.useState)([]),[yt,bt]=(0,d.useState)(!1),[xt,R]=(0,d.useState)(!1),[z,B]=(0,d.useState)(new Set),[V,H]=(0,d.useState)(null),[U,St]=(0,d.useState)([]),[Ct,wt]=(0,d.useState)(0),[Tt,Et]=(0,d.useState)(!1),[W,Dt]=(0,d.useState)(null),[G,K]=(0,d.useState)(null),Ot=(0,d.useCallback)(async()=>{if(n){N(!0);try{let e=`assignee = currentUser()`;if(l!==null){let t=`${l}-01-01`,n=`${l+1}-01-01`;e+=` AND created >= "${t}" AND created < "${n}"`}e+=` ORDER BY status ASC`;let t=[],r;for(let i=0;i<20;i++){let i=await s.invoke({accountId:n.id,serviceType:`jira`,action:`searchIssues`,params:{jql:e,maxResults:100,skipCache:!0,...r?{nextPageToken:r}:{}}}),a=i.issues??[];if(!Array.isArray(a))break;for(let e of a){let n=m(e.status),r=m(e.issue_type);t.push({statusName:p(n?.name)||`기타`,statusCategory:p(n?.category)||``,issueType:p(r?.name)||``})}if(r=i.nextPageToken,!r||a.length<100)break}g(t)}catch(e){console.error(`[StatsPage] Jira stats error:`,e),g([])}finally{N(!1)}}},[n,l]),q=(0,d.useMemo)(()=>{let e=new Set;for(let t of h)t.issueType&&e.add(t.issueType);return Array.from(e).sort()},[h]),J=(0,d.useMemo)(()=>z.size===0?h:h.filter(e=>z.has(e.issueType)),[h,z]),Y=(0,d.useMemo)(()=>{let e=new Map;for(let t of J){let n=e.get(t.statusName);n?n.count++:e.set(t.statusName,{name:t.statusName,category:t.statusCategory,count:1})}let t={"In Progress":0,"진행 중":0,"To Do":1,"할 일":1,Done:2,완료:2};return Array.from(e.values()).sort((e,n)=>{let r=t[e.category]??3,i=t[n.category]??3;return r===i?n.count-e.count:r-i})},[J]),X=J.length,Z=(0,d.useMemo)(()=>J.filter(e=>e.statusCategory===`Done`||e.statusCategory===`완료`).length,[J]),kt=(0,d.useCallback)(async e=>{if(P===e){F(null),L([]);return}F(e),L([]),B(new Set),bt(!0);try{if(!n)return;let t=`assignee = currentUser() AND status = "${e}"`;if(l!==null){let e=`${l}-01-01`,n=`${l+1}-01-01`;t+=` AND created >= "${e}" AND created < "${n}"`}if(z.size>0){let e=Array.from(z).map(e=>`"${e}"`).join(`, `);t+=` AND issuetype IN (${e})`}t+=` ORDER BY updated DESC`;let r=[],i;for(let e=0;e<10;e++){let e=await s.invoke({accountId:n.id,serviceType:`jira`,action:`searchIssues`,params:{jql:t,maxResults:100,skipCache:!0,...i?{nextPageToken:i}:{}}}),a=e.issues??[];if(!Array.isArray(a))break;for(let e of a){let t=m(e.issue_type);r.push({key:p(e.key),summary:p(e.summary),issueType:p(t?.name)})}if(i=e.nextPageToken,!i||a.length<100)break}L(r)}catch(e){console.error(`[StatsPage] fetch status issues error:`,e)}finally{bt(!1)}},[n,l,P,z]),At=(0,d.useCallback)(t=>{e.push(`/jira/issue/${t}`)},[e]),jt=(0,d.useCallback)((e,t,n)=>{e.preventDefault(),e.stopPropagation();let r=1.2;H({x:e.clientX/r,y:e.clientY/r,issueKey:t,label:n})},[]),Mt=(0,d.useCallback)(()=>{V&&(r(`jira`,`/jira/issue/${V.issueKey}`,V.label),H(null))},[V,r]),Nt=(0,d.useCallback)(async()=>{if(n){Et(!0);try{let e=(await s.invoke({accountId:n.id,serviceType:`confluence`,action:`getMyPages`,params:{limit:500}})).results??[],t=[];for(let n of e){let e=p(n.createdAt),r=m(n.space);t.push({id:p(n.id),title:p(n.title),createdAt:e,spaceName:p(r?.name)||p(n.spaceName)||``})}let r=l===null?t:t.filter(e=>{if(!e.createdAt)return!1;try{return new Date(e.createdAt).getFullYear()===l}catch{return!1}});St(r),wt(r.length)}catch(e){console.error(`[StatsPage] Confluence stats error:`,e),St([]),wt(0)}finally{Et(!1)}}},[n,l]);(0,d.useEffect)(()=>{o&&n&&(Ot(),F(null),L([]),B(new Set))},[Ot,o,n]),(0,d.useEffect)(()=>{o&&n&&Nt()},[Nt,o,n]);let Q=(0,d.useMemo)(()=>{let e=new Map;for(let t of U){let n=t.spaceName||`(스페이스 없음)`;e.set(n,(e.get(n)||0)+1)}return Array.from(e.entries()).sort((e,t)=>t[1]-e[1]).map(([e,t])=>({name:e,count:t}))},[U]),Pt=(0,d.useMemo)(()=>{let e=new Map;for(let t of U){let n=t.spaceName||`(스페이스 없음)`;e.has(n)||e.set(n,[]),e.get(n).push(t)}return e},[U]),Ft=(0,d.useMemo)(()=>{let e={"In Progress":`진행 중`,"진행 중":`진행 중`,"To Do":`할 일`,"할 일":`할 일`,Done:`완료`,완료:`완료`},t=[`진행 중`,`할 일`,`완료`,`기타`],n=new Map;for(let t of Y){let r=e[t.category]||`기타`;n.has(r)||n.set(r,[]),n.get(r).push(t)}return t.filter(e=>n.has(e)).map(e=>({category:e,color:de(e===`진행 중`?`In Progress`:e===`할 일`?`To Do`:e===`완료`?`Done`:``),statuses:n.get(e).sort((e,t)=>t.count-e.count),total:n.get(e).reduce((e,t)=>e+t.count,0)}))},[Y]),It=(0,d.useMemo)(()=>Math.max(...Y.map(e=>e.count),1),[Y]),$=(0,d.useMemo)(()=>z.size===0?I:I.filter(e=>z.has(e.issueType)),[I,z]),Lt=(0,d.useCallback)(e=>{B(t=>{let n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n})},[]);return(0,f.jsxs)(me,{children:[(0,f.jsx)(ne,{children:(0,f.jsx)(`title`,{children:`통계 - Workspace`})}),(0,f.jsxs)(he,{children:[(0,f.jsxs)(ge,{children:[(0,f.jsx)(_e,{onClick:()=>e.push(`/jira`),children:(0,f.jsx)(ie,{size:16})}),(0,f.jsx)(ve,{children:`사용자 통계`}),o&&(0,f.jsxs)(we,{value:l??`all`,onChange:e=>ue(e.target.value===`all`?null:Number(e.target.value)),children:[(0,f.jsx)(`option`,{value:`all`,children:`전체`}),a.map(e=>(0,f.jsxs)(`option`,{value:e,children:[e,`년`]},e))]})]}),o?(0,f.jsxs)(f.Fragment,{children:[(0,f.jsxs)(_,{children:[(0,f.jsxs)(v,{children:[(0,f.jsx)(y,{children:c(`jira`,20)}),(0,f.jsx)(b,{children:`Jira 이슈 통계`}),q.length>0&&(0,f.jsxs)(Se,{onClick:()=>R(!0),title:`이슈 유형 필터`,children:[(0,f.jsx)(ce,{size:16}),z.size>0&&(0,f.jsx)(Ce,{})]})]}),vt?(0,f.jsxs)(x,{children:[(0,f.jsx)(S,{children:(0,f.jsx)(u,{size:20})}),(0,f.jsx)(C,{children:`Jira 데이터를 불러오는 중...`})]}):Y.length===0?(0,f.jsxs)(w,{children:[l===null?``:`${l}년에 `,`담당된 이슈가 없습니다.`]}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsxs)(Te,{children:[(0,f.jsxs)(T,{children:[`총 `,(0,f.jsx)(`strong`,{children:X}),`건`]}),(0,f.jsxs)(Ee,{children:[(0,f.jsx)(De,{children:`완료율`}),(0,f.jsxs)(Oe,{children:[X>0?Math.round(Z/X*100):0,`%`]}),(0,f.jsxs)(ke,{children:[`(`,Z,`/`,X,`)`]})]})]}),(0,f.jsx)(Ae,{children:(0,f.jsx)(je,{$width:X>0?Math.round(Z/X*100):0})}),(0,f.jsx)(Me,{children:Ft.map(e=>(0,f.jsxs)(Ne,{children:[(0,f.jsxs)(Pe,{children:[(0,f.jsx)(Fe,{$color:e.color}),(0,f.jsx)(Ie,{children:e.category}),(0,f.jsxs)(Le,{children:[e.total,`건`]})]}),(0,f.jsx)(Re,{children:e.statuses.map(t=>(0,f.jsxs)(d.Fragment,{children:[(0,f.jsxs)(Ye,{$clickable:!0,onClick:()=>kt(t.name),children:[(0,f.jsxs)(ze,{children:[(0,f.jsx)(E,{children:P===t.name?`▼`:`▶`}),(0,f.jsx)(Be,{children:t.name}),(0,f.jsxs)(Ve,{children:[t.count,`건`]})]}),(0,f.jsx)(He,{children:(0,f.jsx)(Ue,{$color:e.color,$width:Math.round(t.count/It*100)})})]}),P===t.name&&(0,f.jsx)(Xe,{children:yt?(0,f.jsx)(Ze,{children:(0,f.jsx)(S,{children:(0,f.jsx)(u,{size:14})})}):I.length===0?(0,f.jsx)(D,{children:`이슈가 없습니다.`}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(ot,{children:(0,f.jsx)(st,{children:$.length===I.length?`${I.length}건`:`${$.length} / ${I.length}건`})}),$.length===0?(0,f.jsx)(D,{children:`선택된 유형의 이슈가 없습니다.`}):$.map(e=>{let t=ae(e.issueType),n=oe[t];return(0,f.jsxs)(Qe,{onClick:()=>At(e.key),onContextMenu:t=>jt(t,e.key,`${e.key} ${e.summary}`),children:[(0,f.jsx)($e,{$color:n,children:e.key}),(0,f.jsx)(ct,{$color:n,children:se[t]}),(0,f.jsx)(et,{children:e.summary})]},e.key)})]})})]},t.name))})]},e.category))})]})]}),(0,f.jsxs)(_,{children:[(0,f.jsxs)(v,{children:[(0,f.jsx)(y,{children:c(`confluence`,20)}),(0,f.jsx)(b,{children:`Confluence 문서 통계`})]}),Tt?(0,f.jsxs)(x,{children:[(0,f.jsx)(S,{children:(0,f.jsx)(u,{size:20})}),(0,f.jsx)(C,{children:`Confluence 데이터를 불러오는 중...`})]}):Ct===0?(0,f.jsxs)(w,{children:[l===null?``:`${l}년에 `,`작성한 문서가 없습니다.`]}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsxs)(T,{children:[`총 `,(0,f.jsx)(`strong`,{children:Ct}),`건`]}),Q.length>0&&(0,f.jsxs)(We,{children:[(0,f.jsxs)(Ge,{children:[(0,f.jsx)(`span`,{children:`스페이스`}),(0,f.jsx)(`span`,{children:`문서 수`})]}),Q.map(e=>(0,f.jsxs)(d.Fragment,{children:[(0,f.jsxs)(Ke,{$clickable:!0,onClick:()=>Dt(W===e.name?null:e.name),children:[(0,f.jsxs)(tt,{children:[(0,f.jsx)(E,{children:W===e.name?`▼`:`▶`}),(0,f.jsx)(qe,{children:e.name})]}),(0,f.jsxs)(Je,{children:[e.count,`건`]})]}),W===e.name&&(0,f.jsx)(nt,{children:(Pt.get(e.name)||[]).map(e=>(0,f.jsxs)(rt,{onClick:()=>{r(`confluence`,`/confluence/page/${e.id}`,e.title)},onContextMenu:t=>{t.preventDefault(),t.stopPropagation();let n=1.2;K({x:t.clientX/n,y:t.clientY/n,pageId:e.id,title:e.title})},children:[(0,f.jsx)(it,{children:e.title}),(0,f.jsx)(at,{children:fe(e.createdAt)})]},e.id))})]},e.name))]})]})]})]}):(0,f.jsxs)(ye,{children:[(0,f.jsx)(be,{children:`Atlassian 계정이 설정되어 있지 않습니다.`}),(0,f.jsx)(xe,{children:`계정 설정에서 Atlassian을 연결하면 Jira / Confluence 통계를 확인할 수 있습니다.`})]})]}),V&&(0,f.jsx)(O,{onClick:()=>H(null),children:(0,f.jsx)(k,{style:{left:V.x,top:V.y},onClick:e=>e.stopPropagation(),children:(0,f.jsx)(A,{onClick:Mt,children:`새 탭으로 열기`})})}),G&&(0,f.jsx)(O,{onClick:()=>K(null),children:(0,f.jsx)(k,{style:{left:G.x,top:G.y},onClick:e=>e.stopPropagation(),children:(0,f.jsx)(A,{onClick:()=>{r(`confluence`,`/confluence/page/${G.pageId}`,G.title),K(null)},children:`새 탭으로 열기`})})}),xt&&(0,f.jsx)(lt,{onClick:()=>R(!1),children:(0,f.jsxs)(ut,{onClick:e=>e.stopPropagation(),children:[(0,f.jsxs)(dt,{children:[(0,f.jsx)(ft,{children:`이슈 유형 필터`}),(0,f.jsx)(pt,{onClick:()=>R(!1),children:(0,f.jsx)(le,{size:16})})]}),(0,f.jsx)(mt,{children:q.length===0?(0,f.jsx)(ht,{children:`이슈 유형 정보가 없습니다.`}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsxs)(gt,{children:[(0,f.jsx)(j,{type:`checkbox`,checked:z.size===0,onChange:()=>B(new Set)}),(0,f.jsx)(M,{children:`전체 선택`})]}),q.map(e=>(0,f.jsxs)(_t,{children:[(0,f.jsx)(j,{type:`checkbox`,checked:z.size===0||z.has(e),onChange:()=>{if(z.size===0){let t=new Set(q);t.delete(e),B(t)}else Lt(e)}}),(0,f.jsx)(M,{children:e})]},e))]})})]})})]})},g=n`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`,me=a.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: ${l.bgSecondary};
  zoom: 1.2;
`,he=a.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
`,ge=a.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`,_e=a.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${l.border};
  border-radius: 50%;
  background: ${l.bgPrimary};
  color: ${l.textSecondary};
  cursor: pointer;
  transition: all 0.15s ${r};

  &:hover {
    border-color: ${l.blue};
    color: ${l.blue};
    background: ${l.blueLight};
  }
`,ve=a.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${l.textPrimary};
`,ye=a.div`
  padding: 3rem 2rem;
  background: ${l.bgPrimary};
  border: 1px solid ${l.border};
  border-radius: 8px;
  text-align: center;
`,be=a.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${l.textPrimary};
  margin-bottom: 0.5rem;
`,xe=a.div`
  font-size: 0.8125rem;
  color: ${l.textMuted};
`,_=a.div`
  background: ${l.bgPrimary};
  border: 1px solid ${l.border};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
`,v=a.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
`,y=a.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`,b=a.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${l.textPrimary};
  flex: 1;
`,Se=a.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${l.textMuted};
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: ${l.bgTertiary};
    color: ${l.textPrimary};
  }
`,Ce=a.span`
  position: absolute;
  top: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${l.blue};
`,we=a.select`
  padding: 0.375rem 0.625rem;
  border: 1px solid ${l.border};
  border-radius: 6px;
  background: ${l.bgPrimary};
  color: ${l.textPrimary};
  font-size: 0.8125rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${l.blue};
  }
`,x=a.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;
`,S=a.span`
  display: inline-flex;
  color: ${l.blue};
  animation: ${g} 1s linear infinite;
`,C=a.span`
  font-size: 0.8125rem;
  color: ${l.textMuted};
`,w=a.div`
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: ${l.textMuted};
`,Te=a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`,T=a.div`
  font-size: 0.875rem;
  color: ${l.textSecondary};

  strong {
    font-weight: 700;
    color: ${l.textPrimary};
  }
`,Ee=a.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`,De=a.span`
  font-size: 0.75rem;
  color: ${l.textMuted};
`,Oe=a.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: #36B37E;
`,ke=a.span`
  font-size: 0.75rem;
  color: ${l.textMuted};
`,Ae=a.div`
  width: 100%;
  height: 8px;
  background: ${l.bgTertiary};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.25rem;
`,je=a.div`
  height: 100%;
  width: ${({$width:e})=>e}%;
  background: linear-gradient(90deg, #36B37E, #57D9A3);
  border-radius: 4px;
  transition: width 0.5s ease;
`,Me=a.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,Ne=a.div``,Pe=a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid ${l.border};
`,Fe=a.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({$color:e})=>e};
  flex-shrink: 0;
`,Ie=a.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${l.textPrimary};
  flex: 1;
`,Le=a.span`
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${l.textSecondary};
`,Re=a.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1.25rem;
`,ze=a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`,Be=a.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${l.textPrimary};
  flex: 1;
`,Ve=a.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${l.textSecondary};
`,He=a.div`
  width: 100%;
  height: 6px;
  background: ${l.bgTertiary};
  border-radius: 3px;
  overflow: hidden;
`,Ue=a.div`
  height: 100%;
  width: ${({$width:e})=>e}%;
  background: ${({$color:e})=>e};
  border-radius: 3px;
  transition: width 0.4s ease;
`,We=a.div`
  border: 1px solid ${l.border};
  border-radius: 6px;
  overflow: hidden;
`,Ge=a.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: ${l.bgTertiary};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${l.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.02em;
`,Ke=a.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid ${l.border};
  transition: background 0.1s;
  cursor: ${({$clickable:e})=>e?`pointer`:`default`};
  user-select: none;

  &:hover {
    background: ${l.bgSecondary};
  }
`,qe=a.span`
  font-size: 0.8125rem;
  color: ${l.textPrimary};
`,Je=a.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${l.textSecondary};
`,Ye=a.div`
  cursor: ${({$clickable:e})=>e?`pointer`:`default`};
  border-radius: 4px;
  padding: 0.25rem 0.375rem;
  margin: -0.25rem -0.375rem;
  transition: background 0.1s;

  ${({$clickable:e})=>e&&`
    &:hover { background: ${l.bgTertiary}; }
  `}
`,E=a.span`
  font-size: 0.625rem;
  color: ${l.textMuted};
  width: 0.75rem;
  flex-shrink: 0;
`,Xe=a.div`
  margin: 0.25rem 0 0.5rem 0.75rem;
  border: 1px solid ${l.border};
  border-radius: 6px;
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
`,Ze=a.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.8125rem;
  color: ${l.textMuted};
`,D=a.div`
  padding: 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${l.textMuted};
`,Qe=a.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid ${l.border};

  &:last-child { border-bottom: none; }
  &:hover { background: ${l.bgSecondary}; }
`,$e=a.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({$color:e})=>e||l.blue};
  white-space: nowrap;
  flex-shrink: 0;
`,et=a.span`
  font-size: 0.8125rem;
  color: ${l.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`,O=a.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`,k=a.div`
  position: fixed;
  background: ${l.bgPrimary};
  border: 1px solid ${l.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 140px;
  padding: 0.25rem;
  z-index: 501;
`,A=a.div`
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: ${l.textPrimary};
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${l.blueLight};
    color: ${l.blue};
  }
`,tt=a.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`,nt=a.div`
  border-top: 1px solid ${l.border};
  background: ${l.bgSecondary};
`,rt=a.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid ${l.border};

  &:last-child { border-bottom: none; }
  &:hover { background: ${l.bgTertiary}; }
`,it=a.span`
  font-size: 0.8125rem;
  color: ${l.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`,at=a.span`
  font-size: 0.75rem;
  color: ${l.textMuted};
  white-space: nowrap;
  flex-shrink: 0;
`,ot=a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.75rem;
  background: ${l.bgTertiary};
  border-bottom: 1px solid ${l.border};
`,st=a.span`
  font-size: 0.75rem;
  color: ${l.textMuted};
  font-weight: 500;
`,ct=a.span`
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${({$color:e})=>e};
  white-space: nowrap;
  flex-shrink: 0;
`,lt=a.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
`,ut=a.div`
  background: ${l.bgPrimary};
  border: 1px solid ${l.border};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
`,dt=a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid ${l.border};
`,ft=a.h3`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${l.textPrimary};
`,pt=a.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${l.textMuted};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${l.bgTertiary};
    color: ${l.textPrimary};
  }
`,mt=a.div`
  padding: 0.75rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`,ht=a.div`
  padding: 1rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: ${l.textMuted};
`,gt=a.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.375rem;
  border-bottom: 1px solid ${l.border};
  margin-bottom: 0.25rem;
  cursor: pointer;
`,_t=a.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.375rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${l.bgSecondary};
  }
`,j=a.input`
  width: 1rem;
  height: 1rem;
  accent-color: ${l.blue};
  cursor: pointer;
  flex-shrink: 0;
`,M=a.span`
  font-size: 0.8125rem;
  color: ${l.textPrimary};
`;export{h as default};