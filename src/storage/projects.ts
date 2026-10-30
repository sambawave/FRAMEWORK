import {Project} from '../types';
import {validateProject} from '../engine/timeline';
const KEY='framework.projects.v2';
function read():Record<string,Project>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
export function listProjects():Project[]{return Object.values(read()).sort((a,b)=>(b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt))}
export function getProject(id:string):Project|undefined{const p=read()[id];if(!p)return;try{return validateProject(p)}catch{return}}
export function persistProject(p:Project){try{const all=read();all[p.id]={...p,updatedAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(all));localStorage.setItem('framework.lastproject.v2',p.id)}catch(e){console.warn('Local project persistence failed',e)}}
export function deleteProject(id:string){const all=read();delete all[id];localStorage.setItem(KEY,JSON.stringify(all));if(localStorage.getItem('framework.lastproject.v2')===id)localStorage.removeItem('framework.lastproject.v2')}
export function lastProject():Project|undefined{const id=localStorage.getItem('framework.lastproject.v2');return id?getProject(id):undefined}
