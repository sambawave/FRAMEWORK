import {ReactNode,useEffect,useRef,useState} from 'react';
import {ChevronsDownUp,ChevronsUpDown,Search} from 'lucide-react';
const STORAGE='framework.inspector.sections.v1';
function readSections():Record<string,boolean>{try{return JSON.parse(localStorage.getItem(STORAGE)??'{}')}catch{return {}}}
/** Collapsible and searchable wrapper around existing inspector controls. All actual
 * control instances remain in their original React owner and retain their handlers. */
export function InspectorBody({children}:{children:ReactNode}){
 const root=useRef<HTMLDivElement>(null);
 const [query,setQuery]=useState('');
 const [hidden,setHidden]=useState<Record<string,boolean>>(readSections);
 useEffect(()=>{
  const sections=[...root.current?.querySelectorAll<HTMLElement>(':scope > .inspector-section')??[]];
  sections.forEach((section,index)=>{
   const heading=section.querySelector<HTMLElement>(':scope > h4');
   if(!heading)return;
   const name=(heading.textContent??`Section ${index}`).trim().replace(/\s+/g,' ').replace(/\s*Easy Ease$/,'');
   section.dataset.sectionName=name;
   section.classList.toggle('is-collapsed',!!hidden[name]);
   section.hidden=!!query.trim()&&!section.textContent?.toLowerCase().includes(query.trim().toLowerCase());
   heading.setAttribute('role','button');heading.setAttribute('tabindex','0');
   heading.setAttribute('aria-expanded',String(!hidden[name]));
   heading.setAttribute('title',`Expand or collapse ${name}`);
  });
 },[children,hidden,query]);
 const toggle=(section:HTMLElement)=>{
  const name=section.dataset.sectionName;if(!name)return;
  setHidden(prev=>{const next={...prev,[name]:!prev[name]};try{localStorage.setItem(STORAGE,JSON.stringify(next))}catch{}return next});
 };
 const navigate=(e:React.MouseEvent<HTMLDivElement>)=>{
  if((e.target as HTMLElement).closest('button,input,select,textarea,a'))return;
  const heading=(e.target as HTMLElement).closest('h4');
  const section=heading?.parentElement;
  if(section?.classList.contains('inspector-section'))toggle(section);
 };
 const keyboard=(e:React.KeyboardEvent<HTMLDivElement>)=>{
  if(e.target instanceof HTMLElement&&e.target.matches('h4')&&(e.key==='Enter'||e.key===' ')){
   e.preventDefault();const section=e.target.parentElement;if(section)toggle(section);
  }
 };
 const expand=(open:boolean)=>{const next={...hidden};root.current?.querySelectorAll<HTMLElement>(':scope > .inspector-section').forEach(section=>{if(section.dataset.sectionName)next[section.dataset.sectionName]=!open});setHidden(next);try{localStorage.setItem(STORAGE,JSON.stringify(next))}catch{}};
 return <div className="inspector-body" ref={root} onClick={navigate} onKeyDown={keyboard}>
  <div className="inspector-filter" role="search"><Search size={14}/><input aria-label="Search inspector properties" placeholder="Search properties…" value={query} onChange={e=>setQuery(e.target.value)}/><button title="Expand all property sections" aria-label="Expand all sections" onClick={()=>expand(true)}><ChevronsUpDown size={15}/></button><button title="Collapse all property sections" aria-label="Collapse all sections" onClick={()=>expand(false)}><ChevronsDownUp size={15}/></button></div>
  {children}
 </div>
}
