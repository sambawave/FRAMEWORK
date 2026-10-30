import type {Clip} from '../types';
export const shapeNames=['rectangle','roundedRectangle','circle','ellipse','triangle','polygon','star','line','arrow','bezier'] as const;
export type ShapeName=typeof shapeNames[number];
export const shapeLabels:Record<ShapeName,string>={rectangle:'Rectangle',roundedRectangle:'Rounded Rectangle',circle:'Circle',ellipse:'Ellipse',triangle:'Triangle',polygon:'Polygon',star:'Star',line:'Line',arrow:'Arrow',bezier:'Custom Bézier Shape'};
/** Construct the exact same geometric path for playback, frame rendering, and export. */
export function shapePath(ctx:Pick<CanvasRenderingContext2D,'beginPath'|'rect'|'roundRect'|'ellipse'|'moveTo'|'lineTo'|'bezierCurveTo'|'closePath'>,c:Clip,w:number,h:number):void{
 const type=c.shape??'rectangle';ctx.beginPath();
 const poly=(sides:number,inner=1)=>{for(let i=0;i<sides*(inner<1?2:1);i++){const count=sides*(inner<1?2:1);const angle=-Math.PI/2+i*2*Math.PI/count;const radius=(inner<1&&i%2?inner:1);const x=Math.cos(angle)*w/2*radius,y=Math.sin(angle)*h/2*radius;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath()};
 switch(type){
  case 'rectangle':ctx.rect(-w/2,-h/2,w,h);break;
  case 'roundedRectangle':ctx.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*.18);break;
  case 'circle':ctx.ellipse(0,0,Math.min(w,h)/2,Math.min(w,h)/2,0,0,Math.PI*2);break;
  case 'ellipse':ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);break;
  case 'triangle':poly(3);break;
  case 'polygon':poly(Math.max(3,Math.min(20,c.shapeSides??5)));break;
  case 'star':poly(Math.max(3,Math.min(20,c.shapeSides??5)),.43);break;
  case 'line':ctx.moveTo(-w/2,-h/2);ctx.lineTo(w/2,h/2);break;
  case 'arrow':{ctx.moveTo(-w/2,0);ctx.lineTo(w*.12,0);ctx.lineTo(w*.12,-h*.3);ctx.lineTo(w/2,0);ctx.lineTo(w*.12,h*.3);ctx.lineTo(w*.12,h*.08);ctx.lineTo(-w/2,h*.08);ctx.closePath();break}
  case 'bezier':{
   const points=c.shapePoints??[[-1,0],[-.4,-.5],[.4,.5],[1,0]];
   if(!points.length)break;
   const pts=points.map(([x,y])=>[x*w/2,y*h/2]);ctx.moveTo(pts[0][0],pts[0][1]);
   for(let i=0;i<pts.length-1;i++){
    const a=pts[Math.max(0,i-1)],b=pts[i],d=pts[i+1],e=pts[Math.min(pts.length-1,i+2)];
    ctx.bezierCurveTo(b[0]+(d[0]-a[0])/6,b[1]+(d[1]-a[1])/6,d[0]-(e[0]-b[0])/6,d[1]-(e[1]-b[1])/6,d[0],d[1]);
   }
   if(c.shapeClosed)ctx.closePath();break;
  }
 }
}
export function createShapeGeometry(points:[number,number][]):{x:number;y:number;width:number;height:number;normalized:[number,number][]}{
 const left=Math.min(...points.map(p=>p[0])),right=Math.max(...points.map(p=>p[0]));
 const top=Math.min(...points.map(p=>p[1])),bottom=Math.max(...points.map(p=>p[1]));
 const w=Math.max(2,right-left),h=Math.max(2,bottom-top);
 return {x:(left+right)/2,y:(top+bottom)/2,width:w,height:h,normalized:points.map(([x,y])=>[(x-(left+right)/2)/(w/2),(y-(top+bottom)/2)/(h/2)])};
}
