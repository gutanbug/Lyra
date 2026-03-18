import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import{_ as n,g as r,v as i}from"./index-DlQa474I.js";import{a,o}from"./regenerator-65McjSpF.js";import{n as s,t as c}from"./defineProperty-D7rpUM5u.js";import{t as l}from"./esm-BIaDbCjz.js";import{d as u}from"./lib-CbCynfC5.js";import{t as d}from"./custom-theme-button-CMDGPeO5.js";import{D as f}from"./messages-CbQI8KUl.js";import{b as p,l as m,m as h,n as g,o as _,s as v,t as y}from"./clipboard-B5z85c9C.js";import{r as b}from"./base-BeHj8Tih.js";import{t as x}from"./copy-BoGTUVzs.js";import{i as S,n as C,r as w,t as T}from"./enums-Cd7ropdf.js";o();var E=e(x());n();var D=e(t()),O=u(function(e){var t=e.content,n=e.intl,r=a((0,D.useState)(n.formatMessage(f.copyCodeToClipboard)),2),o=r[0],s=r[1],c=a((0,D.useState)(`copy-to-clipboard`),2),u=c[0],p=c[1],m=function(){s(n.formatMessage(f.copyCodeToClipboard)),p(`copy-to-clipboard`)};return i(g.Consumer,null,function(e){var r=e.fireAnalyticsEvent;return i(`span`,null,i(l,{content:o,hideTooltipOnClick:!1,position:`top`},i(`div`,{onMouseLeave:m},i(d,{appearance:`subtle`,"aria-haspopup":!0,"aria-label":o,className:u,iconBefore:i(E.default,{label:o}),onClick:function(e){r({action:T.CLICKED,actionSubject:C.BUTTON,actionSubjectId:w.CODEBLOCK_COPY,eventType:S.UI}),y(t),s(n.formatMessage(f.copiedCodeToClipboard)),p(`copy-to-clipboard clicked`),e.stopPropagation()},spacing:`compact`}))))})});n();var k=function(){return i(`svg`,{width:`24`,height:`24`,fill:`none`,viewBox:`0 0 24 24`},i(`g`,{fill:`currentColor`,clipPath:`url(#clip0_654_431)`},i(`path`,{d:`M20 4h-1v16h1V4ZM3 8a1 1 0 0 1 1-1h9.5a4.5 4.5 0 1 1 0 9h-2.086l.293.293a1 1 0 0 1-1.414 1.414l-2-2a1 1 0 0 1 0-1.414l2-2a1 1 0 0 1 1.414 1.414l-.293.293H13.5a2.5 2.5 0 0 0 0-5H4a1 1 0 0 1-1-1Z`,clipRule:`evenodd`,fillRule:`evenodd`})))},A=u(function(e){var t=e.setWrapLongLines,n=e.wrapLongLines,r=e.intl.formatMessage(n?f.unwrapCode:f.wrapCode);return i(g.Consumer,null,function(e){var a=e.fireAnalyticsEvent;return i(`span`,null,i(l,{content:r,hideTooltipOnClick:!1,position:`top`},i(d,{appearance:`subtle`,"aria-haspopup":!0,"aria-label":r,className:`wrap-code ${n?`clicked`:``}`,iconBefore:i(b,{glyph:k,label:``}),isSelected:n,onClick:function(e){a({action:T.CLICKED,actionSubject:C.BUTTON,actionSubjectId:w.CODEBLOCK_WRAP,attributes:{wrapped:!n},eventType:S.UI}),t(!n),e.stopPropagation()},spacing:`compact`})))})});n();var j=r({position:`sticky`,top:`0px`,background:`${`var(--ds-surface, ${v})`}`}),M=r({display:`flex`,justifyContent:`flex-end`,position:`absolute`,height:`0`,width:`100%`,right:`var(--ds-space-075, 6px)`,top:`var(--ds-space-050, 4px)`,padding:`var(--ds-space-025, 2px)`,button:{height:`32px`,width:`32px`,border:`2px solid ${`var(--ds-border, ${_})`}`,borderRadius:`4px`,marginLeft:`var(--ds-space-050, 4px)`,padding:`var(--ds-space-025, 2px)`,background:`${`var(--ds-surface-overlay, ${v})`}`,color:`var(--ds-icon, rgb(66, 82, 110))`,"&:hover":{borderWidth:`2px`,backgroundColor:`${`var(--ds-surface-overlay-hovered, ${m})`}`,height:`32px`,width:`32px`},"&.clicked":{backgroundColor:`${`var(--ds-background-neutral-bold-pressed, ${h})`}`,borderRadius:`4px`,color:`${`var(--ds-icon-inverse, ${_})`} !important`}}}),N=function(e){var t=e.allowCopyToClipboard,n=e.allowWrapCodeBlock,r=e.setWrapLongLines,a=e.text,o=e.wrapLongLines;return i(`div`,{css:j},i(`div`,{css:M},n&&i(A,{setWrapLongLines:r,wrapLongLines:o}),t&&i(O,{content:a})))};s(),n();var P=r(c({tabSize:4,backgroundColor:`var(--ds-surface-raised, ${v})`,button:{opacity:0,transition:`opacity 0.2s ease 0s`},"&:hover":{button:{opacity:1}}},`${p.DS_CODEBLOCK}`,{fontSize:`${14/16}rem`,lineHeight:`1.5rem`,backgroundImage:`linear-gradient(
			to right,
			var(--ds-background-neutral, #091E420F) var(--ds-space-300, 24px),
			transparent var(--ds-space-300, 24px)
			),linear-gradient(
			to right,
			var(--ds-surface-raised, #FFFFFF) var(--ds-space-300, 24px),
			transparent var(--ds-space-300, 24px)
			),linear-gradient(
			to left,
			var(--ds-background-neutral, #091E420F) var(--ds-space-100, 8px),
			transparent var(--ds-space-100, 8px)
			),linear-gradient(
			to left,
			var(--ds-surface-raised, #FFFFFF) var(--ds-space-100, 8px),
			transparent var(--ds-space-100, 8px)
			),linear-gradient(
			to left,
			var(--ds-shadow-overflow-spread, #091e4229) 0,
			var(--ds-UNSAFE-transparent, transparent)  var(--ds-space-100, 8px)
			),linear-gradient(
			to left,
			var(--ds-shadow-overflow-perimeter, #091e421f) 0,
			var(--ds-UNSAFE-transparent, transparent)  var(--ds-space-100, 8px)
			),linear-gradient(
			to right,
			var(--ds-shadow-overflow-spread, #091e4229) 0,
			var(--ds-UNSAFE-transparent, transparent)  var(--ds-space-100, 8px)
			),linear-gradient(
			to right,
			var(--ds-shadow-overflow-perimeter, #091e421f) 0,
			var(--ds-UNSAFE-transparent, transparent)  var(--ds-space-100, 8px)
			)`,backgroundAttachment:`local, local, local, local, scroll, scroll, scroll, scroll`,backgroundPosition:`0 0, 0 0, 100% 0, 100% 0, 100% 0, 100% 0, 0 0, 0 0`})),F=function(e){var t=e.allowCopyToClipboard,n=e.allowWrapCodeBlock,r=e.children,a=e.className,o=e.setWrapLongLines,s=e.text,c=e.wrapLongLines;return i(`div`,{className:a,css:P},i(N,{allowCopyToClipboard:t,allowWrapCodeBlock:n,setWrapLongLines:o,text:s,wrapLongLines:c}),r)};export{F as t};