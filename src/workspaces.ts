export type WorkspaceName='Editing'|'Animation'|'Audio'|'Effects'|'3D'|'Color'|'Export';
export const WORKSPACES:Record<WorkspaceName,{left:number;right:number;timeline:number;tab:'project'|'effects'|'motions';description:string}>={
 Editing:{left:270,right:300,timeline:300,tab:'project',description:'Original FRAMEWORK editing layout'},
 Animation:{left:235,right:350,timeline:405,tab:'motions',description:'Animation presets and graph/keyframe controls'},
 Audio:{left:270,right:345,timeline:415,tab:'project',description:'Audio waveforms, clips and effect-chain controls'},
 Effects:{left:335,right:365,timeline:285,tab:'effects',description:'Effects browser and stack'},
 '3D':{left:240,right:390,timeline:250,tab:'project',description:'3D object and material controls'},
 Color:{left:320,right:360,timeline:270,tab:'effects',description:'Color effects and parameters'},
 Export:{left:240,right:290,timeline:220,tab:'project',description:'Export workspace with current composition'}
};
export function isWorkspace(value:string):value is WorkspaceName{return Object.hasOwn(WORKSPACES,value)}
