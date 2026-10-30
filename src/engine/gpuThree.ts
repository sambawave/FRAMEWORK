/** Genuine GPU-rendered 3D primitive compositor, shared by timeline preview and WebM export. */
import * as THREE from 'three';
import type {Clip} from '../types';
import {valueAt} from './timeline';
let renderer:THREE.WebGLRenderer|null=null,scene:THREE.Scene|null=null,camera:THREE.PerspectiveCamera|null=null,mesh:THREE.Mesh|null=null,keyLight:THREE.DirectionalLight|null=null;
const geometryCache=new Map<string,THREE.BufferGeometry>();
let gpuSupport:boolean|null=null;export function threeSupported(){if(gpuSupport!==null)return gpuSupport;try{const test=document.createElement('canvas');return gpuSupport=!!(test.getContext('webgl2')||test.getContext('webgl'))}catch{return gpuSupport=false}}
function geometry(name:string){let geo=geometryCache.get(name);if(geo)return geo;
 switch(name){case 'sphere':geo=new THREE.SphereGeometry(.8,40,24);break;case 'cylinder':geo=new THREE.CylinderGeometry(.7,.7,1.4,40);break;case 'cone':geo=new THREE.ConeGeometry(.85,1.5,40);break;case 'plane':geo=new THREE.PlaneGeometry(1.65,1.65);break;case 'torus':geo=new THREE.TorusGeometry(.6,.23,20,64);break;case 'pyramid':geo=new THREE.ConeGeometry(.9,1.5,4);break;case 'capsule':geo=new THREE.CapsuleGeometry(.5,.65,8,20);break;default:geo=new THREE.BoxGeometry(1.35,1.35,1.35)}
 geometryCache.set(name,geo);return geo;
}
function setup(){if(renderer)return;renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(512,512,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,6);scene.add(key);keyLight=key;scene.add(new THREE.AmbientLight(0xffffff,.75));const rim=new THREE.DirectionalLight(0x88aaff,1);rim.position.set(-4,-1,-3);scene.add(rim);
}
export function renderThreeClip(clip:Clip,frame:number,outputSize=512):HTMLCanvasElement|null{
 if(!threeSupported())return null;try{setup();if(!renderer||!scene||!camera)return null;
 const size=Math.max(128,Math.min(1024,Math.ceil(outputSize)));if(renderer.domElement.width!==size)renderer.setSize(size,size,false);
 const cfg=clip.three??{primitive:'cube',rotationX:0,rotationY:0,rotationZ:0,depth:0,scaleX:1,scaleY:1,scaleZ:1,roughness:.45,metalness:.1,emissive:'#000000',wireframe:false};
 const geo=geometry(cfg.primitive);
 if(!mesh||mesh.geometry!==geo){if(mesh){scene.remove(mesh);(mesh.material as THREE.Material).dispose()}
  mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({side:THREE.DoubleSide,transparent:true}));scene.add(mesh)}
 const mat=mesh.material as THREE.MeshStandardMaterial;mat.color.set(clip.color??'#e6a14a');mat.roughness=Math.max(0,Math.min(1,valueAt(clip,'roughness',frame)));mat.metalness=Math.max(0,Math.min(1,valueAt(clip,'metalness',frame)));mat.emissive.set(cfg.emissive??'#000000');mat.wireframe=cfg.wireframe;if(keyLight)keyLight.intensity=3*Math.max(0,Math.min(3,valueAt(clip,'lighting',frame)));
 mesh.rotation.set(valueAt(clip,'rotationX',frame)*Math.PI/180,valueAt(clip,'rotationY',frame)*Math.PI/180,valueAt(clip,'rotationZ',frame)*Math.PI/180);mesh.position.z=valueAt(clip,'depth',frame);
 mesh.scale.set(valueAt(clip,'threeScaleX',frame),valueAt(clip,'threeScaleY',frame),valueAt(clip,'threeScaleZ',frame));renderer.render(scene,camera);return renderer.domElement;
 }catch(e){console.warn('3D rendering unavailable',e);return null}
}
