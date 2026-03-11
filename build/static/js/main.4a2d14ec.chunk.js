(this.webpackJsonplyra=this.webpackJsonplyra||[]).push([[0],{40:function(e,t,r){"use strict";r.r(t);var n=r(2),i=r.n(n),a=r(15),o=r.n(a),s=r(4),c=r(1),l=r(7);const d="#ffffff",u="#f8fafc",p="#f1f5f9",m="#e0f2fe",h="#bae6fd",b="#0ea5e9",f="#0284c7",j="#0369a1",g="#0f172a",x="#475569",y="#94a3b8",v="#e2e8f0",O="#0ea5e9",k="#ef4444",$=()=>"\n\t-webkit-touch-callout: none;\n\t-webkit-user-select: none;\n\t-khtml-user-select: none;\n\t-moz-user-select: none;\n\t-ms-user-select: none;\n\tuser-select: none;\n",w=()=>"\n\tcubic-bezier(0.25, 0.1, 0.25, 1);\n";const C={jira:function(e){return i.a.createElement("svg",{width:e,height:e,viewBox:"0 0 256 256",fill:"none"},i.a.createElement("defs",null,i.a.createElement("linearGradient",{id:"jira-g1",x1:"98.03%",y1:"0.22%",x2:"58.17%",y2:"40.18%"},i.a.createElement("stop",{offset:"0.18",stopColor:"#0052CC",stopOpacity:0}),i.a.createElement("stop",{offset:"1",stopColor:"#0052CC"})),i.a.createElement("linearGradient",{id:"jira-g2",x1:"100.17%",y1:"0.08%",x2:"55.76%",y2:"44.42%"},i.a.createElement("stop",{offset:"0.18",stopColor:"#0052CC",stopOpacity:0}),i.a.createElement("stop",{offset:"1",stopColor:"#0052CC"}))),i.a.createElement("path",{d:"M244.658 0H121.707a55.502 55.502 0 0 0 55.502 55.502h22.642V77.37c.02 30.625 24.84 55.447 55.462 55.502V10.666C255.313 4.777 250.536 0 244.658 0Z",fill:"#2684FF"}),i.a.createElement("path",{d:"M183.822 61.262H60.872c.019 30.625 24.84 55.447 55.462 55.502h22.642v21.868c.02 30.597 24.797 55.408 55.393 55.497V71.928c0-5.891-4.776-10.666-10.547-10.666Z",fill:"#2684FF"}),i.a.createElement("path",{d:"M183.822 61.262H60.872c.019 30.625 24.84 55.447 55.462 55.502h22.642v21.868c.02 30.597 24.797 55.408 55.393 55.497V71.928c0-5.891-4.776-10.666-10.547-10.666Z",fill:"url(#jira-g1)"}),i.a.createElement("path",{d:"M122.943 122.528H0c.02 30.625 24.84 55.447 55.462 55.502h22.686v21.868c.02 30.597 24.797 55.408 55.393 55.497V133.193c0-5.891-4.776-10.665-10.598-10.665Z",fill:"#2684FF"}),i.a.createElement("path",{d:"M122.943 122.528H0c.02 30.625 24.84 55.447 55.462 55.502h22.686v21.868c.02 30.597 24.797 55.408 55.393 55.497V133.193c0-5.891-4.776-10.665-10.598-10.665Z",fill:"url(#jira-g2)"}))}};function S(e){const t=C[e];return t?t(arguments.length>1&&void 0!==arguments[1]?arguments[1]:20):null}function z(e){return e in C}var A=r(0);const I=Object(n.createContext)({isSplit:!1,leftPanel:null,rightPanel:null,openSplit:()=>{},closeSplit:()=>{}}),E=()=>Object(n.useContext)(I),N=e=>{let{children:t}=e;const[r,i]=Object(n.useState)(!1),[a,o]=Object(n.useState)(null),[s,c]=Object(n.useState)(null),l=Object(n.useCallback)((e,t)=>{o(e),c(t),i(!0)},[]),d=Object(n.useCallback)(()=>{i(!1),o(null),c(null)},[]);return Object(A.jsx)(I.Provider,{value:{isSplit:r,leftPanel:a,rightPanel:s,openSplit:l,closeSplit:d},children:t})},T=()=>window.workspaceAPI;T()||console.warn("workspaceAPI is not available (running in browser without Electron)");const F=()=>{var e,t;return null!==(e=null===(t=T())||void 0===t?void 0:t.account.getAll())&&void 0!==e?e:Promise.resolve([])},R=e=>{var t,r;return null!==(t=null===(r=T())||void 0===r?void 0:r.account.add(e))&&void 0!==t?t:Promise.reject(new Error("workspaceAPI not available"))},P=(e,t)=>{var r,n;return null!==(r=null===(n=T())||void 0===n?void 0:n.account.update(e,t))&&void 0!==r?r:Promise.reject(new Error("workspaceAPI not available"))},L=e=>{var t,r;return null!==(t=null===(r=T())||void 0===r?void 0:r.account.remove(e))&&void 0!==t?t:Promise.resolve(!1)},D=e=>{var t,r;return null!==(t=null===(r=T())||void 0===r?void 0:r.account.setActive(e))&&void 0!==t?t:Promise.resolve()},K=()=>{var e,t;return null!==(e=null===(t=T())||void 0===t?void 0:t.account.getActive())&&void 0!==e?e:Promise.resolve(null)},_=()=>{var e,t;return null!==(e=null===(t=T())||void 0===t?void 0:t.integration.getAvailable())&&void 0!==e?e:Promise.resolve([])},B=(e,t)=>{var r,n;return null!==(r=null===(n=T())||void 0===n?void 0:n.integration.validate({serviceType:e,credentials:t}))&&void 0!==r?r:Promise.resolve(!1)},M=e=>{var t,r;return null!==(t=null===(r=T())||void 0===r?void 0:r.integration.invoke(e))&&void 0!==t?t:Promise.reject(new Error("workspaceAPI not available"))},U=Object(n.createContext)({accounts:[],activeAccount:null,isLoading:!0,refresh:async()=>{},setActive:async()=>{}}),H=()=>Object(n.useContext)(U);var q=e=>{let{children:t}=e;const[r,i]=Object(n.useState)([]),[a,o]=Object(n.useState)(null),[s,c]=Object(n.useState)(!0),l=Object(n.useCallback)(async()=>{try{const[e,t]=await Promise.all([F(),K()]);i(null!==e&&void 0!==e?e:[]),o(null!==t&&void 0!==t?t:null)}catch(e){console.error("Failed to load accounts",e),i([]),o(null)}finally{c(!1)}},[]),d=Object(n.useCallback)(async e=>{await D(e),await l()},[l]);return Object(n.useEffect)(()=>{l()},[l]),Object(A.jsx)(U.Provider,{value:{accounts:r,activeAccount:a,isLoading:s,refresh:l,setActive:d},children:t})};const Y=[{id:"jira",path:"/jira",label:"Jira",icon:"jira"}];var W=()=>{var e;const t=Object(s.i)(),r=Object(s.h)(),{isSplit:a,leftPanel:o,rightPanel:c,openSplit:l,closeSplit:d}=E(),{accounts:u,activeAccount:p,setActive:m}=H(),[h,b]=Object(n.useState)(!1),f=Object(n.useRef)(null),[j,g]=Object(n.useState)(null),x=Object(n.useRef)(null),y=(null===(e=Y.find(e=>t.pathname.startsWith(e.path)))||void 0===e?void 0:e.id)||"",v=()=>{d(),g(null)};return Object(n.useEffect)(()=>{const e=e=>{f.current&&!f.current.contains(e.target)&&b(!1),g(null)};return document.addEventListener("click",e),()=>document.removeEventListener("click",e)},[]),Object(A.jsxs)(A.Fragment,{children:[Object(A.jsxs)(J,{children:[Object(A.jsxs)(V,{children:[Object(A.jsx)(Z,{to:"/jira",onClick:e=>{a&&(e.preventDefault(),b(!1),a&&d(),r.push("/jira"))},children:"Lyra"}),Object(A.jsx)(G,{}),Y.map(e=>{const n=a?e.id===o||e.id===c:t.pathname.startsWith(e.path);return Object(A.jsxs)(Q,{to:a?"#":e.path,$active:n,onClick:t=>{a&&(t.preventDefault(),d(),r.push(e.path))},onContextMenu:t=>((e,t)=>{(t!==y||a)&&"settings"!==t&&(e.preventDefault(),g({x:e.clientX,y:e.clientY,menuId:t}))})(t,e.id),children:[e.icon&&z(e.icon)&&Object(A.jsx)(ee,{children:S(e.icon,16)}),e.label]},e.id)}),a&&Object(A.jsxs)(te,{onClick:v,children:["Split View",Object(A.jsx)(re,{children:"\xd7"})]})]}),Object(A.jsxs)(X,{ref:f,children:[Object(A.jsx)(ne,{onClick:()=>b(e=>!e),$active:h||"/settings"===t.pathname,children:Object(A.jsxs)(ie,{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:[Object(A.jsx)("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),Object(A.jsx)("circle",{cx:"12",cy:"7",r:"4"})]})}),h&&Object(A.jsxs)(ae,{$hasAccounts:u.length>0,children:[u.length>0&&Object(A.jsxs)(oe,{children:[Object(A.jsx)(ce,{children:"\uacc4\uc815"}),Array.from(new Set(u.map(e=>e.serviceType))).map(e=>{const t=u.filter(t=>t.serviceType===e);return Object(A.jsxs)(i.a.Fragment,{children:[Object(A.jsxs)(le,{children:[z(e)&&Object(A.jsx)(de,{children:S(e,13)}),e.charAt(0).toUpperCase()+e.slice(1)]}),t.map(e=>{const t=(null===p||void 0===p?void 0:p.id)===e.id;return Object(A.jsxs)(ue,{$active:t,onClick:()=>{t||m(e.id),b(!1)},children:[Object(A.jsxs)(pe,{children:[Object(A.jsx)(me,{children:e.displayName}),"baseUrl"in e.credentials&&Object(A.jsx)(he,{children:e.credentials.baseUrl})]}),t&&Object(A.jsx)(be,{children:Object(A.jsx)(fe,{viewBox:"0 0 12 12",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:Object(A.jsx)("polyline",{points:"2,6 5,9 10,3"})})})]},e.id)})]},e)})]}),Object(A.jsxs)(se,{children:[Object(A.jsx)(ce,{children:"\uba54\ub274"}),Object(A.jsxs)(je,{onClick:()=>{b(!1),a&&d(),r.push("/settings")},children:[Object(A.jsxs)(ge,{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:[Object(A.jsx)("circle",{cx:"12",cy:"12",r:"3"}),Object(A.jsx)("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"})]}),"\uacc4\uc815 \uc124\uc815"]})]})]})]})]}),j&&Object(A.jsx)(xe,{onClick:()=>g(null),children:Object(A.jsxs)(ye,{ref:x,style:{left:j.x,top:j.y},onClick:e=>e.stopPropagation(),children:[Object(A.jsx)(ve,{onClick:()=>{if(!j)return;l(a&&o||y,j.menuId),g(null)},children:"Split View\ub85c \uc5f4\uae30"}),a&&Object(A.jsx)(ve,{onClick:v,children:"Split View \ub2eb\uae30"})]})})]})};const J=c.a.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 3rem;
  background: ${d};
  border-bottom: 1px solid ${v};
  zoom: 1.2;
`,V=c.a.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
`,X=c.a.div`
  position: relative;
  display: flex;
  align-items: center;
`,Z=Object(c.a)(l.b)`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${b};
  text-decoration: none;
  letter-spacing: -0.01em;
`,G=c.a.div`
  width: 1px;
  height: 1.125rem;
  background: ${v};
`,Q=Object(c.a)(l.b)`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: ${e=>{let{$active:t}=e;return t?b:x}};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s ${w};

  &:hover {
    color: ${b};
  }
`,ee=c.a.span`
  display: inline-flex;
  align-items: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`,te=c.a.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: ${m};
  border: 1px solid ${h};
  border-radius: 20px;
  color: ${j};
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ${w};

  &:hover {
    background: ${h};
  }
`,re=c.a.span`
  font-size: 0.875rem;
  line-height: 1;
`,ne=c.a.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1.5px solid ${e=>{let{$active:t}=e;return t?b:v}};
  background: ${e=>{let{$active:t}=e;return t?m:u}};
  color: ${e=>{let{$active:t}=e;return t?b:x}};
  cursor: pointer;
  transition: all 0.15s ${w};

  &:hover {
    border-color: ${b};
    color: ${b};
    background: ${m};
  }
`,ie=c.a.svg`
  width: 1.125rem;
  height: 1.125rem;
`,ae=c.a.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  display: flex;
  background: ${d};
  border: 1px solid ${v};
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 200;
  overflow: hidden;
`,oe=c.a.div`
  width: 220px;
  padding: 0.5rem 0;
  border-right: 1px solid ${v};
  max-height: 320px;
  overflow-y: auto;
`,se=c.a.div`
  width: 160px;
  padding: 0.5rem 0;
`,ce=c.a.div`
  padding: 0.25rem 0.875rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${y};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`,le=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem 0.125rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: ${y};
`,de=c.a.span`
  display: inline-flex;
  align-items: center;
  width: 0.8125rem;
  height: 0.8125rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`,ue=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${e=>{let{$active:t}=e;return t?m:"transparent"}};

  &:hover {
    background: ${e=>{let{$active:t}=e;return t?m:p}};
  }
`,pe=c.a.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`,me=c.a.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${g};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,he=c.a.span`
  font-size: 0.6875rem;
  color: ${y};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,be=c.a.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  color: ${b};
`,fe=c.a.svg`
  width: 0.75rem;
  height: 0.75rem;
`,je=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.875rem;
  font-size: 0.8125rem;
  color: ${g};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${p};
  }
`,ge=c.a.svg`
  width: 0.9375rem;
  height: 0.9375rem;
  flex-shrink: 0;
`,xe=c.a.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`,ye=c.a.div`
  position: fixed;
  background: ${d};
  border: 1px solid ${v};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.25rem 0;
  z-index: 501;
`,ve=c.a.div`
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: ${g};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${p};
  }
`;var Oe=r(11);const ke="#0052CC",$e="#0747A6",we="#DEEBFF",Ce={todo:"#42526E",inProgress:"#0052CC",done:"#36B37E",default:"#6B778C"},Se={task:"#4BADE8",bug:"#E5493A",story:"#36B37E",epic:"#6554C0",default:"#6B778C"},ze={highest:"#E5493A",high:"#FF5630",medium:"#FFAB00",low:"#36B37E",lowest:"#0065FF",default:"#6B778C"},Ae={default:"#FFFFFF",subtle:"#F4F5F7",hover:"#EBECF0"},Ie="#DFE1E6",Ee={primary:"#172B4D",secondary:"#5E6C84",muted:"#97A0AF"};function Ne(e){var t,r;if(!e)return"";if(e.text)return e.text;const n=e.content,i=function(e){var t;let r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return null!==(t=null===e||void 0===e?void 0:e.map(Ne).join(r))&&void 0!==t?t:""};switch(e.type){case"paragraph":case"heading":case"listItem":case"codeBlock":return i(n)+"\n";case"bulletList":case"orderedList":return null!==(t=null===n||void 0===n?void 0:n.map(e=>"\u2022 "+Ne(e)).join("\n"))&&void 0!==t?t:"";case"blockquote":return"> "+i(n)+"\n";case"rule":return"---\n";case"table":return null!==(r=null===n||void 0===n?void 0:n.map(e=>{var t,r;return null!==(t=null===(r=e.content)||void 0===r?void 0:r.map(e=>Ne(e)).join("\t"))&&void 0!==t?t:""}).join("\n"))&&void 0!==r?r:"";default:return i(n)}}function Te(e){if(!e)return"";if("string"===typeof e)return e;const t=e;return"doc"===t.type&&Array.isArray(t.content)?t.content.map(Ne).join("").trim():Ne(t).trim()}function Fe(e){return"string"===typeof e?e:""}function Re(e){return e&&"object"===typeof e&&!Array.isArray(e)?e:null}function Pe(e){return e.toLowerCase().includes("epic")||"\uc5d0\ud53d"===e}function Le(e){const t=e.toLowerCase();return t.includes("sub-task")||t.includes("subtask")||"\ud558\uc704 \uc791\uc5c5"===t}function De(e,t){const r=(e+" "+t).toLowerCase();return r.includes("done")||r.includes("\uc644\ub8cc")?Ce.done:r.includes("progress")||r.includes("\uc9c4\ud589")?Ce.inProgress:Ce.default}function Ke(e){if(!e)return ze.default;const t=e.toLowerCase();return t.includes("highest")||t.includes("critical")||t.includes("\uae34\uae09")?ze.highest:t.includes("high")||t.includes("\ub192\uc74c")?ze.high:t.includes("medium")||t.includes("\ubcf4\ud1b5")?ze.medium:t.includes("low")||t.includes("\ub0ae\uc74c")?ze.low:ze.default}function _e(e){if(!e)return"-";try{return new Date(e).toLocaleString("ko-KR")}catch{return e}}function Be(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}const Me=/^[A-Z][A-Z0-9]+-\d+$/i;function Ue(e){let{accountId:t,serviceType:r,onTransitioned:i}=e;const[a,o]=Object(n.useState)(null),[s,c]=Object(n.useState)([]),[l,d]=Object(n.useState)(!1),u=Object(n.useRef)(null),p=Object(n.useCallback)(async(e,n,i)=>{if(!t)return;if((null===a||void 0===a?void 0:a.issueKey)===e)return void o(null);const s=i.currentTarget.getBoundingClientRect();o({issueKey:e,top:s.bottom+4,left:s.left+s.width/2}),c([]),d(!0);try{var l;const i=await M({accountId:t,serviceType:r,action:"getTransitions",params:{issueKey:e}}),a=null!==(l=i.transitions)&&void 0!==l?l:[],o=(Array.isArray(a)?a:[]).filter(e=>{var t;return(null===(t=e.to)||void 0===t?void 0:t.name)!==n}).filter((e,t,r)=>r.findIndex(t=>{var r,n;return(null===(r=t.to)||void 0===r?void 0:r.name)===(null===(n=e.to)||void 0===n?void 0:n.name)})===t);c(o)}catch(u){console.error("[useTransitionDropdown] getTransitions error:",u),c([])}finally{d(!1)}},[t,r,a]),m=Object(n.useCallback)(async(e,n,a,s)=>{if(t)try{await M({accountId:t,serviceType:r,action:"transitionIssue",params:{issueKey:e,transitionId:n}}),null===i||void 0===i||i(e,a,s)}catch(c){console.error("[useTransitionDropdown] transitionIssue error:",c)}finally{o(null)}},[t,r,i]),h=Object(n.useCallback)(()=>o(null),[]);return Object(n.useEffect)(()=>{if(!a)return;const e=e=>{u.current&&!u.current.contains(e.target)&&o(null)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[a]),{target:a,transitions:s,isLoading:l,dropdownRef:u,open:p,execute:m,close:h}}var He=e=>{let{target:t,transitions:r,isLoading:n,dropdownRef:i,onSelect:a,onClose:s}=e;return o.a.createPortal(Object(A.jsx)(qe,{onClick:s,children:Object(A.jsx)(Ye,{ref:i,style:{top:t.top,left:t.left},onClick:e=>e.stopPropagation(),children:n?Object(A.jsx)(Ve,{children:"\ub85c\ub529 \uc911..."}):0===r.length?Object(A.jsx)(Ve,{children:"\uc804\ud658 \uac00\ub2a5\ud55c \uc0c1\ud0dc\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."}):r.map(e=>{var r,n,i,o;const s=(null===(r=e.to)||void 0===r||null===(n=r.statusCategory)||void 0===n?void 0:n.name)||"",c=De((null===(i=e.to)||void 0===i?void 0:i.name)||e.name,s);return Object(A.jsxs)(We,{onClick:()=>{var r;return a(t.issueKey,e.id,(null===(r=e.to)||void 0===r?void 0:r.name)||e.name,s)},children:[Object(A.jsx)(Je,{$color:c}),(null===(o=e.to)||void 0===o?void 0:o.name)||e.name]},e.id)})})}),document.body)};const qe=c.a.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
`,Ye=c.a.div`
  position: fixed;
  transform: translateX(-50%);
  background: ${Ae.default};
  border: 1px solid ${Ie};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 160px;
  max-height: 240px;
  overflow-y: auto;
`,We=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: ${Ee.primary};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;

  &:hover { background: ${Ae.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${Ie}; }
`,Je=c.a.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${e=>{let{$color:t}=e;return t||Ce.default}};
  flex-shrink: 0;
`,Ve=c.a.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: ${Ee.muted};
`;var Xe=r(41),Ze=r(42),Ge=r(43),Qe=r(44);const et={epic:{Icon:Xe.a,bgColor:Se.epic,label:"\uc5d0\ud53d"},story:{Icon:Ze.a,bgColor:Se.story,label:"\uc2a4\ud1a0\ub9ac"},bug:{Icon:Ge.a,bgColor:Se.bug,label:"\ubc84\uadf8"},task:{Icon:Qe.a,bgColor:Se.task,label:"\ud560 \uc77c"}};var tt=e=>{let{type:t,size:r=24}=e;const n=et[t],i=n.Icon;return Object(A.jsx)(nt,{$bgColor:n.bgColor,$size:r,children:Object(A.jsx)(i,{size:Math.round(.6*r),color:"#FFFFFF"})})};const rt=e=>{if(!e)return"task";const t=e.toLowerCase();return t.includes("bug")||t.includes("\ubc84\uadf8")?"bug":t.includes("story")||t.includes("\uc2a4\ud1a0\ub9ac")?"story":t.includes("epic")||t.includes("\uc5d0\ud53d")?"epic":"task"},nt=c.a.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${e=>{let{$size:t}=e;return t}}px;
  height: ${e=>{let{$size:t}=e;return t}}px;
  border-radius: 3px;
  background: ${e=>{let{$bgColor:t}=e;return t}};
  flex-shrink: 0;
`;function it(e){const t=Fe(e.key)||Fe(e.issueKey)||"",r=Fe(e.id)||"",n=e.fields&&"object"===typeof e.fields?e.fields:e;let i="";const a=n.summary;"string"===typeof a?i=a:a&&"object"===typeof a&&(i=Te(a).trim());const o=Re(n.status),s=Fe(null===o||void 0===o?void 0:o.name)||"",c=Re(null===o||void 0===o?void 0:o.statusCategory),l=Fe(null===o||void 0===o?void 0:o.category)||Fe(null===c||void 0===c?void 0:c.name)||Fe(null===c||void 0===c?void 0:c.key)||"",d=Re(n.assignee),u=Fe(null===d||void 0===d?void 0:d.displayName)||Fe(null===d||void 0===d?void 0:d.display_name)||Fe(null===d||void 0===d?void 0:d.name)||"",p=Re(n.issuetype)||Re(n.issue_type)||Re(n.issueType),m=Fe(null===p||void 0===p?void 0:p.name)||"",h=Re(n.priority),b=Fe(null===h||void 0===h?void 0:h.name)||"",f=Fe(n.created)||"",j=Fe(n.updated)||"",g=Fe(n.duedate)||Fe(n.dueDate)||Fe(n.due_date)||"",x=Re(n.parent),y=Fe(null===x||void 0===x?void 0:x.key)||"";let v=Fe(null===x||void 0===x?void 0:x.summary)||"";if(!v&&x){const e=Re(x.fields);if(e){const t=e.summary;v="string"===typeof t?t:""}}return{id:r,key:t,summary:i,statusName:s,statusCategory:l,assigneeName:u,issueTypeName:m,priorityName:b,created:f,updated:j,duedate:g,parentKey:y,parentSummary:v}}function at(e){var t,r;if(!e||"object"!==typeof e)return[];const n=e,i=null!==(t=null!==(r=n.issues)&&void 0!==r?r:n.values)&&void 0!==t?t:[];return Array.isArray(i)?i.filter(e=>e&&"object"===typeof e).map(it).filter(e=>e.key||e.id):[]}function ot(e){return 0===e.length?"":1===e.length?`project = "${e[0]}"`:`project IN (${e.map(e=>`"${e}"`).join(",")})`}const st={myIssues:[],projects:[],selectedProjects:[],searchQuery:"",searchResults:null,expandedEpics:new Set,accountId:""};var ct=()=>{const{activeAccount:e}=H(),t=Object(s.h)(),r=(null===e||void 0===e?void 0:e.id)||"",a=st.accountId===r&&""!==r,[o,c]=Object(n.useState)(a?st.myIssues:[]),[l,d]=Object(n.useState)(!1),[u,p]=Object(n.useState)(a?st.projects:[]),[m,h]=Object(n.useState)(a?st.selectedProjects:[]),[b,f]=Object(n.useState)(!1),[j,g]=Object(n.useState)(""),[x,y]=Object(n.useState)(a?st.searchQuery:""),[v,O]=Object(n.useState)(a?st.searchResults:null),[k,$]=Object(n.useState)(!1),[w,C]=Object(n.useState)([]),[I,E]=Object(n.useState)(!1),[N,T]=Object(n.useState)(!1),[F,R]=Object(n.useState)(-1),P=Object(n.useRef)(null),L=Object(n.useRef)(null),[D,K]=Object(n.useState)(a?st.expandedEpics:new Set),_=Object(n.useCallback)((e,t,r)=>{const n=n=>n.map(n=>n.key===e?{...n,statusName:t,statusCategory:r}:n);c(e=>n(e)),O(e=>e?n(e):e)},[]),{target:B,transitions:U,isLoading:q,dropdownRef:Y,open:W,execute:J,close:V}=Ue({accountId:null===e||void 0===e?void 0:e.id,serviceType:"jira",onTransitioned:_}),X=Object(n.useRef)(r);Object(n.useEffect)(()=>{if(X.current===r)return;if(X.current=r,c([]),p([]),h([]),y(""),O(null),C([]),E(!1),K(new Set),!r)return;const e=[];e.length>0&&h(e),async function(e){try{var t;if(null!==(t=window.workspaceAPI)&&void 0!==t&&t.settings)return await window.workspaceAPI.settings.getSelectedProjects(e);const r=localStorage.getItem(`lyra:jira:selectedProjects:${e}`);if(r){const e=JSON.parse(r);if(Array.isArray(e))return e}}catch{}return[]}(r).then(e=>{e.length>0&&h(e)})},[r]),Object(n.useEffect)(()=>{st.accountId=r,st.myIssues=o,st.projects=u,st.selectedProjects=m,st.searchQuery=x,st.searchResults=v,st.expandedEpics=D},[r,o,u,m,x,v,D]);const Z=Object(n.useCallback)(async()=>{if(e)try{const t=await M({accountId:e.id,serviceType:"jira",action:"getProjects"});if(Array.isArray(t)){const e=t.filter(e=>e&&e.key).map(e=>({key:String(e.key),name:String(e.name||e.key)})).sort((e,t)=>e.name.localeCompare(t.name));p(e)}}catch{p([])}},[e]),G=Object(n.useCallback)(async()=>{if(e){d(!0);try{const t=ot(m),r=t?`${t} AND `:"",n=at(await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:`${r}assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`,maxResults:100}})),i=new Set(n.map(e=>e.key)),a=new Set;for(const e of n)e.parentKey&&!i.has(e.parentKey)&&a.add(e.parentKey);if(a.size>0)try{const t=`key IN (${Array.from(a).join(",")})`,r=at(await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:t,maxResults:a.size}}));for(const e of r)i.has(e.key)||(n.push(e),i.add(e.key))}catch{}const o=new Set;for(const e of n)e.parentKey&&!i.has(e.parentKey)&&o.add(e.parentKey);if(o.size>0)try{const t=`key IN (${Array.from(o).join(",")})`,r=at(await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:t,maxResults:o.size}}));for(const e of r)i.has(e.key)||(n.push(e),i.add(e.key))}catch{}c(n)}catch(t){console.error("[JiraDashboard] fetchMyIssues error:",t),c([])}finally{d(!1)}}},[e,m]),Q=Object(n.useCallback)(async t=>{if(0===t.size||!e)return[];try{const r=`key IN (${Array.from(t).join(",")})`;return at(await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:r,maxResults:t.size,skipCache:!0}}))}catch{return[]}},[e]),ee=Object(n.useCallback)(async t=>{if(0===t.length||!e)return[];const r=[],n=new Set;try{const i=`parent IN (${t.join(",")}) ORDER BY created ASC`,a=await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:i,maxResults:200,skipCache:!0}});for(const e of at(a))n.has(e.key)||(r.push(e),n.add(e.key))}catch{}try{const i=`"Epic Link" IN (${t.join(",")}) ORDER BY created ASC`,a=await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:i,maxResults:200,skipCache:!0}});for(const e of at(a))n.has(e.key)||(e.parentKey||1!==t.length||(e.parentKey=t[0]),r.push(e),n.add(e.key))}catch{}return r},[e]),te=Object(n.useCallback)(async()=>{if(!e)return;const t=function(e,t){const r=[],n=ot(t);n&&r.push(n);const i=e.trim();if(!i)return r.join(" AND ");if(Me.test(i))return r.push(`key = "${Be(i)}"`),r.join(" AND ");const a=i.split(/\s+/).filter(Boolean).map(e=>{const t=Be(e);return`(summary ~ "${t}" OR description ~ "${t}" OR comment ~ "${t}")`});return r.push(1===a.length?a[0]:a.join(" AND ")),r.join(" AND ")}(x,m);if(t){$(!0);try{const r=at(await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:`${t} ORDER BY updated DESC`,maxResults:100,skipCache:!0}})),n=new Set(r.map(e=>e.key)),i=new Set;for(const e of r)e.parentKey&&!n.has(e.parentKey)&&i.add(e.parentKey);const a=await Q(i);for(const e of a)n.has(e.key)||(r.push(e),n.add(e.key));const o=new Set;for(const e of a)e.parentKey&&!n.has(e.parentKey)&&o.add(e.parentKey);const s=await Q(o);for(const e of s)n.has(e.key)||(r.push(e),n.add(e.key));const c=r.filter(e=>Pe(e.issueTypeName)).map(e=>e.key),l=await ee(c);for(const e of l)if(n.has(e.key)){if(e.parentKey){const t=r.findIndex(t=>t.key===e.key);t>=0&&!r[t].parentKey&&(r[t]={...r[t],parentKey:e.parentKey,parentSummary:e.parentSummary||r[t].parentSummary})}}else r.push(e),n.add(e.key);const d=r.filter(e=>!Pe(e.issueTypeName)&&!Le(e.issueTypeName)).filter(e=>0===c.length||e.parentKey).map(e=>e.key),u=await ee(d);for(const e of u)if(n.has(e.key)){if(e.parentKey){const t=r.findIndex(t=>t.key===e.key);t>=0&&!r[t].parentKey&&(r[t]={...r[t],parentKey:e.parentKey,parentSummary:e.parentSummary||r[t].parentSummary})}}else r.push(e),n.add(e.key);O(r),K(new Set(r.filter(e=>Pe(e.issueTypeName)).map(e=>e.key).concat("__no_epic__")))}catch(r){console.error("[JiraDashboard] searchIssues error:",r),O([])}finally{$(!1)}}else O(null)},[e,x,m,Q,ee]),re=Object(n.useCallback)(async t=>{if(!e||!t.trim())return C([]),void E(!1);T(!0);try{const r=[],n=ot(m);n&&r.push(n);const i=t.trim();if(Me.test(i))r.push(`key = "${Be(i)}"`);else{const e=i.split(/\s+/).filter(Boolean).map(e=>`summary ~ "${Be(e)}"`);r.push(1===e.length?e[0]:e.join(" AND "))}const a=at(await M({accountId:e.id,serviceType:"jira",action:"searchIssues",params:{jql:`${r.join(" AND ")} ORDER BY updated DESC`,maxResults:8,skipCache:!0}}));C(a),E(a.length>0),R(-1)}catch{C([]),E(!1)}finally{T(!1)}},[e,m]),ne=Object(n.useCallback)(e=>{if(y(e),P.current&&clearTimeout(P.current),!e.trim())return C([]),void E(!1);P.current=setTimeout(()=>{re(e)},300)},[re]);Object(n.useEffect)(()=>{const e=e=>{L.current&&!L.current.contains(e.target)&&E(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[]),Object(n.useEffect)(()=>()=>{P.current&&clearTimeout(P.current)},[]);const ie=i.a.useRef(a&&st.myIssues.length>0);Object(n.useEffect)(()=>{if(!e)return p([]),void c([]);ie.current?ie.current=!1:(Z(),G())},[e,Z,G]);const ae=e=>{e&&t.push(`/jira/issue/${e}`)},oe=i.a.useMemo(()=>{const e=j.trim().toLowerCase();return e?u.filter(t=>t.name.toLowerCase().includes(e)||t.key.toLowerCase().includes(e)):u},[u,j]);if(!e||"jira"!==e.serviceType)return Object(A.jsx)(lt,{children:Object(A.jsx)(zt,{children:Object(A.jsx)(Lt,{children:"Jira \uacc4\uc815\uc744 \ucd94\uac00\ud558\uace0 \ud65c\uc131\ud654\ud574\uc8fc\uc138\uc694. \uacc4\uc815 \uc124\uc815\uc5d0\uc11c Jira\ub97c \uc5f0\uacb0\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4."})})});const se=null!==v,ce=function(e){const t=new Map,r="__no_epic__",n=new Map;for(const a of e)a.key&&n.set(a.key,a.issueTypeName);for(const a of e){if(Pe(a.issueTypeName)){if(t.has(a.key)){const e=t.get(a.key);e.summary=a.summary,e.issueTypeName=a.issueTypeName}else t.set(a.key,{key:a.key,summary:a.summary,issueTypeName:a.issueTypeName,children:[]});continue}const e=a.parentKey||r;if(!t.has(e)){const i=n.get(e)||"";t.set(e,{key:e,summary:a.parentSummary||(e===r?"\uae30\ud0c0":e),issueTypeName:i,children:[]})}t.get(e).children.push(a)}const i=Array.from(t.values()).filter(e=>e.children.length>0);return i.sort((e,t)=>e.key===r?1:t.key===r?-1:0),i}(se?v:o);return Object(A.jsxs)(lt,{children:[Object(A.jsxs)(dt,{children:[Object(A.jsxs)(ut,{children:[z("jira")&&Object(A.jsx)(pt,{children:S("jira",24)}),"Jira"]}),Object(A.jsxs)(mt,{ref:L,children:[Object(A.jsxs)(ht,{onClick:()=>{g(""),f(!0)},children:["\uc2a4\ud398\uc774\uc2a4",m.length>0&&Object(A.jsx)(bt,{children:m.length})]}),Object(A.jsxs)(ft,{children:[Object(A.jsx)(jt,{placeholder:"\ud2f0\ucf13 \ubc88\ud638, \uc81c\ubaa9, \ub0b4\uc6a9 \uac80\uc0c9...",value:x,onChange:e=>ne(e.target.value),onKeyDown:e=>{"Enter"===e.key?I&&F>=0&&w[F]?(ae(w[F].key),E(!1)):(E(!1),te()):"ArrowDown"===e.key?(e.preventDefault(),R(e=>Math.min(e+1,w.length-1))):"ArrowUp"===e.key?(e.preventDefault(),R(e=>Math.max(e-1,-1))):"Escape"===e.key&&E(!1)},onFocus:()=>{w.length>0&&E(!0)}}),I&&Object(A.jsxs)(gt,{children:[w.map((e,t)=>Object(A.jsxs)(xt,{$active:t===F,onMouseDown:t=>{t.preventDefault(),ae(e.key),E(!1)},onMouseEnter:()=>R(t),children:[Object(A.jsx)(yt,{children:Object(A.jsx)(tt,{type:rt(e.issueTypeName),size:16})}),Object(A.jsx)(vt,{children:e.key}),Object(A.jsx)(Ot,{children:e.summary||"(\uc81c\ubaa9 \uc5c6\uc74c)"}),Object(A.jsx)(kt,{$color:De(e.statusName,e.statusCategory),children:e.statusName})]},e.key)),N&&Object(A.jsx)($t,{children:"\uac80\uc0c9 \uc911..."})]}),N&&!I&&x.trim()&&Object(A.jsx)(gt,{children:Object(A.jsx)($t,{children:"\uac80\uc0c9 \uc911..."})})]}),Object(A.jsx)(wt,{onClick:()=>{E(!1),te()},disabled:k,children:k?"\uac80\uc0c9 \uc911...":"\uac80\uc0c9"}),null!==v&&Object(A.jsx)(Ct,{onClick:()=>{y(""),O(null),C([]),E(!1)},children:"\ucd08\uae30\ud654"})]}),Object(A.jsx)(St,{onClick:G,disabled:l,children:"\uc0c8\ub85c\uace0\uce68"})]}),Object(A.jsxs)(zt,{children:[Object(A.jsxs)(At,{children:[Object(A.jsx)(It,{children:se?`\uac80\uc0c9 \uacb0\uacfc (${ce.reduce((e,t)=>e+t.children.length,0)}\uac74)`:`\ub0b4 \ub2f4\ub2f9 \uc774\uc288 (${ce.reduce((e,t)=>e+t.children.length,0)}\uac74)`}),ce.length>0&&Object(A.jsxs)(Et,{children:[Object(A.jsx)(Nt,{onClick:()=>{K(new Set(ce.map(e=>e.key)))},children:"\ubaa8\ub450 \ud3bc\uce58\uae30"}),Object(A.jsx)(Nt,{onClick:()=>{K(new Set)},children:"\ubaa8\ub450 \uc811\uae30"})]})]}),l||k?Object(A.jsxs)(Ft,{children:[Object(A.jsx)(Rt,{}),Object(A.jsx)(Pt,{children:k?"\uac80\uc0c9 \uc911":"\ub85c\ub529 \uc911"})]}):0===ce.length?Object(A.jsx)(Lt,{children:se?"\uac80\uc0c9 \uacb0\uacfc\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.":"\ub2f4\ub2f9\ub41c \uc774\uc288\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."}):Object(A.jsx)(Dt,{children:ce.map(e=>{const t=D.has(e.key);return Object(A.jsxs)(Kt,{children:[Object(A.jsxs)(_t,{onClick:()=>{return t=e.key,void K(e=>{const r=new Set(e);return r.has(t)?r.delete(t):r.add(t),r});var t},children:[Object(A.jsx)(Bt,{children:t?"\u25bc":"\u25b6"}),"__no_epic__"!==e.key&&Object(A.jsxs)(A.Fragment,{children:[Object(A.jsx)(tt,{type:rt(e.issueTypeName),size:18}),Object(A.jsx)(Mt,{onClick:t=>{t.stopPropagation(),ae(e.key)},children:e.key})]}),Object(A.jsx)(Ut,{children:e.summary}),Object(A.jsx)(Ht,{children:e.children.length})]}),t&&Object(A.jsxs)(qt,{children:[Object(A.jsxs)(Yt,{children:[Object(A.jsx)("span",{children:"\ud0a4"}),Object(A.jsx)("span",{children:"\uc694\uc57d"}),Object(A.jsx)("span",{children:"\uc0c1\ud0dc"}),Object(A.jsx)("span",{children:"\ub2f4\ub2f9\uc790"}),Object(A.jsx)("span",{children:"\ub9c8\uac10\uc77c"})]}),e.children.map(e=>Object(A.jsxs)(Wt,{onClick:()=>ae(e.key),children:[Object(A.jsxs)(Jt,{children:[Object(A.jsx)(tt,{type:rt(e.issueTypeName),size:18}),Object(A.jsx)(Vt,{children:e.key})]}),Object(A.jsx)(Xt,{children:e.summary||"(\uc81c\ubaa9 \uc5c6\uc74c)"}),Object(A.jsxs)(Zt,{$color:De(e.statusName,e.statusCategory),onClick:t=>{t.stopPropagation(),W(e.key,e.statusName,t)},children:[e.statusName||"-",Object(A.jsx)(Gt,{children:"\u25be"})]}),Object(A.jsx)(Qt,{children:e.assigneeName||"\ubbf8\uc9c0\uc815"}),Object(A.jsx)(er,{children:e.duedate?e.duedate.slice(0,10):"-"})]},e.key||e.id))]})]},e.key)})})]}),b&&Object(A.jsx)(tr,{onClick:()=>f(!1),children:Object(A.jsxs)(rr,{onClick:e=>e.stopPropagation(),children:[Object(A.jsxs)(nr,{children:[Object(A.jsx)(ir,{children:"\uc2a4\ud398\uc774\uc2a4 \ud544\ud130 \uc124\uc815"}),Object(A.jsx)(ar,{onClick:()=>f(!1),children:"\u2715"})]}),Object(A.jsxs)(or,{children:["\uc120\ud0dd\ud55c \uc2a4\ud398\uc774\uc2a4\uc758 \uc774\uc288\ub9cc \uc870\ud68c \ubc0f \uac80\uc0c9\ub429\ub2c8\ub2e4.",m.length>0?` (${m.length}\uac1c \uc120\ud0dd\ub428)`:" (\uc804\uccb4)"]}),Object(A.jsxs)(sr,{children:[Object(A.jsx)(cr,{placeholder:"\uc2a4\ud398\uc774\uc2a4 \uac80\uc0c9...",value:j,onChange:e=>g(e.target.value),autoFocus:!0}),Object(A.jsx)(Nt,{onClick:()=>{const e=oe.map(e=>e.key);h(t=>Array.from(new Set(t.concat(e))))},children:"\uc804\uccb4 \uc120\ud0dd"}),Object(A.jsx)(Nt,{onClick:()=>{if(j){const e=new Set(oe.map(e=>e.key));h(t=>t.filter(t=>!e.has(t)))}else h([])},children:"\uc804\uccb4 \ud574\uc81c"})]}),Object(A.jsx)(lr,{children:(()=>{const e=new Set(m),t=oe.filter(t=>e.has(t.key)),r=oe.filter(t=>!e.has(t.key));return Object(A.jsxs)(A.Fragment,{children:[t.length>0&&Object(A.jsxs)(A.Fragment,{children:[Object(A.jsx)(dr,{children:"\uc120\ud0dd\ub428"}),t.map(e=>Object(A.jsxs)(pr,{$active:!0,onClick:()=>{h(t=>t.filter(t=>t!==e.key))},children:[Object(A.jsx)(mr,{$checked:!0,children:"\u2713"}),Object(A.jsx)(hr,{children:e.name}),Object(A.jsx)(br,{children:e.key})]},e.key))]}),r.length>0&&Object(A.jsxs)(A.Fragment,{children:[t.length>0&&Object(A.jsx)(dr,{children:"\uc804\uccb4"}),r.map(e=>Object(A.jsxs)(pr,{$active:!1,onClick:()=>{h(t=>[...t,e.key])},children:[Object(A.jsx)(mr,{$checked:!1}),Object(A.jsx)(hr,{children:e.name}),Object(A.jsx)(br,{children:e.key})]},e.key))]}),0===t.length&&0===r.length&&Object(A.jsx)(ur,{children:"\uc77c\uce58\ud558\ub294 \uc2a4\ud398\uc774\uc2a4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."})]})})()}),Object(A.jsx)(fr,{children:Object(A.jsx)(jr,{onClick:()=>{!function(e,t){try{var r;null!==(r=window.workspaceAPI)&&void 0!==r&&r.settings&&window.workspaceAPI.settings.setSelectedProjects(e,t),localStorage.setItem(`lyra:jira:selectedProjects:${e}`,JSON.stringify(t))}catch{}}(r,m),f(!1),G()},children:"\uc800\uc7a5"})})]})}),B&&Object(A.jsx)(He,{target:B,transitions:U,isLoading:q,dropdownRef:Y,onSelect:J,onClose:V})]})};const lt=c.a.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${Ae.subtle};
  overflow-x: hidden;
  zoom: 1.2;
`,dt=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${Ae.default};
  border-bottom: 1px solid ${Ie};
  flex-wrap: wrap;
`,ut=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.125rem;
  color: ${Ee.primary};
  flex-shrink: 0;
`,pt=c.a.span`
  display: inline-flex;
  align-items: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`,mt=c.a.div`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`,ht=c.a.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${Ie};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${Ae.subtle};
  color: ${Ee.primary};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${w};

  &:hover {
    background: ${Ae.hover};
    border-color: ${ke};
  }
`,bt=c.a.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.25rem;
  border-radius: 9px;
  background: ${ke};
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
`,ft=c.a.div`
  flex: 1;
  position: relative;
  min-width: 120px;
`,jt=c.a.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid ${Ie};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${Ae.subtle} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2397A0AF' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 0.5rem center;
  box-sizing: border-box;

  &::placeholder { color: ${Ee.muted}; }
  &:focus {
    outline: none;
    border-color: ${ke};
    background-color: ${Ae.default};
  }
`,gt=c.a.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${Ae.default};
  border: 1px solid ${Ie};
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 200;
  max-height: 360px;
  overflow-y: auto;
`,xt=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  background: ${e=>{let{$active:t}=e;return t?Ae.hover:"transparent"}};
  transition: background 0.1s;

  &:hover { background: ${Ae.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${Ie}; }
`,yt=c.a.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`,vt=c.a.span`
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${ke};
  min-width: 80px;
`,Ot=c.a.span`
  flex: 1;
  font-size: 0.8125rem;
  color: ${Ee.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,kt=c.a.span`
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 20px;
  background: ${e=>{let{$color:t}=e;return t||Ce.default}};
  color: white;
`,$t=c.a.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${Ee.muted};
`,wt=c.a.button`
  padding: 0.5rem 1rem;
  background: ${ke};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${w};
  flex-shrink: 0;

  &:hover { background: ${$e}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`,Ct=c.a.button`
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: ${Ee.secondary};
  border: 1px solid ${Ie};
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: ${Ae.hover}; color: ${Ee.primary}; }
`,St=c.a.button`
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  background: transparent;
  border: 1px solid ${Ie};
  border-radius: 20px;
  color: ${Ee.secondary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: ${Ae.hover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`,zt=c.a.main`
  flex: 1;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
`,At=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`,It=c.a.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${Ee.primary};
`,Et=c.a.div`
  display: flex;
  gap: 0.5rem;
`,Nt=c.a.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid ${Ie};
  border-radius: 20px;
  color: ${Ee.secondary};
  cursor: pointer;

  &:hover { background: ${Ae.hover}; color: ${Ee.primary}; }
`,Tt=c.b`
  to { transform: rotate(360deg); }
`,Ft=c.a.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
`,Rt=c.a.div`
  width: 1.5rem;
  height: 1.5rem;
  border: 2.5px solid ${Ie};
  border-top-color: ${ke};
  border-radius: 50%;
  animation: ${Tt} 0.7s linear infinite;
`,Pt=c.a.span`
  font-size: 0.8125rem;
  color: ${Ee.secondary};
`,Lt=c.a.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${Ee.secondary};
`,Dt=c.a.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,Kt=c.a.div`
  border-radius: 6px;
  border: 1px solid ${Ie};
  overflow: hidden;
`,_t=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background: #F8F9FB;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${w};
  min-width: 0;
  border-left: 3px solid ${Se.epic};

  &:hover { background: ${Ae.hover}; }
`,Bt=c.a.span`
  font-size: 0.625rem;
  color: ${Ee.muted};
  width: 0.875rem;
  flex-shrink: 0;
`,Mt=c.a.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${Se.epic};
  flex-shrink: 0;
  cursor: pointer;

  &:hover { text-decoration: underline; }
`,Ut=c.a.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${Ee.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`,Ht=c.a.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${Se.epic};
  background: #EDE8F5;
  border-radius: 10px;
  padding: 0.125rem 0.5rem;
  flex-shrink: 0;
`,qt=c.a.div``,Yt=c.a.div`
  display: grid;
  grid-template-columns: minmax(100px, 160px) 1fr minmax(70px, 110px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 0.75rem;
  padding: 0.4rem 1rem 0.4rem 2.25rem;
  background: #ECEEF2;
  border-top: 1px solid ${Ie};
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${Ee.muted};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: center;

  @media (max-width: 600px) {
    grid-template-columns: minmax(80px, 120px) 1fr;
    padding-left: 1rem;

    span:nth-child(3),
    span:nth-child(4),
    span:nth-child(5) { display: none; }
  }
`,Wt=c.a.div`
  display: grid;
  grid-template-columns: minmax(100px, 160px) 1fr minmax(70px, 110px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.5rem 2.25rem;
  background: ${Ae.default};
  border-top: 1px solid #F0F1F3;
  cursor: pointer;
  transition: background 0.12s ${w};
  align-items: center;

  &:first-child { border-top: none; }
  &:hover { background: #F5F7FA; }

  @media (max-width: 600px) {
    grid-template-columns: minmax(80px, 120px) 1fr;
    padding-left: 1rem;
  }
`,Jt=c.a.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
`,Vt=c.a.span`
  font-weight: 600;
  color: ${ke};
  font-size: 0.8125rem;
`,Xt=c.a.span`
  font-size: 0.8125rem;
  color: ${Ee.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Zt=c.a.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 20px;
  background: ${e=>{let{$color:t}=e;return t||Ce.default}};
  color: white;
  text-align: center;
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  justify-self: center;
  transition: filter 0.15s;

  &:hover { filter: brightness(0.9); }

  @media (max-width: 600px) { display: none; }
`,Gt=c.a.span`
  font-size: 0.625rem;
  line-height: 1;
  opacity: 0.8;
`,Qt=c.a.span`
  font-size: 0.75rem;
  color: ${Ee.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;

  @media (max-width: 600px) { display: none; }
`,er=c.a.span`
  font-size: 0.75rem;
  color: ${Ee.muted};
  text-align: center;
  white-space: nowrap;

  @media (max-width: 600px) { display: none; }
`,tr=c.a.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`,rr=c.a.div`
  background: ${Ae.default};
  border-radius: 6px;
  border: 1px solid ${Ie};
  width: 420px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`,nr=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${Ie};
`,ir=c.a.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${Ee.primary};
`,ar=c.a.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${Ee.muted};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;

  &:hover { color: ${Ee.primary}; }
`,or=c.a.div`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: ${Ee.secondary};
  border-bottom: 1px solid ${Ie};
`,sr=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid ${Ie};
`,cr=c.a.input`
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid ${Ie};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${Ae.subtle};
  color: ${Ee.primary};

  &::placeholder { color: ${Ee.muted}; }
  &:focus {
    outline: none;
    border-color: ${ke};
    background: ${Ae.default};
  }
`,lr=c.a.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  max-height: 400px;
`,dr=c.a.div`
  padding: 0.375rem 1.25rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${Ee.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${Ie};
  margin-bottom: 0.125rem;

  &:not(:first-child) {
    margin-top: 0.375rem;
    border-top: 1px solid ${Ie};
    padding-top: 0.5rem;
  }
`,ur=c.a.div`
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${Ee.muted};
`,pr=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${e=>{let{$active:t}=e;return t?we:"transparent"}};

  &:hover {
    background: ${e=>{let{$active:t}=e;return t?we:Ae.hover}};
  }
`,mr=c.a.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 20px;
  border: 2px solid ${e=>{let{$checked:t}=e;return t?ke:Ie}};
  background: ${e=>{let{$checked:t}=e;return t?ke:"transparent"}};
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  flex-shrink: 0;
`,hr=c.a.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${Ee.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`,br=c.a.span`
  font-size: 0.75rem;
  color: ${Ee.muted};
  flex-shrink: 0;
`,fr=c.a.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${Ie};
`,jr=c.a.button`
  padding: 0.5rem 1.25rem;
  background: ${ke};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${w};

  &:hover { background: ${$e}; }
`;function gr(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function xr(e){var t,r;if(!e)return"";if("text"===e.type&&"string"===typeof e.text)return function(e,t){if(!t||0===t.length)return e;let r=e;for(const o of t)switch(o.type){case"strong":r=`<strong>${r}</strong>`;break;case"em":r=`<em>${r}</em>`;break;case"code":r=`<code>${r}</code>`;break;case"strike":r=`<s>${r}</s>`;break;case"underline":r=`<u>${r}</u>`;break;case"link":var n;r=`<a href="${gr(String((null===(n=o.attrs)||void 0===n?void 0:n.href)||""))}" target="_blank" rel="noopener noreferrer">${r}</a>`;break;case"textColor":var i;r=`<span style="color:${gr(String((null===(i=o.attrs)||void 0===i?void 0:i.color)||""))}">${r}</span>`;break;case"subsup":{var a;const e="sup"===(null===(a=o.attrs)||void 0===a?void 0:a.type)?"sup":"sub";r=`<${e}>${r}</${e}>`;break}}return r}(gr(e.text),e.marks);const n=null!==(t=null===(r=e.content)||void 0===r?void 0:r.map(xr).join(""))&&void 0!==t?t:"";switch(e.type){case"doc":default:return n;case"paragraph":return`<p>${n}</p>`;case"heading":{var i;const t=Math.min(Math.max(Number(null===(i=e.attrs)||void 0===i?void 0:i.level)||1,1),6);return`<h${t}>${n}</h${t}>`}case"bulletList":return`<ul>${n}</ul>`;case"orderedList":var a;return`<ol${null!==(a=e.attrs)&&void 0!==a&&a.order?` start="${e.attrs.order}"`:""}>${n}</ol>`;case"listItem":return`<li>${n}</li>`;case"codeBlock":var o;return`<pre><code${null!==(o=e.attrs)&&void 0!==o&&o.language?` class="language-${gr(String(e.attrs.language))}"`:""}>${n}</code></pre>`;case"blockquote":return`<blockquote>${n}</blockquote>`;case"rule":return"<hr />";case"hardBreak":return"<br />";case"table":return`<table>${n}</table>`;case"tableRow":return`<tr>${n}</tr>`;case"tableHeader":return`<th>${n}</th>`;case"tableCell":return`<td>${n}</td>`;case"panel":var s;return`<div class="adf-panel adf-panel-${gr(String((null===(s=e.attrs)||void 0===s?void 0:s.panelType)||"info"))}">${n}</div>`;case"expand":var c;return`<details><summary>${null!==(c=e.attrs)&&void 0!==c&&c.title?gr(String(e.attrs.title)):"\ud3bc\uce58\uae30"}</summary>${n}</details>`;case"status":{var l,d;const t=gr(String((null===(l=e.attrs)||void 0===l?void 0:l.text)||""));return`<span class="adf-status adf-status-${gr(String((null===(d=e.attrs)||void 0===d?void 0:d.color)||"neutral"))}">${t}</span>`}case"mention":var u;return`<span class="adf-mention">${gr(String((null===(u=e.attrs)||void 0===u?void 0:u.text)||""))}</span>`;case"emoji":{var p,m;const t=String((null===(p=e.attrs)||void 0===p?void 0:p.shortName)||"");return String((null===(m=e.attrs)||void 0===m?void 0:m.text)||t)}case"inlineCard":{var h;const t=String((null===(h=e.attrs)||void 0===h?void 0:h.url)||"");if(!t)return"";const r=t.replace(/^https?:\/\//,"").split("/").slice(0,3).join("/");return`<a href="${gr(t)}" target="_blank" rel="noopener noreferrer" data-inline-card="true">${gr(r)}</a>`}case"mediaSingle":case"mediaGroup":return`<div class="adf-media">${n}</div>`;case"media":var b;if("external"===String((null===(b=e.attrs)||void 0===b?void 0:b.type)||"")){var f;return`<img src="${gr(String((null===(f=e.attrs)||void 0===f?void 0:f.url)||""))}" alt="" class="adf-image" />`}return'<span class="adf-media-placeholder">[\ucca8\ubd80 \ud30c\uc77c]</span>';case"date":{var j;const t=null===(j=e.attrs)||void 0===j?void 0:j.timestamp;if(t)try{return`<time>${new Date(Number(t)).toLocaleDateString("ko-KR")}</time>`}catch{}return""}}}function yr(e){if(!e)return"";if("string"===typeof e)return`<p>${gr(e)}</p>`;return xr(e)}function vr(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}var Or=r(45);function kr(e){return e.filter(e=>e&&"object"===typeof e).map(e=>{const t=e,r=Re(t.author),n=Fe(null===r||void 0===r?void 0:r.accountId)||Fe(null===r||void 0===r?void 0:r.account_id)||Fe(null===r||void 0===r?void 0:r.name)||"",i=function(e){if(!e||"object"!==typeof e)return null;const t=e.content;if(!Array.isArray(t)||0===t.length)return null;const r=t[0];if("paragraph"!==(null===r||void 0===r?void 0:r.type))return null;const n=r.content;if(!Array.isArray(n)||0===n.length)return null;const i=n[0];if("mention"!==(null===i||void 0===i?void 0:i.type))return null;const a=i.attrs;return{id:Fe(null===a||void 0===a?void 0:a.id),text:Fe(null===a||void 0===a?void 0:a.text).replace(/^@/,"")}}(t.body);return{id:Fe(t.id),author:Fe(null===r||void 0===r?void 0:r.displayName)||Fe(null===r||void 0===r?void 0:r.display_name)||Fe(null===r||void 0===r?void 0:r.name)||"\uc54c \uc218 \uc5c6\uc74c",authorId:n,bodyHtml:"string"===typeof t.body?`<p>${t.body.replace(/\n/g,"<br />")}</p>`:yr(t.body),created:Fe(t.created),updated:Fe(t.updated),replyToId:(null===i||void 0===i?void 0:i.id)||"",replyToName:(null===i||void 0===i?void 0:i.text)||""}})}function $r(e){const t=[],r=new Map;for(const n of e){if(n.replyToId){const e=r.get(n.replyToId);if(void 0!==e&&t[e]){t[e].replies.push(n);continue}}const e=t.length;t.push({comment:n,replies:[]}),n.authorId&&r.set(n.authorId,e)}return t}function wr(e){const t=e.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i);return t?t[1]:null}function Cr(e){const t=e.match(/\/pages\/(\d+)/);return t?t[1]:null}function Sr(e){var t,r;if(!e||"object"!==typeof e)return[];const n=e,i=null!==(t=null!==(r=n.issues)&&void 0!==r?r:n.values)&&void 0!==t?t:[];return Array.isArray(i)?i.filter(e=>e&&"object"===typeof e).map(e=>{const t=Fe(e.key),r=e.fields&&"object"===typeof e.fields?e.fields:e,n=r.summary,i="string"===typeof n?n:Te(n),a=Re(r.status),o=Re(null===a||void 0===a?void 0:a.statusCategory),s=Re(r.issuetype)||Re(r.issue_type)||Re(r.issueType),c=Re(r.priority);return{key:t,summary:i.trim(),statusName:Fe(null===a||void 0===a?void 0:a.name),statusCategory:Fe(null===o||void 0===o?void 0:o.name)||Fe(null===o||void 0===o?void 0:o.key),issueTypeName:Fe(null===s||void 0===s?void 0:s.name),priorityName:Fe(null===c||void 0===c?void 0:c.name)}}).filter(e=>e.key):[]}const zr=[];var Ar=()=>{const{issueKey:e}=Object(s.j)(),t=Object(s.h)(),{activeAccount:r}=H(),[a,o]=Object(n.useState)(null),[c,l]=Object(n.useState)(!0),[d,u]=Object(n.useState)(null),[p,m]=Object(n.useState)([]),[h,b]=Object(n.useState)([]),[f,j]=Object(n.useState)([]),[g,x]=Object(n.useState)(new Set),[y,v]=Object(n.useState)({}),[O,k]=Object(n.useState)(new Set),[$,w]=Object(n.useState)([]),[C,S]=Object(n.useState)({}),[z,I]=Object(n.useState)(!1),[E,N]=Object(n.useState)([]),T=Object(n.useCallback)((e,t,r)=>{a&&e===a.key&&o(e=>e?{...e,statusName:t,statusCategory:r}:e),w(n=>n.map(n=>n.key===e?{...n,statusName:t,statusCategory:r}:n)),b(n=>n.map(n=>n.key===e?{...n,statusName:t,statusCategory:r}:n))},[a]),{target:F,transitions:R,isLoading:P,dropdownRef:L,open:D,execute:K,close:_}=Ue({accountId:null===r||void 0===r?void 0:r.id,serviceType:"jira",onTransitioned:T}),B=Object(n.useCallback)(async e=>{if(!r)return;const t={},n=new Map,i=new Map;for(const r of e){const e=wr(r);if(e){const t=n.get(e)||[];t.push(r),n.set(e,t);continue}const t=Cr(r);if(t){const e=i.get(t)||[];e.push(r),i.set(t,e)}}const a=Array.from(n.keys());if(a.length>0)try{var o,s;const e=`key IN (${a.join(",")})`,i=await M({accountId:r.id,serviceType:"jira",action:"searchIssues",params:{jql:e,maxResults:a.length}}),c=null!==(o=null!==(s=null===i||void 0===i?void 0:i.issues)&&void 0!==s?s:null===i||void 0===i?void 0:i.values)&&void 0!==o?o:[];if(Array.isArray(c))for(const r of c){const e=Fe(r.key),i=(Re(r.fields)||r).summary,a="string"===typeof i?i:Te(i);if(e&&a){const r=n.get(e)||[];for(const n of r)t[n]=`${e}: ${a}`}}}catch{}const c=Array.from(i.keys());await Promise.all(c.map(async e=>{try{const n=await M({accountId:r.id,serviceType:"jira",action:"getConfluencePageContent",params:{pageId:e}});if(n&&"object"===typeof n){const r=Fe(n.title);if(r){const n=i.get(e)||[];for(const e of n)t[e]=r}}}catch{}})),Object.keys(t).length>0&&S(t)},[r]);Object(n.useEffect)(()=>{if(!r||!e)return void l(!1);(async()=>{try{const[t,n,i,a]=await Promise.all([M({accountId:r.id,serviceType:"jira",action:"getIssue",params:{issueKey:e}}),M({accountId:r.id,serviceType:"jira",action:"getComments",params:{issueKey:e}}).catch(()=>[]),M({accountId:r.id,serviceType:"jira",action:"getRemoteLinks",params:{issueKey:e}}).catch(()=>[]),M({accountId:r.id,serviceType:"jira",action:"searchConfluenceByIssue",params:{issueKey:e}}).catch(()=>[])]);let s="",c=[];if(t&&"object"===typeof t){const e=t,n=function(e){const t=Fe(e.key)||Fe(e.issueKey)||"",r=e.fields&&"object"===typeof e.fields?e.fields:e;let n="";const i=r.summary;"string"===typeof i?n=i.trim():i&&"object"===typeof i&&(n=Te(i).trim());let a="";const o=r.description;"string"===typeof o?a=`<p>${o.trim().replace(/\n/g,"<br />")}</p>`:o&&"object"===typeof o&&(a=yr(o));const s=Re(r.status),c=Fe(null===s||void 0===s?void 0:s.name)||Fe(r.statusName)||"",l=Re(null===s||void 0===s?void 0:s.statusCategory),d=Fe(null===s||void 0===s?void 0:s.category)||Fe(null===l||void 0===l?void 0:l.name)||Fe(null===l||void 0===l?void 0:l.key)||Fe(r.statusCategory)||"",u=Re(r.assignee),p=Fe(null===u||void 0===u?void 0:u.displayName)||Fe(null===u||void 0===u?void 0:u.display_name)||Fe(null===u||void 0===u?void 0:u.name)||"",m=Re(r.reporter),h=Fe(null===m||void 0===m?void 0:m.displayName)||Fe(null===m||void 0===m?void 0:m.display_name)||Fe(null===m||void 0===m?void 0:m.name)||"",b=Re(r.issuetype)||Re(r.issue_type)||Re(r.issueType),f=Fe(null===b||void 0===b?void 0:b.name)||"",j=Re(r.priority);return{key:t,summary:n,descriptionHtml:a,statusName:c,statusCategory:d,assigneeName:p,reporterName:h,issueTypeName:f,priorityName:Fe(null===j||void 0===j?void 0:j.name)||"",created:Fe(r.created)||"",updated:Fe(r.updated)||""}}(e);s=n.descriptionHtml,o(n);const i=zr.findIndex(e=>e.key===n.key);i>=0&&zr.splice(i),N([...zr]);const a=e.issuelinks;if(Array.isArray(a)&&b(function(e){const t=[];for(const r of e){if(!r||"object"!==typeof r)continue;const e=r,n=Re(e.type),i=Re(e.outwardIssue),a=Re(e.inwardIssue),o=i||a;if(!o)continue;const s=Fe(i?null===n||void 0===n?void 0:n.outward:null===n||void 0===n?void 0:n.inward),c=Re(o.fields)||o,l=Re(c.status),d=Re(null===l||void 0===l?void 0:l.statusCategory),u=Re(c.issuetype),p=Re(c.priority);t.push({key:Fe(o.key),summary:"string"===typeof c.summary?c.summary:Te(c.summary),statusName:Fe(null===l||void 0===l?void 0:l.name),statusCategory:Fe(null===d||void 0===d?void 0:d.name)||Fe(null===d||void 0===d?void 0:d.key),issueTypeName:Fe(null===u||void 0===u?void 0:u.name),priorityName:Fe(null===p||void 0===p?void 0:p.name),linkType:s})}return t}(a)),Pe(n.issueTypeName)||!Le(n.issueTypeName)&&!Pe(n.issueTypeName)){const e=[],t=new Set;try{const i=await M({accountId:r.id,serviceType:"jira",action:"searchIssues",params:{jql:`parent = ${n.key} ORDER BY created ASC`,maxResults:100}});for(const r of Sr(i))t.has(r.key)||(e.push(r),t.add(r.key))}catch{}if(Pe(n.issueTypeName))try{const i=await M({accountId:r.id,serviceType:"jira",action:"searchIssues",params:{jql:`"Epic Link" = ${n.key} ORDER BY created ASC`,maxResults:100}});for(const r of Sr(i))t.has(r.key)||(e.push(r),t.add(r.key))}catch{}w(e)}else w([])}else u("\uc774\uc288\ub97c \ubd88\ub7ec\uc624\ub294\ub370 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");Array.isArray(n)&&(c=kr(n),m(c));const l=Array.isArray(i)?function(e){const t=[];for(const r of e){if(!r||"object"!==typeof r)continue;const e=Re(r.object);if(!e)continue;const n=Fe(e.url),i=Fe(e.title),a=n.match(/\/pages\/(\d+)/);a&&a[1]&&t.push({pageId:a[1],title:i||"Confluence \ubb38\uc11c",url:n})}return t}(i):[],d=Array.isArray(a)?function(e){const t=[];for(const n of e){var r;if(!n||"object"!==typeof n)continue;const e=n,i=Re(e.content)||e,a=Fe(i.id),o=Fe(i.title)||Fe(e.title),s=Fe(e.url)||Fe(i._links&&(null===(r=i._links)||void 0===r?void 0:r.webui))||"",c=Re(i.version),l=Fe(null===c||void 0===c?void 0:c.when);a&&t.push({pageId:a,title:o||"Confluence \ubb38\uc11c",url:s,lastUpdated:l})}return t}(a):[];j(function(e,t){const r=new Set,n=[];for(const i of[...e,...t])r.has(i.pageId)||(r.add(i.pageId),n.push(i));return n}(l,d));const p=function(e){const t=[],r=/<a\s+[^>]*href="([^"]*)"[^>]*data-inline-card="true"[^>]*>/g,n=/<a\s+[^>]*data-inline-card="true"[^>]*href="([^"]*)"[^>]*>/g;let i;for(;null!==(i=r.exec(e));)i[1]&&t.push(i[1]);for(;null!==(i=n.exec(e));)i[1]&&!t.includes(i[1])&&t.push(i[1]);return t}([s,...c.map(e=>e.bodyHtml)].join(" "));p.length>0&&B(p),u(null)}catch(t){u("\uc774\uc288\ub97c \ubd88\ub7ec\uc624\ub294\ub370 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4."),console.error("[JiraIssueDetail] fetchAll error:",t)}finally{l(!1)}})()},[r,e]);const U=e=>{a&&(zr.some(e=>e.key===a.key)||zr.push({key:a.key,summary:a.summary,issueTypeName:a.issueTypeName})),t.push(`/jira/issue/${e}`)},q=()=>{zr.length=0,t.push("/jira")},Y=Object(n.useCallback)(async e=>{const{pageId:t}=e;if(x(e=>{const r=new Set(e);return r.has(t)?r.delete(t):r.add(t),r}),!y[t]&&r){k(e=>new Set(e).add(t));try{const n=await M({accountId:r.id,serviceType:"jira",action:"getConfluencePageContent",params:{pageId:t}});if(n&&"object"===typeof n){const r=n,i=Re(r.body),a=Re(null===i||void 0===i?void 0:i.storage),o=Fe(null===a||void 0===a?void 0:a.value),s=o?function(e){if(!e)return"";let t=e;return t=t.replace(/<ac:structured-macro[^>]*ac:name="code"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,(e,t)=>{const r=t.match(/<ac:parameter[^>]*ac:name="language"[^>]*>(.*?)<\/ac:parameter>/i),n=r?r[1].trim():"",i=n?` class="language-${vr(n)}"`:"",a=t.match(/<ac:plain-text-body[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ac:plain-text-body>/i);return`<pre><code${i}>${vr(a?a[1]:"")}</code></pre>`}),t=t.replace(/<ac:structured-macro[^>]*ac:name="(info|note|warning|tip)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,(e,t,r)=>{const n=r.match(/<ac:rich-text-body[^>]*>([\s\S]*?)<\/ac:rich-text-body>/i),i=n?n[1]:r;return`<div class="confluence-panel confluence-panel-${t.toLowerCase()}">${i}</div>`}),t=t.replace(/<ac:structured-macro[^>]*ac:name="expand"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,(e,t)=>{const r=t.match(/<ac:parameter[^>]*ac:name="title"[^>]*>(.*?)<\/ac:parameter>/i),n=r?r[1].trim():"\ud3bc\uce58\uae30",i=t.match(/<ac:rich-text-body[^>]*>([\s\S]*?)<\/ac:rich-text-body>/i),a=i?i[1]:"";return`<details><summary>${vr(n)}</summary>${a}</details>`}),t=t.replace(/<ac:structured-macro[^>]*ac:name="toc"[^>]*>[\s\S]*?<\/ac:structured-macro>/gi,""),t=t.replace(/<ac:structured-macro[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,(e,t)=>{const r=t.match(/<ac:rich-text-body[^>]*>([\s\S]*?)<\/ac:rich-text-body>/i);return r?r[1]:""}),t=t.replace(/<ac:emoticon[^>]*ac:name="([^"]*)"[^>]*\/?\s*>/gi,(e,t)=>({smile:"\ud83d\ude0a",sad:"\ud83d\ude22",tick:"\u2705",cross:"\u274c",warning:"\u26a0\ufe0f",information:"\u2139\ufe0f",plus:"\u2795",minus:"\u2796",question:"\u2753","thumbs-up":"\ud83d\udc4d","thumbs-down":"\ud83d\udc4e","light-on":"\ud83d\udca1","light-off":"\ud83d\udca1",star_yellow:"\u2b50",heart:"\u2764\ufe0f",laugh:"\ud83d\ude02",wink:"\ud83d\ude09"}[t]||"")),t=t.replace(/<ac:image[^>]*>[\s\S]*?<ri:attachment ri:filename="([^"]*)"[^>]*\/>[\s\S]*?<\/ac:image>/gi,(e,t)=>`<span class="adf-media-placeholder">[\ucca8\ubd80: ${vr(t)}]</span>`),t=t.replace(/<ac:link[^>]*>[\s\S]*?<ri:page ri:content-title="([^"]*)"[^>]*\/>[\s\S]*?(?:<ac:plain-text-link-body[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ac:plain-text-link-body>[\s\S]*?)?<\/ac:link>/gi,(e,t,r)=>`<a href="#">${vr((null===r||void 0===r?void 0:r.trim())||t)}</a>`),t=t.replace(/<ac:[^>]*\/>/gi,""),t=t.replace(/<\/?ac:[^>]*>/gi,""),t=t.replace(/<\/?ri:[^>]*\/?>/gi,""),t}(o):"";v(n=>({...n,[t]:{title:Fe(r.title)||e.title,body:s||"<p>(\ub0b4\uc6a9 \uc5c6\uc74c)</p>"}}))}}catch{v(r=>({...r,[t]:{title:e.title,body:"\ubb38\uc11c\ub97c \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."}}))}finally{k(e=>{const r=new Set(e);return r.delete(t),r})}}},[r,y]);if(!r)return Object(A.jsx)(Ir,{children:Object(A.jsx)(Lr,{children:Object(A.jsx)(Dn,{children:"\uacc4\uc815\uc744 \uba3c\uc800 \uc124\uc815\ud574\uc8fc\uc138\uc694."})})});if(c)return Object(A.jsx)(Ir,{children:Object(A.jsx)(Lr,{children:Object(A.jsx)(Ln,{children:"\ub85c\ub529 \uc911..."})})});const W=Object.keys(C).length>0,J=e=>W?function(e,t){return e.replace(/<a\s+([^>]*data-inline-card="true"[^>]*)>([^<]*)<\/a>/g,(e,r,n)=>{const i=r.match(/href="([^"]*)"/);if(!i)return e;const a=i[1],o=t[a];return o?`<a ${r}>${o}</a>`:e})}(e,C):e;return d||!a?Object(A.jsxs)(Ir,{children:[Object(A.jsx)(Er,{children:Object(A.jsx)(Nr,{onClick:q,children:"\u2190 \ubaa9\ub85d\uc73c\ub85c"})}),Object(A.jsx)(Lr,{children:Object(A.jsx)(Dn,{children:null!==d&&void 0!==d?d:"\uc774\uc288\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."})})]}):Object(A.jsxs)(Ir,{children:[Object(A.jsxs)(Er,{children:[Object(A.jsx)(Nr,{onClick:q,children:"\u2190 \ubaa9\ub85d\uc73c\ub85c"}),Object(A.jsxs)(Tr,{children:[E.map(e=>Object(A.jsxs)(i.a.Fragment,{children:[Object(A.jsx)(Fr,{children:"/"}),Object(A.jsxs)(Rr,{onClick:()=>(e=>{const r=zr.findIndex(t=>t.key===e);r>=0&&zr.splice(r+1),t.push(`/jira/issue/${e}`)})(e.key),children:[Object(A.jsx)(tt,{type:rt(e.issueTypeName),size:14}),Object(A.jsx)("span",{children:e.key})]})]},e.key)),Object(A.jsx)(Fr,{children:"/"}),Object(A.jsxs)(Pr,{children:[Object(A.jsx)(tt,{type:rt(a.issueTypeName),size:14}),Object(A.jsx)("span",{children:a.key})]})]})]}),Object(A.jsxs)(Lr,{children:[Object(A.jsxs)(Dr,{children:[Object(A.jsxs)(Kr,{children:[Object(A.jsxs)(_r,{children:[Object(A.jsx)(tt,{type:rt(a.issueTypeName),size:24}),Object(A.jsx)(Br,{children:a.key})]}),Object(A.jsx)(Mr,{title:"Jira\uc5d0\uc11c \uc5f4\uae30",onClick:()=>{var e;const t=(null===(e=r.credentials.baseUrl)||void 0===e?void 0:e.replace(/\/$/,""))||"";if(t){const e=`${t}/browse/${a.key}`,r=window.electronAPI;null!==r&&void 0!==r&&r.openExternal?r.openExternal(e):window.open(e,"_blank")}},children:Object(A.jsx)(Or.a,{size:16})})]}),Object(A.jsxs)(Hr,{children:[a.statusName&&Object(A.jsxs)(bn,{$color:De(a.statusName,a.statusCategory),onClick:e=>D(a.key,a.statusName,e),children:[a.statusName,Object(A.jsx)(fn,{children:"\u25be"})]}),a.priorityName&&Object(A.jsx)(qr,{$color:Ke(a.priorityName),children:a.priorityName})]}),Object(A.jsx)(Ur,{children:a.summary||"(\uc81c\ubaa9 \uc5c6\uc74c)"}),Object(A.jsxs)(Yr,{children:[Object(A.jsxs)(Wr,{children:[Object(A.jsx)(Jr,{children:"\ub2f4\ub2f9\uc790"}),Object(A.jsx)(Vr,{children:a.assigneeName||"\ubbf8\uc9c0\uc815"})]}),Object(A.jsxs)(Wr,{children:[Object(A.jsx)(Jr,{children:"\ubcf4\uace0\uc790"}),Object(A.jsx)(Vr,{children:a.reporterName||"-"})]}),Object(A.jsxs)(Wr,{children:[Object(A.jsx)(Jr,{children:"\uc0dd\uc131\uc77c"}),Object(A.jsx)(Vr,{children:_e(a.created)})]}),Object(A.jsxs)(Wr,{children:[Object(A.jsx)(Jr,{children:"\uc218\uc815\uc77c"}),Object(A.jsx)(Vr,{children:_e(a.updated)})]})]})]}),a.descriptionHtml&&Object(A.jsxs)(Xr,{children:[Object(A.jsx)(Zr,{children:"\uc124\uba85"}),Object(A.jsx)(en,{dangerouslySetInnerHTML:{__html:J(a.descriptionHtml)}})]}),$.length>0&&Object(A.jsxs)(Xr,{children:[Object(A.jsxs)(Zr,{children:[Pe(a.issueTypeName)?"\uc2a4\ud1a0\ub9ac":"\ud558\uc704 \ud56d\ubaa9"," (",$.length,")"]}),Object(A.jsx)(tn,{children:$.map(e=>Object(A.jsxs)(rn,{onClick:()=>U(e.key),children:[Object(A.jsxs)(nn,{children:[Object(A.jsx)(tt,{type:rt(e.issueTypeName),size:18}),Object(A.jsx)(an,{children:e.key}),Object(A.jsx)(on,{children:e.summary||"(\uc81c\ubaa9 \uc5c6\uc74c)"})]}),Object(A.jsx)(sn,{children:Object(A.jsxs)(bn,{$color:De(e.statusName,e.statusCategory),onClick:t=>{t.stopPropagation(),D(e.key,e.statusName,t)},children:[e.statusName||"-",Object(A.jsx)(fn,{children:"\u25be"})]})})]},e.key))})]}),Object(A.jsxs)(Xr,{children:[Object(A.jsxs)(Gr,{onClick:()=>I(e=>!e),children:[Object(A.jsx)(Qr,{children:z?"\u25bc":"\u25b6"}),Object(A.jsxs)(Zr,{children:["\ub313\uae00 (",p.length,")"]})]}),z&&(0===p.length?Object(A.jsx)(Pn,{children:"\ub313\uae00\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}):Object(A.jsx)(Cn,{children:$r(p).map(e=>{let{comment:t,replies:r}=e;return Object(A.jsxs)(Sn,{children:[Object(A.jsxs)(zn,{children:[Object(A.jsxs)(En,{children:[Object(A.jsx)(Nn,{children:t.author}),Object(A.jsx)(Fn,{children:_e(t.created)})]}),Object(A.jsx)(Rn,{dangerouslySetInnerHTML:{__html:J(t.bodyHtml)}})]}),r.length>0&&Object(A.jsx)(An,{children:r.map(e=>Object(A.jsxs)(In,{children:[Object(A.jsxs)(En,{children:[Object(A.jsxs)(Nn,{children:[e.author,e.replyToName&&Object(A.jsxs)(Tn,{children:["\u2192 ",e.replyToName]})]}),Object(A.jsx)(Fn,{children:_e(e.created)})]}),Object(A.jsx)(Rn,{dangerouslySetInnerHTML:{__html:J(e.bodyHtml)}})]},e.id))})]},t.id)})}))]}),h.length>0&&Object(A.jsxs)(Xr,{children:[Object(A.jsxs)(Zr,{children:["\uc5f0\uacb0\ub41c \uc5c5\ubb34 \ud56d\ubaa9 (",h.length,")"]}),Object(A.jsx)(cn,{children:h.map(e=>Object(A.jsxs)(ln,{onClick:()=>U(e.key),children:[Object(A.jsxs)(dn,{children:[Object(A.jsx)(tt,{type:rt(e.issueTypeName),size:18}),Object(A.jsx)(un,{children:e.key}),Object(A.jsx)(pn,{children:e.summary||"(\uc81c\ubaa9 \uc5c6\uc74c)"})]}),Object(A.jsxs)(mn,{children:[Object(A.jsx)(hn,{children:e.linkType}),Object(A.jsxs)(bn,{$color:De(e.statusName,e.statusCategory),onClick:t=>{t.stopPropagation(),D(e.key,e.statusName,t)},children:[e.statusName||"-",Object(A.jsx)(fn,{children:"\u25be"})]})]})]},e.key))})]}),f.length>0&&Object(A.jsxs)(Xr,{children:[Object(A.jsxs)(Zr,{children:["Confluence \ucf58\ud150\uce20 (",f.length,")"]}),f.map(e=>{const t=g.has(e.pageId),r=O.has(e.pageId),n=y[e.pageId];return Object(A.jsxs)(jn,{children:[Object(A.jsxs)(gn,{onClick:()=>Y(e),children:[Object(A.jsx)(xn,{children:t?"\u25bc":"\u25b6"}),Object(A.jsx)(yn,{children:"C"}),Object(A.jsx)(vn,{children:e.title}),e.lastUpdated&&Object(A.jsx)(On,{children:_e(e.lastUpdated)})]}),t&&Object(A.jsx)(kn,{children:r?Object(A.jsx)($n,{children:"\ubb38\uc11c \ub85c\ub529 \uc911..."}):n?Object(A.jsx)(wn,{dangerouslySetInnerHTML:{__html:n.body}}):null})]},e.pageId)})]})]}),F&&Object(A.jsx)(He,{target:F,transitions:R,isLoading:P,dropdownRef:L,onSelect:K,onClose:_})]})};const Ir=c.a.div`
  min-height: 100vh;
  background: ${Ae.subtle};
  zoom: 1.2;
`,Er=c.a.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: ${Ae.default};
  border-bottom: 1px solid ${Ie};
`,Nr=c.a.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid ${Ie};
  border-radius: 20px;
  color: ${Ee.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ${w};

  &:hover {
    background: ${Ae.hover};
    color: ${Ee.primary};
  }
`,Tr=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
`,Fr=c.a.span`
  color: ${Ee.muted};
  font-size: 0.8125rem;
  flex-shrink: 0;
`,Rr=c.a.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${Ie};
  border-radius: 20px;
  color: ${ke};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ${w};
  flex-shrink: 0;

  &:hover {
    background: ${we};
    border-color: ${ke};
  }
`,Pr=c.a.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${Ee.primary};
  background: ${Ae.subtle};
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
`,Lr=c.a.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`,Dr=c.a.div`
  padding: 1.5rem;
  background: ${Ae.default};
  border-radius: 3px;
  border: 1px solid ${Ie};
  margin-bottom: 1rem;
`,Kr=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`,_r=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Br=c.a.span`
  font-weight: 700;
  font-size: 1.125rem;
  color: ${ke};
`,Mr=c.a.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid ${Ie};
  border-radius: 50%;
  color: ${Ee.muted};
  cursor: pointer;
  transition: all 0.15s ${w};

  &:hover {
    background: ${we};
    border-color: ${ke};
    color: ${ke};
  }
`,Ur=c.a.h1`
  margin: 0.5rem 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${Ee.primary};
  line-height: 1.4;
`,Hr=c.a.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`,qr=c.a.span`
  display: inline-block;
  padding: 0.3rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 3px;
  background: ${e=>{let{$color:t}=e;return t||Ce.default}};
  color: white;
`,Yr=c.a.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${Ie};
`,Wr=c.a.div`
  font-size: 0.8125rem;
`,Jr=c.a.span`
  display: block;
  color: ${Ee.muted};
  margin-bottom: 0.25rem;
`,Vr=c.a.span`
  color: ${Ee.primary};
`,Xr=c.a.div`
  padding: 1.5rem;
  background: ${Ae.default};
  border-radius: 3px;
  border: 1px solid ${Ie};
  margin-bottom: 1rem;
`,Zr=c.a.h2`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${Ee.primary};
`,Gr=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;

  &:hover ${Zr} {
    color: ${ke};
  }

  ${Zr} {
    margin-bottom: 0;
  }
`,Qr=c.a.span`
  font-size: 0.7rem;
  color: ${Ee.muted};
  width: 1rem;
  flex-shrink: 0;
`,en=c.a.div`
  font-size: 0.875rem;
  color: ${Ee.primary};
  line-height: 1.6;

  p { margin: 0 0 0.5rem 0; }
  p:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 1rem 0 0.5rem 0;
    color: ${Ee.primary};
    line-height: 1.3;
  }
  h1 { font-size: 1.25rem; }
  h2 { font-size: 1.125rem; }
  h3 { font-size: 1rem; }
  h4, h5, h6 { font-size: 0.875rem; }
  h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  li { margin-bottom: 0.25rem; }

  a {
    color: ${ke};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  code {
    background: ${Ae.subtle};
    border: 1px solid ${Ie};
    border-radius: 3px;
    padding: 0.125rem 0.375rem;
    font-size: 0.8125rem;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  pre {
    background: #263238;
    color: #EEFFFF;
    border-radius: 3px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    overflow-x: auto;

    code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: 0.8125rem;
    }
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${ke};
    background: ${we};
    color: ${Ee.secondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${Ie};
    margin: 1rem 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${Ie};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
  }
  th {
    background: ${Ae.subtle};
    font-weight: 600;
  }

  img.adf-image {
    max-width: 100%;
    border-radius: 3px;
  }

  .adf-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .adf-panel-info { border-color: ${ke}; background: ${we}; }
  .adf-panel-note { border-color: ${Se.epic}; background: #EAE6FF; }
  .adf-panel-success { border-color: ${Ce.done}; background: #E3FCEF; }
  .adf-panel-warning { border-color: ${ze.medium}; background: #FFFAE6; }
  .adf-panel-error { border-color: ${Se.bug}; background: #FFEBE6; }

  .adf-status {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 3px;
    text-transform: uppercase;
    color: white;
  }
  .adf-status-blue { background: ${ke}; }
  .adf-status-green { background: ${Ce.done}; }
  .adf-status-yellow { background: ${ze.medium}; }
  .adf-status-red { background: ${Se.bug}; }
  .adf-status-neutral { background: ${Ce.default}; }
  .adf-status-purple { background: ${Se.epic}; }

  .adf-mention {
    color: ${ke};
    background: ${we};
    padding: 0.0625rem 0.25rem;
    border-radius: 3px;
    font-weight: 500;
  }

  .adf-media-placeholder {
    color: ${Ee.muted};
    font-style: italic;
  }

  details {
    margin: 0.5rem 0;
    border: 1px solid ${Ie};
    border-radius: 3px;

    summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      background: ${Ae.subtle};
      &:hover { background: ${Ae.hover}; }
    }

    > *:not(summary) {
      padding: 0 0.75rem;
    }
  }

  .confluence-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .confluence-panel-info { border-color: ${ke}; background: ${we}; }
  .confluence-panel-note { border-color: ${Se.epic}; background: #EAE6FF; }
  .confluence-panel-tip { border-color: ${Ce.done}; background: #E3FCEF; }
  .confluence-panel-warning { border-color: ${ze.medium}; background: #FFFAE6; }
`,tn=c.a.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`,rn=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: ${Ae.subtle};
  border: 1px solid ${Ie};
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s ${w};

  &:hover { background: ${Ae.hover}; }
`,nn=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
`,an=c.a.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${ke};
  flex-shrink: 0;
`,on=c.a.span`
  font-size: 0.8125rem;
  color: ${Ee.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,sn=c.a.div`
  flex-shrink: 0;
`,cn=c.a.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`,ln=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: ${Ae.subtle};
  border: 1px solid ${Ie};
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s ${w};

  &:hover {
    background: ${Ae.hover};
  }
`,dn=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
`,un=c.a.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${ke};
  flex-shrink: 0;
`,pn=c.a.span`
  font-size: 0.8125rem;
  color: ${Ee.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,mn=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`,hn=c.a.span`
  font-size: 0.6875rem;
  color: ${Ee.muted};
  border: 1px solid ${Ie};
  border-radius: 3px;
  padding: 0.125rem 0.375rem;
  white-space: nowrap;
`,bn=c.a.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 20px;
  background: ${e=>{let{$color:t}=e;return t||Ce.default}};
  color: white;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover { filter: brightness(0.9); }
`,fn=c.a.span`
  font-size: 0.625rem;
  line-height: 1;
  opacity: 0.8;
`,jn=c.a.div`
  border: 1px solid ${Ie};
  border-radius: 3px;
  overflow: hidden;

  & + & {
    margin-top: 0.5rem;
  }
`,gn=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: ${Ae.subtle};
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${w};

  &:hover {
    background: ${Ae.hover};
  }
`,xn=c.a.span`
  font-size: 0.65rem;
  color: ${Ee.muted};
  width: 0.875rem;
  flex-shrink: 0;
`,yn=c.a.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  background: #1868DB;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
`,vn=c.a.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${Ee.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`,On=c.a.span`
  font-size: 0.75rem;
  color: ${Ee.muted};
  flex-shrink: 0;
`,kn=c.a.div`
  border-top: 1px solid ${Ie};
  padding: 1rem;
  background: ${Ae.default};
`,$n=c.a.div`
  font-size: 0.8125rem;
  color: ${Ee.muted};
`,wn=Object(c.a)(en)`
  font-size: 0.8125rem;
  max-height: 400px;
  overflow-y: auto;
`,Cn=c.a.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`,Sn=c.a.div``,zn=c.a.div`
  padding: 0.75rem;
  background: ${Ae.subtle};
  border-radius: 3px;
  border: 1px solid ${Ie};
`,An=c.a.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-left: 1.5rem;
  padding-left: 0.75rem;
  border-left: 2px solid ${Ie};
`,In=c.a.div`
  padding: 0.625rem 0.75rem;
  background: ${Ae.default};
  border-radius: 3px;
  border: 1px solid ${Ie};
`,En=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`,Nn=c.a.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${Ee.primary};
`,Tn=c.a.span`
  font-weight: 400;
  font-size: 0.75rem;
  color: ${Ee.muted};
`,Fn=c.a.span`
  font-size: 0.75rem;
  color: ${Ee.muted};
  flex-shrink: 0;
`,Rn=Object(c.a)(en)`
  font-size: 0.8125rem;
`,Pn=c.a.div`
  font-size: 0.8125rem;
  color: ${Ee.muted};
  margin-top: 1rem;
`,Ln=c.a.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${Ee.secondary};
`,Dn=c.a.div`
  padding: 2rem;
  text-align: center;
  color: #E5493A;
`,Kn=c.a.div`
  min-height: 100vh;
  background: ${d};
`;var _n=()=>{const{path:e}=Object(s.k)();return Object(A.jsxs)(Kn,{children:[Object(A.jsx)(Oe.a,{children:Object(A.jsx)("title",{children:"Jira - Workspace"})}),Object(A.jsxs)(s.e,{children:[Object(A.jsx)(s.c,{path:`${e}${e.endsWith("/jira")?"":"/jira"}/issue/:issueKey`,component:Ar}),Object(A.jsx)(s.c,{path:`${e}/issue/:issueKey`,component:Ar}),Object(A.jsx)(s.c,{path:e,component:ct,exact:!0})]})]})},Bn=r(46);const Mn=[],Un=async function(e,t){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"INFO";if(0!==Mn.length){const e=Mn.shift();clearTimeout(e)}e(Wn()),await window.setTimeout(function(){e(Yn({text:t,type:r}));const n=window.setTimeout(function(){e(Wn())},4e3);Mn.push(n)},50)},Hn="snackbar/APPEND_SNACKBAR",qn="snackbar/DELETE_SNACKBAR",Yn=e=>({type:Hn,payload:e}),Wn=()=>({type:qn});var Jn=r(12);var Vn={text:"",type:"INFO"};const Xn=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:Vn,t=arguments.length>1?arguments[1]:void 0;switch(t.type){case Hn:return Object(Jn.a)(e,e=>{e.text=t.payload.text,t.payload.type&&(e.type=t.payload.type)});case qn:return Object(Jn.a)(e,e=>{e.text="",e.type="INFO"});default:return e}},Zn=Object(n.createContext)({state:Vn,dispatch:()=>null});var Gn=e=>{let{children:t}=e;const[r,i]=Object(n.useReducer)(Xn,Vn),a={state:r,dispatch:i};return Object(A.jsx)(Zn.Provider,{value:a,children:t})};const Qn=c.a.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
`,ei=c.a.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${g};
`,ti=c.a.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${v};
  border-radius: 4px;
  font-size: 0.875rem;
  background: ${d};

  &:focus {
    outline: none;
    border-color: ${O};
  }
`,ri=c.a.button`
  padding: 0.5rem 1rem;
  background: ${b};
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${w};

  &:hover {
    background: ${f};
  }

  &:disabled {
    background: ${y};
    cursor: not-allowed;
  }
`,ni=c.a.div`
  position: relative;
`,ii=c.a.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${v};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${d};
  text-align: left;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${O};
  }
`,ai=c.a.span`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,oi=c.a.svg`
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  color: ${y};
  transition: transform 0.15s ease;
  transform: rotate(${e=>{let{$open:t}=e;return t?"180deg":"0deg"}});
`,si=c.a.span`
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`,ci=c.a.ul`
  display: ${e=>{let{$open:t}=e;return t?"block":"none"}};
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0.25rem 0 0 0;
  padding: 0.25rem 0;
  list-style: none;
  background: ${d};
  border: 1px solid ${v};
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
`,li=c.a.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;

  &:hover {
    background: ${m};
  }
`;var di=e=>{var t;let{onSuccess:r,editAccount:a}=e;const o=!!a,{dispatch:s}=i.a.useContext(Zn),[c,l]=Object(n.useState)([]),[d,u]=Object(n.useState)((null===a||void 0===a?void 0:a.serviceType)||"jira"),[p,m]=Object(n.useState)(!1),h=i.a.useRef(null);i.a.useEffect(()=>{const e=e=>{h.current&&!h.current.contains(e.target)&&m(!1)};return document.addEventListener("click",e),()=>document.removeEventListener("click",e)},[]);const b=null===a||void 0===a?void 0:a.credentials,[f,j]=Object(n.useState)((null===a||void 0===a?void 0:a.displayName)||""),[g,x]=Object(n.useState)((null===b||void 0===b?void 0:b.baseUrl)||""),[y,v]=Object(n.useState)((null===b||void 0===b?void 0:b.email)||""),[O,k]=Object(n.useState)(""),[$,w]=Object(n.useState)(!1),[C,I]=Object(n.useState)(!1);i.a.useEffect(()=>{_().then(l)},[]);const E=c.find(e=>e.type===d);return Object(A.jsxs)(Qn,{onSubmit:async e=>{if(e.preventDefault(),f.trim())if("jira"!==d||g.trim()&&y.trim()&&(o||O.trim())){w(!0);try{const e={baseUrl:g.trim().replace(/\/$/,""),email:y.trim(),apiToken:O.trim()||(null===b||void 0===b?void 0:b.apiToken)||""};if(O.trim()||!o){if(!await B(d,e))return Un(s,"\uc5f0\uacb0 \uc2e4\ud328. URL, \uc774\uba54\uc77c, API \ud1a0\ud070\uc744 \ud655\uc778\ud574\uc8fc\uc138\uc694.","ERROR"),void w(!1)}if(o&&a)await P(a.id,{serviceType:d,displayName:f.trim(),credentials:e}),Un(s,"\uacc4\uc815\uc774 \uc218\uc815\ub418\uc5c8\uc2b5\ub2c8\ub2e4.","SUCCESS");else{const t={serviceType:d,displayName:f.trim(),credentials:e};await R(t),Un(s,"\uacc4\uc815\uc774 \ucd94\uac00\ub418\uc5c8\uc2b5\ub2c8\ub2e4.","SUCCESS")}r()}catch(t){Un(s,o?"\uacc4\uc815 \uc218\uc815\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.":"\uacc4\uc815 \ucd94\uac00\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.","ERROR"),console.error(t)}finally{w(!1)}}else Un(s,"\ubaa8\ub4e0 \ud544\ub4dc\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.","WARNING");else Un(s,"\ud45c\uc2dc \uc774\ub984\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.","WARNING")},children:[Object(A.jsxs)(ei,{children:["\uc11c\ube44\uc2a4",Object(A.jsxs)(ni,{ref:h,children:[Object(A.jsxs)(ii,{type:"button",onClick:()=>!o&&m(!p),style:o?{opacity:.6,cursor:"default"}:void 0,children:[Object(A.jsxs)(ai,{children:[z(d)?Object(A.jsx)(si,{children:S(d,20)}):null,null!==(t=null===E||void 0===E?void 0:E.displayName)&&void 0!==t?t:d]}),Object(A.jsx)(oi,{$open:p,viewBox:"0 0 12 12",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:Object(A.jsx)("polyline",{points:"2,4 6,8 10,4"})})]}),Object(A.jsx)(ci,{$open:p,children:c.map(e=>Object(A.jsxs)(li,{onMouseDown:t=>{t.preventDefault(),u(e.type),m(!1)},children:[z(e.type)?Object(A.jsx)(si,{children:S(e.type,20)}):null,e.displayName]},e.type))})]})]}),Object(A.jsxs)(ei,{children:["\ud45c\uc2dc \uc774\ub984",Object(A.jsx)(ti,{type:"text",placeholder:"\uc608: \ud68c\uc0ac Jira",value:f,onChange:e=>j(e.target.value)})]}),"jira"===d&&Object(A.jsxs)(A.Fragment,{children:[Object(A.jsxs)(ei,{children:["Jira URL",Object(A.jsx)(ti,{type:"url",placeholder:"https://your-domain.atlassian.net",value:g,onChange:e=>x(e.target.value)})]}),Object(A.jsxs)(ei,{children:["\uc774\uba54\uc77c",Object(A.jsx)(ti,{type:"email",placeholder:"your@email.com",value:y,onChange:e=>v(e.target.value)})]}),Object(A.jsxs)(ei,{children:["API \ud1a0\ud070",Object(A.jsx)(ti,{type:"password",placeholder:o?"\ubcc0\uacbd \uc2dc\uc5d0\ub9cc \uc785\ub825":"Atlassian API \ud1a0\ud070",value:O,onChange:e=>k(e.target.value)})]})]}),Object(A.jsxs)("div",{style:{display:"flex",gap:"0.5rem"},children:[Object(A.jsx)(ri,{type:"submit",disabled:$,children:$?o?"\uc218\uc815 \uc911...":"\ucd94\uac00 \uc911...":o?"\uc218\uc815":"\ucd94\uac00"}),"jira"===d&&Object(A.jsx)(ri,{type:"button",onClick:async()=>{if("jira"===d&&g.trim()&&y.trim()&&O.trim()){I(!0);try{const e={baseUrl:g.trim().replace(/\/$/,""),email:y.trim(),apiToken:O.trim()},t=await B(d,e);Un(s,t?"\uc5f0\uacb0 \ud655\uc778\ub418\uc5c8\uc2b5\ub2c8\ub2e4.":"\uc5f0\uacb0 \uc2e4\ud328. \uc815\ubcf4\ub97c \ud655\uc778\ud574\uc8fc\uc138\uc694.",t?"SUCCESS":"ERROR")}catch(e){Un(s,"\uc5f0\uacb0 \ud655\uc778\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.","ERROR"),console.error(e)}finally{I(!1)}}else Un(s,"\ubaa8\ub4e0 \ud544\ub4dc\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.","WARNING")},disabled:C,children:C?"\ud655\uc778 \uc911...":"\uc5f0\uacb0 \ud655\uc778"})]})]})};const ui=c.a.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
`,pi=c.a.li`
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
  background: ${e=>{let{$active:t}=e;return t?m:u}};
  border: 1px solid ${e=>{let{$active:t}=e;return t?b:v}};
  border-radius: 8px;
`,mi=c.a.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`,hi=c.a.span`
  font-weight: 600;
  color: ${g};
`,bi=c.a.span`
  font-size: 0.75rem;
  color: ${x};
`,fi=c.a.div`
  display: flex;
  gap: 0.5rem;
`,ji=c.a.button`
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ${w};

  ${e=>{let{$variant:t}=e;return"danger"===t?`\n    background: #fef2f2;\n    color: ${k};\n    &:hover { background: #fee2e2; }\n  `:`\n    background: ${m};\n    color: ${b};\n    &:hover { background: ${h}; }\n  `}}
`,gi=c.a.p`
  color: ${x};
  padding: 2rem;
  text-align: center;
`,xi=c.a.span`
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.5rem;
  vertical-align: middle;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`;var yi=e=>{let{onEdit:t}=e;const{accounts:r,activeAccount:n,refresh:a,setActive:o}=H(),{dispatch:s}=i.a.useContext(Zn);return 0===r.length?Object(A.jsx)(gi,{children:"\ub4f1\ub85d\ub41c \uacc4\uc815\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}):Object(A.jsx)(ui,{children:r.map(e=>Object(A.jsxs)(pi,{$active:(null===n||void 0===n?void 0:n.id)===e.id,children:[Object(A.jsxs)(mi,{children:[Object(A.jsx)(hi,{children:z(e.serviceType)?Object(A.jsxs)(A.Fragment,{children:[Object(A.jsx)(xi,{children:S(e.serviceType,20)}),e.displayName]}):e.displayName}),Object(A.jsxs)(bi,{children:[e.serviceType,"baseUrl"in e.credentials&&` \xb7 ${e.credentials.baseUrl}`]})]}),Object(A.jsxs)(fi,{children:[(null===n||void 0===n?void 0:n.id)!==e.id&&Object(A.jsx)(ji,{onClick:()=>(async e=>{try{await o(e),Un(s,"\ud65c\uc131 \uacc4\uc815\uc774 \ubcc0\uacbd\ub418\uc5c8\uc2b5\ub2c8\ub2e4.","SUCCESS")}catch(t){Un(s,"\ud65c\uc131 \uacc4\uc815 \ubcc0\uacbd\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.","ERROR")}})(e.id),children:"\ud65c\uc131\ud654"}),t&&Object(A.jsx)(ji,{onClick:()=>t(e),children:"\uc218\uc815"}),Object(A.jsx)(ji,{$variant:"danger",onClick:()=>(async e=>{if(window.confirm(`"${e.displayName}" \uacc4\uc815\uc744 \uc0ad\uc81c\ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?`))try{await L(e.id),Un(s,"\uacc4\uc815\uc774 \uc0ad\uc81c\ub418\uc5c8\uc2b5\ub2c8\ub2e4.","SUCCESS"),a()}catch(t){Un(s,"\uacc4\uc815 \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.","ERROR")}})(e),children:"\uc0ad\uc81c"})]})]},e.id))})};var vi=()=>{const e=Object(s.h)(),{refresh:t}=H(),r="undefined"!==typeof window&&!!window.workspaceAPI,[i,a]=Object(n.useState)(null),[o,c]=Object(n.useState)(void 0),l=()=>{a(null),c(void 0)};return Object(A.jsxs)(Oi,{children:[Object(A.jsx)(Oe.a,{children:Object(A.jsx)("title",{children:"\uacc4\uc815 \uc124\uc815 - Workspace"})}),Object(A.jsxs)(ki,{children:[Object(A.jsxs)($i,{children:[Object(A.jsxs)(wi,{children:[Object(A.jsx)(Ci,{onClick:()=>e.push("/jira"),children:Object(A.jsx)(Bn.a,{size:18})}),Object(A.jsx)(Si,{children:"\uacc4\uc815 \uc124\uc815"})]}),r&&Object(A.jsx)(zi,{onClick:()=>a("add"),children:"+ \uacc4\uc815 \ucd94\uac00"})]}),!r&&Object(A.jsx)(Ai,{children:"\uacc4\uc815 \uad00\ub9ac\ub294 Electron \ub370\uc2a4\ud06c\ud1b1 \uc571\uc5d0\uc11c\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. pnpm electron:dev \ub85c \uc2e4\ud589\ud574\uc8fc\uc138\uc694."}),Object(A.jsx)(yi,{onEdit:r?e=>{c(e),a("edit")}:void 0})]}),i&&Object(A.jsx)(Ii,{onClick:l,children:Object(A.jsxs)(Ei,{onClick:e=>e.stopPropagation(),children:[Object(A.jsxs)(Ni,{children:[Object(A.jsx)(Ti,{children:"edit"===i?"\uacc4\uc815 \uc218\uc815":"\uacc4\uc815 \ucd94\uac00"}),Object(A.jsx)(Fi,{onClick:l,children:"\xd7"})]}),Object(A.jsx)(di,{onSuccess:()=>{t(),a(null),c(void 0)},editAccount:"edit"===i?o:void 0},(null===o||void 0===o?void 0:o.id)||"new")]})})]})};const Oi=c.a.div`
  width: 100%;
  min-height: 100vh;
  background: ${d};
  display: flex;
  flex-direction: column;
  align-items: center;
  zoom: 1.2;
`,ki=c.a.main`
  width: 100%;
  max-width: 600px;
  padding: 2rem;
  box-sizing: border-box;
`,$i=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`,wi=c.a.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Ci=c.a.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid ${v};
  border-radius: 50%;
  background: ${u};
  color: ${x};
  cursor: pointer;
  transition: all 0.15s ${w};

  &:hover {
    border-color: ${b};
    color: ${b};
    background: ${m};
  }
`,Si=c.a.h1`
  margin: 0;
  font-size: 1.5rem;
  color: ${g};
`,zi=c.a.button`
  padding: 0.4rem 0.875rem;
  background: ${b};
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ${w};

  &:hover {
    background: ${f};
  }
`,Ai=c.a.p`
  padding: 1rem;
  background: ${m};
  border: 1px solid ${h};
  border-radius: 8px;
  color: ${j};
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
`,Ii=c.a.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
`,Ei=c.a.div`
  width: 100%;
  max-width: 460px;
  background: ${d};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
`,Ni=c.a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${v};
`,Ti=c.a.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${g};
`,Fi=c.a.button`
  background: none;
  border: none;
  font-size: 1.375rem;
  color: ${y};
  cursor: pointer;
  line-height: 1;
  padding: 0;

  &:hover {
    color: ${g};
  }
`;var Ri={gray0:"#f7f6f3",gray1:"#eeeceb",gray2:"#dedddb",gray3:"#cbc5c2",gray4:"#bab1ad",gray5:"#8c8582",gray6:"#5d5957",gray7:"#2f2c2b",gray8:"#1c1b1a",red0:"#fcebec",red1:"#f6cdd1",red2:"#ee9aa2",red3:"#e56874",red4:"#dc3545",red5:"#bb2d3b",red6:"#9a2530",red7:"#6e1b23",red8:"#58151c",orange0:"#fff5e6",orange1:"#ffe5bf",orange2:"#ffcc80",orange3:"#ffb240",orange4:"#ff9800",orange5:"#d98100",orange6:"#b36a00",orange7:"#804c00",orange8:"#663d00",yellow0:"#fff9e6",yellow1:"#fff0c1",yellow2:"#ffe083",yellow3:"#ffd145",yellow4:"#ffc107",yellow5:"#bf9105",yellow6:"#806104",yellow7:"#403002",yellow8:"#261d01",teal0:"#e7f8f3",teal1:"#c4ede1",teal2:"#89dcc3",teal3:"#4dcaa4",teal4:"#12b886",teal5:"#33a880",teal6:"#0d815e",teal7:"#095c43",teal8:"#074a36",blue0:"#e6f2ff",blue1:"#bfdeff",blue2:"#80bdff",blue3:"#409cff",blue4:"#007bff",blue5:"#005cbf",blue6:"#003e80",blue7:"#001f40",blue8:"#001226"};const Pi=c.a.div`
	position: relative;
	width: 100%;
	margin-top: 40vh;
	font-size: 3rem;
	color: #444;
	font-weight: 600;
	text-align: center;
`,Li=c.a.button`
	position: relative;
	display: block;
	width: 100px;
	height: 30px;
	font-size: 0.8rem;
	line-height: 26px;
	margin: 15px auto;
	border-radius: 20px;
	border: 1px solid ${Ri.gray4};
	text-align: center;
	cursor: pointer;
	transition: .2s ${w};
	${$}

	&:hover,
	&:active {
		background-color: ${Ri.gray7};
		color: white;
	}
`;var Di=function(){return Object(A.jsxs)(A.Fragment,{children:[Object(A.jsx)(Oe.a,{children:Object(A.jsx)("title",{children:"APP-NAME - 404"})}),Object(A.jsx)(Pi,{children:"404 Not Found."}),Object(A.jsx)(l.b,{to:"/",children:Object(A.jsx)(Li,{children:"Back"})})]})};var Ki={modalList:[]};const _i="modal/PUSH_MODAL",Bi="modal/POP_MODAL",Mi="modal/DELETE_MODAL",Ui="modal/CLEAR_MODAL",Hi=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:Ki,t=arguments.length>1?arguments[1]:void 0;switch(t.type){case _i:return Object(Jn.a)(e,e=>{e.modalList.push(t.payload)});case Bi:return Object(Jn.a)(e,e=>{const t=e.modalList.length-1;t>=0&&e.modalList.splice(t,1)});case Mi:return Object(Jn.a)(e,e=>{e.modalList=e.modalList.filter(e=>e.id!==t.payload)});case Ui:return Object(Jn.a)(e,e=>{e.modalList=[]});default:return e}},qi=Object(n.createContext)({state:Ki,dispatch:()=>null});var Yi=e=>{let{children:t}=e;const[r,i]=Object(n.useReducer)(Hi,Ki),a={state:r,dispatch:i};return Object(A.jsx)(qi.Provider,{value:a,children:t})};const Wi=e=>`\n\t${e}\n`;var Ji={modal:Wi(100),snackbar:Wi(400),tooltip:Wi(500)};var Vi={fadeIn:c.b`
	0% { opacity: 0; }
	100% { opacity: 1;}
`,fadeOut:c.b`
	0% { opacity: 1; }
	100% { opacity: 0; }
`,fadeInTop:c.b`
	0% { opacity: 0; transform: translateY(-40px); }
	100% { opacity: 1; transform: translateY(0); }
`,fadeOutTop:c.b`
	0% { opacity: 1; transform: translateY(0); }
	100% { opacity: 0; transform: translateY(-40px); }
`,fadeInBottom:c.b`
	0% { opacity: 0; transform: translateY(40px); }
	100% { opacity: 1; transform: translateY(0); }
`,fadeOutBottom:c.b`
	0% { opacity: 1; transform: translateY(0); }
	100% { opacity: 0; transform: translateY(40px); }
`,fadeInLeft:c.b`
	0% { opacity: 0; transform: translateX(-40px); }
	100% { opacity: 1; transform: translateX(0); }
`,fadeOutLeft:c.b`
	0% { opacity: 1; transform: translateX(0); }
	100% { opacity: 0; transform: translateX(-40px); }
`,fadeInRight:c.b`
	0% { opacity: 0; transform: translateX(40px); }
	100% { opacity: 1; transform: translateX(0); }
`,fadeOutRight:c.b`
	0% { opacity: 1; transform: translateX(0); }
	100% { opacity: 0; transform: translateX(40px); }
`,zoomIn:c.b`
	0% { opacity: 0; transform: scale(.5, .5); }
	100% { opacity: 1; transform: scale(1, 1); }
`,zoomOut:c.b`
	0% { opacity: 1; transform: scale(1, 1); }
	100% { opacity: 0; transform: scale(.5, .5); }
`,tooltip:c.b`
	0% { opacity: 0; }
	40% { opacity: 0; }
	50% { opacity: 1; } 
	100% { opacity: 1; }
`,pulse:c.b`
	0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
	70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
	100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
`};const Xi=c.a.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: rgba(249, 249, 249, 0.85);	// Set background color
	z-index: ${Ji.modal};
	animation: ${Vi.fadeIn} .2s;
`;var Zi=()=>{const{state:e,dispatch:t}=Object(n.useContext)(qi),r=e.modalList,i=0!==r.length,a=e=>e.stopPropagation(),o=e=>{t((e=>({type:Mi,payload:e}))(e))},s=r.map(e=>{const t=e.elem;return Object(A.jsx)(t,{PreventModalOff:a,ModalOff:()=>o(e.id),args:e.args},e.id)});return Object(n.useEffect)(()=>{const e=document.querySelector("body");i?e&&(e.style.overflow="hidden"):e&&e.removeAttribute("style")},[i]),Object(A.jsx)(A.Fragment,{children:i&&Object(A.jsx)(Xi,{onMouseDown:()=>t({type:Bi}),children:s})})};const Gi=e=>`\n\t@media (max-width: ${e}px)\n`,Qi=1440,ea=1200,ta=702,ra=350;var na={xlarge:Gi(1600),large:Gi(Qi),medium:Gi(ea),small:Gi(ta),xsmall:Gi(ra),custom:Gi};const ia=c.a.div`
	position: relative;
	width: 320px;
	height: auto;
	max-height: 800px;
	background-color: ${e=>"SUCCESS"===e.type?Ri.teal5:"WARNING"===e.type?Ri.red4:"ERROR"===e.type?Ri.orange4:"INFO"===e.type?Ri.blue4:Ri.gray4};
	box-shadow: ${"0px 8px 12px rgba(0, 0, 0, 0.2)"};
	border-radius: 4px;
	animation: ${Vi.fadeInBottom} .4s cubic-bezier(0.25,0.1,0.25,1),
						 ${Vi.fadeOutBottom} .5s cubic-bezier(0.25,0.1,0.25,1) 3.6s;
	cursor: pointer;
	transition: .2s ${w};
	${$};

	&:active {
		transform: scale(.97, .97);
	}

	${na.small} {
		border-radius: 0px;
		width: 100%;
		min-height: 1.8rem;
	}
`,aa=c.a.div`
	position: relative;
	display: flex;
	width: 100%;
	height: auto;
	min-height: 2rem;
	box-sizing: border-box;
	padding: 12px 20px;

	${na.small} {
		min-height: 1.6rem;
		line-height: 1.6rem;
	}
`,oa=c.a.div`
	position: relative;
	flex-grow: 1;
	color: white;
	font-size: 14px;
	font-weight: 400;
	white-space: pre-wrap;
	word-break: keep-all;
	vertical-align: top;
`;var sa=e=>{let{onClick:t,text:r,type:n}=e;return Object(A.jsx)(ia,{onClick:t,type:n,children:Object(A.jsx)(aa,{children:Object(A.jsx)(oa,{children:r})})})};const ca=c.a.div`
	position: fixed;
	top: 40px;
	right: 30px;
	width: 320px;
	height: auto;
	z-index: ${Ji.snackbar};

	${na.small} {
		width: 100%;
		top: initial;
		bottom: 0;
		left: 0;
		right: 0;
		margin: auto;
	}
`;var la=()=>{const{state:e,dispatch:t}=Object(n.useContext)(Zn);return Object(A.jsx)(ca,{children:""!==e.text&&Object(A.jsx)(sa,{onClick:e=>{e&&(e.preventDefault(),e.stopPropagation()),t(Wn())},text:e.text,type:e.type})})};const da={jira:_n,settings:vi},ua={jira:"/jira",settings:"/settings"},pa=()=>Object(A.jsxs)(s.e,{children:[Object(A.jsx)(s.b,{from:"/",to:"/jira",exact:!0}),Object(A.jsx)(s.c,{path:"/jira",component:_n}),Object(A.jsx)(s.c,{path:"/settings",component:vi,exact:!0}),Object(A.jsx)(s.c,{path:"*",component:Di})]}),ma=e=>{let{menuId:t}=e;const r=da[t];if(!r)return null;const n=ua[t]||"/";return Object(A.jsx)(s.a,{initialEntries:[n],children:Object(A.jsxs)(s.e,{children:[Object(A.jsx)(s.c,{path:n,component:r}),Object(A.jsx)(s.c,{path:"/",component:r})]})})};var ha=()=>{const{isSplit:e,leftPanel:t,rightPanel:r}=E();return Object(A.jsxs)(ba,{children:[Object(A.jsx)(W,{}),e&&t&&r?Object(A.jsxs)(fa,{children:[Object(A.jsx)(ja,{children:Object(A.jsx)(ma,{menuId:t})}),Object(A.jsx)(ga,{}),Object(A.jsx)(ja,{children:Object(A.jsx)(ma,{menuId:r})})]}):Object(A.jsx)(pa,{}),Object(A.jsx)(Zi,{}),Object(A.jsx)(la,{})]})};const ba=c.a.div`
  min-height: 100vh;
  background: ${d};
  display: flex;
  flex-direction: column;
`,fa=c.a.div`
  display: flex;
  flex: 1;
  min-height: 0;
`,ja=c.a.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
`,ga=c.a.div`
  width: 2px;
  background: ${v};
  flex-shrink: 0;
`;var xa=e=>{let{onFinish:t}=e;const[r,i]=Object(n.useState)(!1);Object(n.useEffect)(()=>{const e=setTimeout(()=>i(!0),1200);return()=>clearTimeout(e)},[]);return Object(A.jsx)(ka,{$fadeOut:r,onAnimationEnd:()=>{r&&t()},children:Object(A.jsxs)($a,{children:[Object(A.jsx)(wa,{children:"Lyra"}),Object(A.jsx)(Ca,{children:"Workspace"}),Object(A.jsx)(Sa,{})]})})};const ya=c.b`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`,va=c.b`
  from { opacity: 1; }
  to   { opacity: 0; }
`,Oa=c.b`
  to { transform: rotate(360deg); }
`,ka=c.a.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${d};
  animation: ${e=>{let{$fadeOut:t}=e;return t?va:"none"}} 0.4s ease forwards;
`,$a=c.a.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  animation: ${ya} 0.5s ease both;
`,wa=c.a.h1`
  margin: 0;
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${b};
`,Ca=c.a.span`
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: ${y};
`,Sa=c.a.div`
  margin-top: 1.5rem;
  width: 20px;
  height: 20px;
  border: 2px solid ${v};
  border-top-color: ${b};
  border-radius: 50%;
  animation: ${Oa} 0.8s linear infinite;
`;var za=()=>{const[e,t]=Object(n.useState)(!0);return Object(A.jsxs)(A.Fragment,{children:[e&&Object(A.jsx)(xa,{onFinish:()=>t(!1)}),Object(A.jsx)(s.e,{children:Object(A.jsx)(s.c,{path:"/",component:ha})})]})};Boolean("0.0.0.0"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));var Aa=e=>{let{children:t}=e;const r=(n=[q,N,Yi,Gn],e=>{let{children:t}=e;return n.reduce((e,t)=>{if(Array.isArray(t)){const[r,n]=t;return Object(A.jsx)(r,{...n,children:e})}return Object(A.jsx)(t,{children:e})},t)});var n;return Object(A.jsx)(r,{children:t})};o.a.render(Object(A.jsx)(n.StrictMode,{children:Object(A.jsx)(l.a,{children:Object(A.jsx)(Aa,{children:Object(A.jsx)(Oe.b,{children:Object(A.jsx)(za,{})})})})}),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(e=>{e.unregister()}).catch(e=>{console.error(e.message)})}},[[40,1,2]]]);
//# sourceMappingURL=main.4a2d14ec.chunk.js.map