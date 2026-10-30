import type {Clip,TextAnimation} from '../types';
import {valueAt} from './timeline';
const smooth=(t:number)=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t)};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
/** Deterministic frame evaluator; canvas preview and export call this exact function. */
export function textCharacterState(anim:TextAnimation|undefined,localFrame:number,index:number,total:number){
 let x=0,y=0,rotation=0,scale=1,opacity=1,blur=0;
 if(!anim||anim.mode==='none')return {x,y,rotation,scale,opacity,blur};
 const duration=Math.max(1,anim.duration),delay=Math.max(0,anim.delay),strength=clamp(anim.intensity,0,300)/100;
 const tFrame=anim.loop?((localFrame%(duration+delay*total)+(duration+delay*total))%(duration+delay*total)):localFrame;
 const t=clamp((tFrame-index*delay)/duration,0,1),v=smooth(t),wave=(k:number)=>Math.sin((localFrame-index*delay)/Math.max(1,duration)*Math.PI*2+k);
 switch(anim.mode){
 case 'typewriter':opacity=tFrame>=index*delay?1:0;break;
 case 'fade':opacity=v;break;
 case 'cascade':y=-80*(1-v)*strength;opacity=v;break;
 case 'wave':y=wave(index*.5)*25*strength;break;
 case 'floating':y=wave(index*.31)*19*strength;rotation=wave(index*.12)*6*strength;break;
 case 'pulse':scale=1+wave(index*.4)*.18*strength;break;
 case 'shake':x=wave(index*1.7)*8*strength;y=Math.sin(localFrame*1.78+index)*6*strength;break;
 case 'bounce':y=-Math.abs(Math.sin(t*Math.PI*3))*45*(1-t)*strength;opacity=v;break;
 case 'rotate':rotation=(1-v)*-160*strength;opacity=v;break;
 case 'glitch':x=Math.sin(Math.floor(localFrame/3)*12.98+index*4.1)*14*strength;opacity=.7+.3*Math.abs(wave(index));break;
 case 'neon':opacity=.55+.45*Math.abs(Math.sin(localFrame*.25+index*.8));break;
 case 'zoom':scale=.25+.75*v;opacity=v;break;
 case 'flip':scale=Math.max(.001,Math.abs(Math.cos((1-v)*Math.PI)))*1;opacity=v;break;
 case 'spiral':x=Math.cos(index+10*(1-v))*80*(1-v)*strength;y=Math.sin(index+10*(1-v))*80*(1-v)*strength;rotation=(1-v)*360*strength;opacity=v;break;
 }
 return {x,y,rotation,scale,opacity,blur};
}
export function drawAnimatedText(ctx:CanvasRenderingContext2D,c:Clip,frame:number,compWidth:number){
 const fs=c.fontSize??80;ctx.font=`${c.fontWeight??'700'} ${fs}px ${c.fontFamily??'Arial'}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c.color??'#ffffff';
 const text=(c.text??'').slice(0,Math.max(0,Math.floor(valueAt(c,'reveal',frame))));const lines=text.split('\n'),local=frame-c.start;
 if(!c.textAnimation||c.textAnimation.mode==='none'){lines.forEach((line,i)=>ctx.fillText(line,0,(i-(lines.length-1)/2)*fs*1.15,compWidth*.9));return}
 const anim={...c.textAnimation,intensity:valueAt(c,'textIntensity',frame)};const chars=[...text],total=chars.length;let index=0;
 lines.forEach((line,row)=>{
  const glyphs=Array.from(line),widths=glyphs.map(ch=>ctx.measureText(ch).width),full=widths.reduce((a,b)=>a+b,0);
  let x=-full/2;const y=(row-(lines.length-1)/2)*fs*1.15;
  glyphs.forEach((ch,i)=>{const advance=widths[i],k=index++,st=textCharacterState(anim,local,k,total),user=c.characters?.[k];
   ctx.save();ctx.translate(x+advance/2+(user?.x??0)+st.x,y+(user?.y??0)+st.y);
   ctx.rotate((st.rotation+(user?.rotation??0))*Math.PI/180);
   const scale=Math.max(.001,st.scale*(user?.scale??1));ctx.scale(scale,scale);ctx.globalAlpha*=clamp(st.opacity*(user?.opacity??1),0,1);
   ctx.fillStyle=user?.color??c.color??'#ffffff';if(user?.blur)ctx.filter=`blur(${Math.max(0,user.blur)}px)`;ctx.fillText(ch,0,0);ctx.restore();x+=advance;
  });index++;
 });
}
