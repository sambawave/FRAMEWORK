/** Stable vector brand mark: avoids font metrics, text wrapping and slash baseline bugs. */
export function BrandMark({large=false}:{large?:boolean}){
 return <svg className={'framework-logo'+(large?' large':'')} viewBox="0 0 40 40" role="img" aria-label="Framework Studio logo" focusable="false">
  <rect x="0.7" y="0.7" width="38.6" height="38.6" rx="3" fill="#302920" stroke="#a67948" strokeWidth="1.4"/>
  <path d="M10 10 H26 M10 10 V30 M10 20 H22" fill="none" stroke="#f8d2a0" strokeWidth="4" strokeLinecap="square"/>
  <path d="M30 10 L23 30" stroke="#d89a51" strokeWidth="2.8" strokeLinecap="round"/>
 </svg>
}
