import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import"./hoist-non-react-statics.cjs-y9ytJ0rQ.js";import{a as n,g as r,i,m as a,o,t as s}from"./jsx-runtime-CLmotcMK.js";import{c,l,o as u,u as d}from"./index-DlQa474I.js";import{t as f}from"./confluenceTheme-BQt0q3kv.js";import{a as p,i as m,r as h,t as ee}from"./external-link-s-dDyJXs.js";var g=e(t()),_=`https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js`,v=null;function y(){return window.mermaid}function b(){return v||(y()?(v=Promise.resolve(),v):(v=new Promise((e,t)=>{let n=document.createElement(`script`);n.src=_,n.async=!0,n.onload=()=>{let n=y();n?(n.initialize({startOnLoad:!1,theme:`default`,securityLevel:`loose`}),e()):t(Error(`mermaid not found after script load`))},n.onerror=()=>t(Error(`Failed to load mermaid script`)),document.head.appendChild(n)}),v))}async function te(e,t){let n=e.querySelectorAll(`.confluence-mermaid[data-mermaid]:not(.confluence-mermaid-rendered)`);if(n.length===0)return;await b();let r=y();if(r)for(let e=0;e<n.length;e++){let i=n[e],a=i.getAttribute(`data-mermaid`)||``;if(a)try{let n=`mermaid-${t}-${e}-${Date.now()}`,{svg:o}=await r.render(n,a);i.innerHTML=o,i.classList.add(`confluence-mermaid-rendered`)}catch(e){console.warn(`[mermaidLoader] render failed:`,e),i.innerHTML=`<pre style="white-space:pre-wrap;font-size:0.8rem;color:#666;">${i.textContent||a}</pre>`,i.classList.add(`confluence-mermaid-rendered`)}}}function x(e){let t=e.match(/[?&]selectedIssue=([A-Z][A-Z0-9_]+-\d+)/);if(t)return t[1];let n=e.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)/);return n?n[1]:null}function S(e){return/atlassian\.net\/.*jira/i.test(e)||/atlassian\.net\/browse\//i.test(e)||/\/jira\//i.test(e)}function ne(e){let t=new Set,n=/<a\s[^>]*href="([^"]*)"[^>]*>/gi,r;for(;(r=n.exec(e))!==null;){let e=r[1];if(!S(e))continue;let n=x(e);n&&t.add(n)}let i=/data-jira-key="([A-Z][A-Z0-9_]+-\d+)"/gi;for(;(r=i.exec(e))!==null;)t.add(r[1]);return Array.from(t)}function re(e,t){return Object.keys(t).length===0?e:e.replace(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi,(e,n,r)=>{let i=null,a=n.match(/data-jira-key="([A-Z][A-Z0-9_]+-\d+)"/i);if(a&&(i=a[1]),!i){let e=n.match(/href="([^"]*)"/i);e&&S(e[1])&&(i=x(e[1]))}if(!i)return e;let o=t[i];if(!o)return e;let{bg:s,color:c}=C(o.statusName,o.statusCategory);return`<a ${n} class="jira-rich-link"><span class="jira-rich-link-inner"><span class="jira-rich-link-key">${w(o.key)}</span><span class="jira-rich-link-summary">${w(o.summary)}</span><span class="jira-rich-link-status" style="background:${s};color:${c}">${w(o.statusName)}</span></span></a>`})}function C(e,t){let n=t.toLowerCase(),r=e.toLowerCase();return n===`done`||r.includes(`done`)||r.includes(`완료`)||r.includes(`closed`)||r.includes(`resolved`)?{bg:`#E3FCEF`,color:`#006644`}:n===`indeterminate`||n===`in progress`||r.includes(`progress`)||r.includes(`진행`)||r.includes(`review`)||r.includes(`검토`)?{bg:`#DEEBFF`,color:`#0747A6`}:{bg:`#DFE1E6`,color:`#42526E`}}function w(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}var T=s();function E(e){return typeof e==`string`?e:``}function D(e){return e&&typeof e==`object`&&!Array.isArray(e)?e:null}function O(e){if(!e)return`-`;try{return new Date(e).toLocaleString(`ko-KR`)}catch{return e}}function ie(e){let t=E(e.id),n=E(e.title),r=m(E(D(D(e.body)?.storage)?.value)),i=D(e.space),a=E(i?.key),o=E(i?.name),s=D(e.version),c=typeof s?.number==`number`?s.number:1,l=E(s?.when),u=D(e.history),d=D(u?.createdBy);return{id:t,title:n,bodyHtml:r,spaceKey:a,spaceName:o,authorName:E(d?.displayName)||E(d?.publicName)||``,createdAt:E(u?.createdDate),updatedAt:l,version:c,ancestors:(Array.isArray(e.ancestors)?e.ancestors:[]).map(e=>{let t=e;return{id:E(t.id),title:E(t.title)}}).filter(e=>e.id&&e.title)}}function ae(e){let t=E(e.id),n=D(e.history),r=D(n?.createdBy),i=E(r?.displayName)||E(r?.publicName)||``,a=E(n?.createdDate)||E(e.created)||``;return{id:t,author:i,bodyHtml:m(E(D(D(e.body)?.storage)?.value)),created:a}}function oe(e){let t=e;for(;t;)t.scrollTop>0&&(t.scrollTop=0),t=t.parentElement;window.scrollTo(0,0)}var k=()=>{let{pageId:e}=r(),t=a(),{activeAccount:n}=u(),i=n?.metadata?.userDisplayName,{addTab:o}=d(),s=(0,g.useRef)(null),[f,m]=(0,g.useState)(null),[_,v]=(0,g.useState)([]),[y,b]=(0,g.useState)(!1),[x,S]=(0,g.useState)(!0),[C,w]=(0,g.useState)(null),[k,U]=(0,g.useState)({}),[W,Oe]=(0,g.useState)({}),[G,K]=(0,g.useState)(null),q=h();(0,g.useEffect)(()=>{if(!G)return;let e=e=>{e.key===`Escape`&&K(null)};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[G]);let J=(0,g.useCallback)(()=>t.push(`/confluence`),[t]),ke=(0,g.useCallback)(e=>{t.push(`/confluence/page/${e}`)},[t]),Y=(0,g.useCallback)(()=>{J()},[J]),X=(0,g.useCallback)(e=>{let t=e.target;if(t.tagName===`IMG`){let n=t.src;if(n){e.preventDefault(),e.stopPropagation(),K(n);return}}let r=t.closest(`a`);if(!r)return;let i=r.getAttribute(`data-confluence-page-title`);if(i&&n){e.preventDefault(),e.stopPropagation();let t=r.textContent?.trim()||i,a=r.getAttribute(`data-confluence-space-key`)||f?.spaceKey||``,s=a?[a]:void 0;c.invoke({accountId:n.id,serviceType:`confluence`,action:`searchPages`,params:{query:i,searchField:`title`,limit:5,spaceKeys:s}}).then(e=>{let a=e.results??[];if(a.length>0){let e=E((a.find(e=>E(e.title)===i)||a[0]).id);if(e){o(`confluence`,`/confluence/page/${e}`,t);return}}let s=n.credentials.baseUrl?.replace(/\/$/,``)||``,c=r.getAttribute(`data-confluence-space-key`)||``;if(s){let e=c?`${s}/wiki/spaces/${c}/pages?title=${encodeURIComponent(i)}`:`${s}/wiki/search?text=${encodeURIComponent(i)}`,t=window.electronAPI;t?.openExternal?t.openExternal(e):window.open(e,`_blank`)}}).catch(()=>{});return}let a=r.getAttribute(`data-jira-key`);if(a){e.preventDefault(),e.stopPropagation();let t=r.textContent?.trim()||a;o(`jira`,`/jira/issue/${a}`,t);return}q(e)},[n,q,o,f?.spaceKey]),Z=(0,g.useCallback)(async()=>{if(!(!n||!e)){S(!0),w(null);try{m(ie(await c.invoke({accountId:n.id,serviceType:`confluence`,action:`getPageContent`,params:{pageId:e}})))}catch(e){console.error(`[ConfluencePageDetail] fetch error:`,e),w(`페이지를 불러올 수 없습니다.`)}finally{S(!1)}}},[n,e]),Q=(0,g.useCallback)(async()=>{if(!(!n||!e))try{let t=await c.invoke({accountId:n.id,serviceType:`confluence`,action:`getPageComments`,params:{pageId:e}});v((Array.isArray(t)?t:[]).map(e=>ae(e)))}catch(e){console.error(`[ConfluencePageDetail] comments error:`,e),v([])}},[n,e]),$=(0,g.useCallback)(async()=>{if(!(!n||!e))try{let t=await c.invoke({accountId:n.id,serviceType:`confluence`,action:`getPageAttachments`,params:{pageId:e}}),r=Array.isArray(t)?t:[];console.log(`[ConfluencePageDetail] attachments:`,r.length,r);for(let e of r){let t=e,r=E(t.title);if(!r)continue;let i=D(t.extensions),a=D(t.metadata),o=E(i?.mediaType)||E(a?.mediaType)||E(t.mediaType);if(!(o?o.startsWith(`image/`):/\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i.test(r)))continue;let s=D(t._links),l=E(s?.download)||E(s?.self);if(!l){console.warn(`[ConfluencePageDetail] no download URL for:`,r,t._links);continue}console.log(`[ConfluencePageDetail] loading attachment:`,r,l),c.invoke({accountId:n.id,serviceType:`confluence`,action:`getAttachmentContent`,params:{downloadUrl:l}}).then(e=>{typeof e==`string`?U(t=>({...t,[r]:e})):console.warn(`[ConfluencePageDetail] unexpected dataUrl type:`,typeof e,r)}).catch(e=>{console.error(`[ConfluencePageDetail] attachment load failed:`,r,e)})}}catch(e){console.error(`[ConfluencePageDetail] fetchAttachments error:`,e)}},[n,e]);return(0,g.useEffect)(()=>{oe(s.current)},[e]),(0,g.useEffect)(()=>{Z(),Q(),$()},[Z,Q,$]),(0,g.useEffect)(()=>{if(!f?.bodyHtml)return;let t=s.current;t&&te(t,e).catch(()=>{})},[f?.bodyHtml,e,k]),(0,g.useEffect)(()=>{if(!f?.bodyHtml||!n)return;let e=ne(f.bodyHtml);e.length!==0&&c.invoke({accountId:n.id,serviceType:`jira`,action:`searchIssues`,params:{jql:`key IN (${e.join(`,`)})`,maxResults:e.length}}).then(e=>{let t=e.issues??[],n={};for(let e of t){let t=E(e.key),r=E(e.summary),i=D(e.status),a=E(i?.name),o=E(i?.category),s=E(D(e.issue_type)?.name);t&&(n[t]={key:t,summary:r,statusName:a,statusCategory:o,issueTypeName:s})}Oe(n)}).catch(e=>{console.error(`[ConfluencePageDetail] Jira issue fetch error:`,e)})},[f?.bodyHtml,n]),!n||!l(n.serviceType)?(0,T.jsxs)(A,{ref:s,children:[(0,T.jsx)(j,{children:(0,T.jsx)(M,{onClick:J,children:`← 목록으로`})}),(0,T.jsx)(P,{children:(0,T.jsx)(H,{children:`연결된 Atlassian 계정이 없습니다.`})})]}):x?(0,T.jsxs)(A,{ref:s,children:[(0,T.jsx)(j,{children:(0,T.jsx)(M,{onClick:J,children:`← 목록으로`})}),(0,T.jsx)(P,{children:(0,T.jsx)(H,{children:`로딩 중...`})})]}):C||!f?(0,T.jsxs)(A,{ref:s,children:[(0,T.jsx)(j,{children:(0,T.jsx)(M,{onClick:Y,children:`← 뒤로`})}),(0,T.jsx)(P,{children:(0,T.jsx)(H,{children:C||`페이지를 찾을 수 없습니다.`})})]}):(0,T.jsxs)(A,{ref:s,children:[(0,T.jsxs)(j,{children:[(0,T.jsx)(M,{onClick:Y,children:`← 목록으로`}),(0,T.jsxs)(se,{children:[f.spaceName&&(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(ce,{children:f.spaceKey?.startsWith(`~`)?f.spaceName:f.spaceKey||f.spaceName}),(0,T.jsx)(N,{children:`/`})]}),f.ancestors.map(e=>(0,T.jsxs)(g.Fragment,{children:[(0,T.jsx)(le,{onClick:()=>ke(e.id),children:e.title}),(0,T.jsx)(N,{children:`/`})]},e.id)),(0,T.jsx)(ue,{children:f.title})]})]}),(0,T.jsxs)(P,{children:[(0,T.jsxs)(de,{children:[(0,T.jsxs)(fe,{children:[(0,T.jsx)(pe,{children:`C`}),(0,T.jsx)(me,{children:f.title||`(제목 없음)`}),(0,T.jsx)(F,{title:`Confluence에서 열기`,onClick:()=>{let e=n.credentials.baseUrl?.replace(/\/$/,``)||``;if(e){let t=`${e}/wiki/spaces/${f.spaceKey}/pages/${f.id}`,n=window.electronAPI;n?.openExternal?n.openExternal(t):window.open(t,`_blank`)}},children:(0,T.jsx)(ee,{size:16})})]}),(0,T.jsxs)(he,{children:[(0,T.jsxs)(I,{children:[(0,T.jsx)(L,{children:`스페이스`}),(0,T.jsx)(R,{children:f.spaceName||f.spaceKey||`-`})]}),(0,T.jsxs)(I,{children:[(0,T.jsx)(L,{children:`작성자`}),(0,T.jsx)(R,{$isMe:f.authorName===i,children:f.authorName||`-`})]}),(0,T.jsxs)(I,{children:[(0,T.jsx)(L,{children:`생성일`}),(0,T.jsx)(R,{children:O(f.createdAt)})]}),(0,T.jsxs)(I,{children:[(0,T.jsx)(L,{children:`수정일`}),(0,T.jsx)(R,{children:O(f.updatedAt)})]}),(0,T.jsxs)(I,{children:[(0,T.jsx)(L,{children:`버전`}),(0,T.jsxs)(R,{children:[`v`,f.version]})]})]})]}),f.bodyHtml&&(0,T.jsx)(z,{children:(0,T.jsx)(V,{onClick:X,dangerouslySetInnerHTML:{__html:re(p(f.bodyHtml,k),W)}})}),(0,T.jsxs)(z,{children:[(0,T.jsxs)(ge,{onClick:()=>b(e=>!e),children:[(0,T.jsx)(_e,{children:y?`▼`:`▶`}),(0,T.jsxs)(B,{children:[`댓글 (`,_.length,`)`]})]}),y&&(_.length===0?(0,T.jsx)(we,{children:`댓글이 없습니다.`}):(0,T.jsx)(ve,{children:_.map(e=>(0,T.jsxs)(ye,{children:[(0,T.jsxs)(be,{children:[(0,T.jsx)(xe,{children:e.author}),(0,T.jsx)(Se,{children:O(e.created)})]}),(0,T.jsx)(Ce,{onClick:X,dangerouslySetInnerHTML:{__html:p(e.bodyHtml,k)}})]},e.id))}))]})]}),G&&(0,T.jsxs)(Te,{onClick:()=>K(null),children:[(0,T.jsx)(De,{onClick:()=>K(null),children:`×`}),(0,T.jsx)(Ee,{src:G,alt:``,onClick:e=>e.stopPropagation()})]})]})},A=o.div`
  flex: 1;
  min-height: 0;
  background: ${f.bg.subtle};
  zoom: 1.2;
  overflow-y: auto;
`,j=o.div`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: ${f.bg.default};
  border-bottom: 1px solid ${f.border};
`,M=o.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid ${f.border};
  border-radius: 20px;
  color: ${f.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ${i};
  flex-shrink: 0;

  &:hover {
    background: ${f.bg.hover};
    color: ${f.text.primary};
  }
`,se=o.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
  flex-wrap: wrap;
`,N=o.span`
  color: ${f.text.muted};
  font-size: 0.8125rem;
  flex-shrink: 0;
`,ce=o.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${f.border};
  border-radius: 20px;
  color: ${f.text.secondary};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
`,le=o.button`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${f.border};
  border-radius: 20px;
  color: ${f.primary};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ${i};

  &:hover {
    background: ${f.primaryLight};
    border-color: ${f.primary};
  }
`,ue=o.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${f.text.primary};
  background: ${f.bg.subtle};
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,P=o.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`,de=o.div`
  padding: 1.5rem;
  background: ${f.bg.default};
  border-radius: 3px;
  border: 1px solid ${f.border};
  margin-bottom: 1rem;
`,fe=o.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`,pe=o.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 3px;
  background: ${f.primary};
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
`,me=o.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${f.text.primary};
  line-height: 1.4;
  flex: 1;
  min-width: 0;
`,F=o.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid ${f.border};
  border-radius: 50%;
  color: ${f.text.muted};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${i};

  &:hover {
    background: ${f.primaryLight};
    border-color: ${f.primary};
    color: ${f.primary};
  }
`,he=o.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${f.border};
`,I=o.div`
  font-size: 0.8125rem;
`,L=o.span`
  display: block;
  color: ${f.text.muted};
  margin-bottom: 0.25rem;
`,R=o.span`
  color: ${({$isMe:e})=>e?f.primary:f.text.primary};
  font-weight: ${({$isMe:e})=>e?600:400};
`,z=o.div`
  padding: 1.5rem;
  background: ${f.bg.default};
  border-radius: 3px;
  border: 1px solid ${f.border};
  margin-bottom: 1rem;
`,B=o.h2`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${f.text.primary};
`,ge=o.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;

  &:hover ${B} {
    color: ${f.primary};
  }

  ${B} {
    margin-bottom: 0;
  }
`,_e=o.span`
  font-size: 0.7rem;
  color: ${f.text.muted};
  width: 1rem;
  flex-shrink: 0;
`,V=o.div`
  font-size: 0.875rem;
  color: ${f.text.primary};
  line-height: 1.6;

  p { margin: 0 0 0.5rem 0; }
  p:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 1rem 0 0.5rem 0;
    color: ${f.text.primary};
    line-height: 1.3;
  }
  h1 { font-size: 1.25rem; }
  h2 { font-size: 1.125rem; }
  h3 { font-size: 1rem; }
  h4, h5, h6 { font-size: 0.875rem; }
  h1:first-of-type, h2:first-of-type, h3:first-of-type { margin-top: 0; }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  li { margin-bottom: 0.25rem; }

  a {
    color: ${f.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  code {
    background: ${f.bg.subtle};
    border: 1px solid ${f.border};
    border-radius: 3px;
    padding: 0.125rem 0.375rem;
    font-size: 0.8125rem;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  pre {
    background: #263238;
    color: #EEFFFF;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    overflow-x: auto;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre;
    word-wrap: normal;
    overflow-wrap: normal;

    code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      white-space: inherit;
    }
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${f.primary};
    background: ${f.primaryLight};
    color: ${f.text.secondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${f.border};
    margin: 1rem 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${f.border};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
  }
  th {
    background: ${f.bg.subtle};
    font-weight: 600;
  }

  img {
    max-width: 100%;
    border-radius: 3px;
    cursor: zoom-in;
    transition: opacity 0.15s;
    &:hover { opacity: 0.85; }
  }

  .confluence-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .confluence-panel-info { border-color: ${f.primary}; background: ${f.primaryLight}; }
  .confluence-panel-note { border-color: #6554C0; background: #EAE6FF; }
  .confluence-panel-tip { border-color: #36B37E; background: #E3FCEF; }
  .confluence-panel-warning { border-color: #FF991F; background: #FFFAE6; }

  .adf-media-placeholder {
    color: ${f.text.muted};
    font-style: italic;
  }

  .confluence-mermaid {
    margin: 1rem 0;
    padding: 1rem;
    background: #fafafa;
    border: 1px solid ${f.border};
    border-radius: 3px;
    overflow-x: auto;
    white-space: pre-wrap;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8125rem;
    color: ${f.text.secondary};
  }
  .confluence-mermaid-rendered {
    white-space: normal;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    background: ${f.bg.default};
    text-align: center;

    svg {
      max-width: 100%;
      height: auto;
    }
  }

  details {
    margin: 0.5rem 0;
    border: 1px solid ${f.border};
    border-radius: 3px;

    summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      background: ${f.bg.subtle};
      &:hover { background: ${f.bg.hover}; }
    }

    > *:not(summary) {
      padding: 0 0.75rem;
    }
  }

  /* Jira 리치 링크 카드 */
  a.jira-rich-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none !important;
    color: inherit;
    vertical-align: middle;
  }

  .jira-rich-link-inner {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0.5rem;
    border: 1px solid ${f.border};
    border-radius: 3px;
    background: ${f.bg.subtle};
    font-size: 0.8125rem;
    line-height: 1.5;
    transition: background 0.15s ease;

    &:hover {
      background: ${f.bg.hover};
    }
  }

  .jira-rich-link-key {
    color: ${f.primary};
    font-weight: 600;
    white-space: nowrap;
  }

  .jira-rich-link-summary {
    color: ${f.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
  }

  .jira-rich-link-status {
    display: inline-flex;
    align-items: center;
    padding: 0.0625rem 0.375rem;
    border-radius: 3px;
    font-size: 0.6875rem;
    font-weight: 600;
    white-space: nowrap;
    text-transform: uppercase;
    color: ${f.text.secondary};
  }
`,ve=o.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`,ye=o.div`
  padding: 0.75rem;
  background: ${f.bg.subtle};
  border-radius: 3px;
  border: 1px solid ${f.border};
`,be=o.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`,xe=o.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${f.text.primary};
`,Se=o.span`
  font-size: 0.75rem;
  color: ${f.text.muted};
  flex-shrink: 0;
`,Ce=o(V)`
  font-size: 0.8125rem;
`,we=o.div`
  font-size: 0.8125rem;
  color: ${f.text.muted};
  margin-top: 1rem;
`,H=o.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${f.text.secondary};
`,U=n`
  from { opacity: 0; }
  to { opacity: 1; }
`,W=n`
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
`,Te=o.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  cursor: zoom-out;
  animation: ${U} 0.2s ease;
`,Ee=o.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  cursor: default;
  animation: ${W} 0.2s ease;
`,De=o.button`
  position: absolute;
  top: 16px;
  right: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;export{k as default};