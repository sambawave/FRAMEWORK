/** Downsampled real PCM peak waveform; nothing is synthesized from filenames. */
import {getMedia} from '../storage/db';
const cache=new Map<string,Promise<Float32Array>>();
export function peaksFromPCM(channels:Float32Array[],points=1024):Float32Array{
 const len=channels[0]?.length??0,out=new Float32Array(points);
 if(!len)return out;
 for(let i=0;i<points;i++){
  const start=Math.floor(i*len/points),end=Math.min(len,Math.max(start+1,Math.ceil((i+1)*len/points)));
  let peak=0;
  // Scanning sparsely on huge recordings is intentional, keeps the UI responsive.
  const stride=Math.max(1,Math.floor((end-start)/256));
  for(let j=start;j<end;j+=stride)for(const data of channels)peak=Math.max(peak,Math.abs(data[j]||0));
  out[i]=peak;
 }
 return out;
}
export function loadWaveform(mediaId:string):Promise<Float32Array>{
 if(!cache.has(mediaId))cache.set(mediaId,(async()=>{
  const blob=await getMedia(mediaId);if(!blob)throw Error('Media missing');
  const audio=new AudioContext();try{
   const buffer=await audio.decodeAudioData(await blob.arrayBuffer());
   return peaksFromPCM(Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)));
  }finally{await audio.close()}
 })().catch(e=>{cache.delete(mediaId);throw e}));
 return cache.get(mediaId)!;
}
