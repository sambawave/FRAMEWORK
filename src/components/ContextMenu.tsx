import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
export interface ContextAction {label:string;run?:()=>void;disabled?:boolean;danger?:boolean;children?:ContextAction[]}
/** Central menu renderer shared by every existing specialized editing menu.
 * It portals above clipped editing panels and supports optional nested actions. */
export function ContextMenu({x,y,items,close}:{x:number;y:number;items:ContextAction[];close:()=>void}){
 const ref=useRef<HTMLDivElement>(null),subRef=useRef<HTMLDivElement>(null);
 const [nested,setNested]=useState<number|null>(null);
 const [subPosition,setSubPosition]=useState({x:0,y:0});
 const showNested=(index:number)=>{
  const row=ref.current?.querySelectorAll<HTMLButtonElement>(':scope > button')[index];
  const r=row?.getBoundingClientRect();
  if(r){const width=Math.min(235,window.innerWidth-15),right=r.right+4;
   setSubPosition({x:right+width<=window.innerWidth-6?right:Math.max(6,r.left-width-4),y:Math.min(r.top,window.innerHeight-85)});}
  setNested(index);
 };
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  el.style.maxHeight=`${Math.max(85,window.innerHeight-16)}px`;
  const rect=el.getBoundingClientRect();
  const left=Math.max(6,Math.min(x,window.innerWidth-rect.width-6));
  const top=Math.max(6,Math.min(y,window.innerHeight-rect.height-6));
  el.style.left=`${left}px`;el.style.top=`${top}px`;
  el.style.maxHeight=`${Math.max(64,window.innerHeight-top-7)}px`;
 },[x,y,items.length]);
 useLayoutEffect(()=>{
  const el=subRef.current;if(!el)return;const r=el.getBoundingClientRect();
  const top=Math.max(6,Math.min(subPosition.y,window.innerHeight-r.height-6));
  el.style.top=`${top}px`;el.style.maxHeight=`${Math.max(64,window.innerHeight-top-7)}px`;
 },[nested,subPosition]);
 useEffect(()=>{ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true})},[]);
 useEffect(()=>{
  const outside=(e:PointerEvent)=>{
   if(ref.current?.contains(e.target as Node)||subRef.current?.contains(e.target as Node))return;
   close();
  };
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();close();return}
   if(e.key==='ArrowLeft'&&nested!==null){e.preventDefault();ref.current?.querySelectorAll<HTMLButtonElement>(':scope > button')[nested]?.focus();setNested(null);return}
   if(e.key==='ArrowRight'){
    const button=document.activeElement as HTMLButtonElement;
    const i=[...ref.current?.querySelectorAll<HTMLButtonElement>(':scope > button')??[]].indexOf(button);
    if(i>=0&&items[i]?.children?.length){e.preventDefault();showNested(i);requestAnimationFrame(()=>subRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());}
    return;
   }
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    const target=subRef.current?.contains(document.activeElement)?subRef.current:ref.current;
    const buttons=[...target?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]];if(!buttons.length)return;
    e.preventDefault();const i=buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
   }
  };
  const onScroll=(e:Event)=>{if(ref.current?.contains(e.target as Node)||subRef.current?.contains(e.target as Node))return;close()};
  window.addEventListener('pointerdown',outside);window.addEventListener('keydown',key);window.addEventListener('scroll',onScroll,true);
  return()=>{window.removeEventListener('pointerdown',outside);window.removeEventListener('keydown',key);window.removeEventListener('scroll',onScroll,true)};
 },[close,nested,items]);
 const menu=(actions:ContextAction[],sub=false)=><div ref={sub?subRef:ref} className={'context-menu'+(sub?' context-submenu':'')} role="menu"
  style={sub?{left:subPosition.x,top:subPosition.y}:{left:Math.max(4,Math.min(x,window.innerWidth-220)),top:Math.max(4,Math.min(y,window.innerHeight-Math.min(items.length*32+20,580)))}}
  onContextMenu={e=>{e.preventDefault();e.stopPropagation()}} onPointerDown={e=>e.stopPropagation()}>
  {actions.map((a,i)=><button role="menuitem" className={(a.danger?'danger ':'')+(a.children?.length?'has-children':'')} key={a.label+i}
   disabled={a.disabled} aria-haspopup={a.children?.length?'menu':undefined} aria-expanded={a.children?.length?nested===i:undefined}
   onMouseEnter={()=>{if(!sub){if(a.children?.length)showNested(i);else setNested(null)}}}
   onClick={()=>{if(a.children?.length&&!sub){showNested(i);return}a.run?.();close()}}>{a.label}</button>)}
 </div>;
 return <>{createPortal(menu(items),document.body)}{nested!==null&&items[nested]?.children?.length?createPortal(menu(items[nested].children!,true),document.body):null}</>;
}
