import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./react-CImqQUc5.js";import{_ as n,g as r,v as i}from"./index-DlQa474I.js";import{n as a,t as o}from"./objectWithoutProperties-D3b-KWkA.js";import{n as s,t as c}from"./esm-xGmASAXy.js";import{t as l}from"./exp-val-equals-Cb_EKZhL.js";import{Cr as u,St as d,wr as f}from"./utils-BX_ShdUe.js";import{a as p}from"./consts-DXlTuwq8.js";import{t as m}from"./taggedTemplateLiteral-NDGEqFY-.js";a(),e(t()),n(),s();var h=[`children`],g,_,v;function y(e){switch(e){case`wrap-right`:return`right`;case`wrap-left`:return`left`;default:return`none`}}function b(e,t,n){return n?e>1800?`${Math.min(t,p)}px`:`${e}px`:e>1800?`100%`:`${e}px`}function x(e,t,n){return n?e>680?`${Math.min(t,760)}px`:`${e}px`:e>680?`100%`:`${e}px`}function S(e,t){var n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:0,r=arguments.length>3?arguments[3]:void 0,i=arguments.length>4?arguments[4]:void 0,a=arguments.length>5?arguments[5]:void 0;switch(e){case`align-start`:case`align-end`:case`wrap-right`:case`wrap-left`:return t>n/2?`calc(50% - 12px)`:`${t}px`;case`wide`:return a?f(n,1/0,`${n}px`):f(n);case`full-width`:return u(e,n);default:return i?`${t}px`:r?b(t,n,a):x(t,n,a)}}function C(e,t){var n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:0;switch(e){case`wide`:return f(n);case`full-width`:return u(e,n);default:return`${t}px`}}function w(e,t){switch(e){case`wide`:return f(t);case`full-width`:return u(e,t);default:return`100%`}}function T(e){switch(e){case`wrap-right`:return`12px auto 12px 12px`;case`wrap-left`:return`12px 12px 12px auto`;default:return`24px auto`}}function E(e){switch(e){case`wide`:return`min(var(--ak-editor--breakout-wide-layout-width), var(--ak-editor-max-container-width))`;case`full-width`:return`min(var(--ak-editor--full-width-layout-width), var(--ak-editor-max-container-width))`;default:return`var(--ak-editor-max-container-width)`}}function D(e){switch(e){case`align-end`:return`margin-right: 0`;case`align-start`:return`margin-left: 0`;default:return``}}function O(e){try{if(e.endsWith(`px`)){var t=parseInt(e.slice(0,-2));return`${t-t%2}px`}return e}catch{return e}}var k=function(e){var t=e.containerWidth,n=t===void 0?0:t,i=e.fullWidthMode,a=e.isResized,o=e.layout,s=e.mediaSingleWidth,c=e.width,u=e.isExtendedResizeExperienceOn,f=e.isNestedNode,p=f===void 0?!1:f,h=e.isInsideOfInlineExtension,_=h===void 0?!1:h,v=e.isInRenderer,b=v===void 0?!1:v,x=O(u?`${s||c}px`:s?C(o,c||0,n):S(o,c||0,n,i,a,_)),k=O(u?`${n}px`:w(o,n)),A=u?`var(--ak-editor-max-container-width)`:E(o);return r(g||=m([`
		/* For nested rich media items, set max-width to 100% */
		tr &,
		[data-layout-column] &,
		[data-node-type='expand'] &,
		[data-panel-type] &,
		li &,
		[data-prosemirror-node-name='bodiedSyncBlock'] &,
		[data-prosemirror-node-name='syncBlock'] &,
		[data-sync-block-renderer] &,
		[data-bodied-sync-block] & {
			max-width: 100%;
		}

		width: `,`;
		`,`

		`,`

		`,`

		&:not(.is-resizing) {
			transition: width 100ms ease-in;
		}

		float: `,`;
		margin: `,`;

		&[class*='not-resizing'] {
			`,`
		}

		`,`;
	`]),x,o===`full-width`&&!u&&r({minWidth:`100%`}),b?r({"@container ak-renderer-wrapper (min-width: 1px)":{maxWidth:`100cqw`}}):l(`platform_editor_media_vc_fixes`,`isEnabled`,!0)?`max-width: ${A};`:`max-width: ${k};`,u&&`&[class*='is-resizing'] {
    .new-file-experience-wrapper {
      box-shadow: none !important;
    }

    ${!p&&d.includes(o)&&`margin-left: 50%;
      transform: translateX(-50%);`}
  }`,y(o),T(o),p?`max-width: 100%;`:d.includes(o)&&`margin-left: 50%;
        transform: translateX(-50%);`,D(o))},A=function(e){var t=e.hasFallbackContainer,n=e.paddingBottom,i=e.height;return r(_||=m([`
		`,`
	`]),t?`
  &::after {
    content: '';
    display: block;
    ${i?`height: ${i}px;`:n?`padding-bottom: ${n};`:``}

    /* Fixes extra padding problem in Firefox */
    font-size: 0;
    line-height: 0;
  }
  `:``)},j=function(e){return r(v||=m([`
	position: relative;

	`,`

	/* Editor */
  & > figure {
		position: `,`;
		height: 100%;
		width: 100%;
	}

	/* Comments on media project adds comment badge as child of the media wrapper,
	thus we need to exclude it so that style is applied to intended div */
	& > div:not([data-media-badges='true']) {
		position: `,`;
		height: 100%;
		width: 100%;
	}

	& * [data-mark-annotation-type='inlineComment'] {
		width: 100%;
		height: 100%;
	}

	&[data-node-type='embedCard'] > div {
		width: 100%;
	}

	/* Renderer */
	[data-node-type='media'] {
		position: static !important;
		`,`

		> div {
			position: absolute;
			height: 100%;
		}
	}
`]),A(e),e.hasFallbackContainer?`absolute`:`relative`,e.hasFallbackContainer?`absolute`:`relative`,c(`platform_forge_ui_support_images_in_adfrenderer`)?`height: auto !important;`:``)},M=function(e){var t=e.children;return i(`div`,{css:j(o(e,h))},t)};M.displayName=`WrapperMediaSingle`;var N=function(e){var t=e.borderColor;return i(`div`,{style:{position:`absolute`,inset:`0px`,border:`0.5px solid ${t}`,borderRadius:`1px`}})};export{k as n,M as r,N as t};