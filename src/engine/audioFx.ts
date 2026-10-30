/** Native Web Audio effects; one codepath is shared by editor playback and recorded export. */
export type AudioEffectType='lowpass'|'highpass'|'bandpass'|'compressor'|'distortion'|'delay'|'tremolo';
export interface AudioEffect {id:string;type:AudioEffectType;enabled:boolean;amount:number}
export const AUDIO_EFFECT_TYPES:AudioEffectType[]=['lowpass','highpass','bandpass','compressor','distortion','delay','tremolo'];
export const AUDIO_EFFECT_LABELS:Record<AudioEffectType,string>={lowpass:'Low-Pass Filter',highpass:'High-Pass Filter',bandpass:'Band-Pass Filter',compressor:'Compressor',distortion:'Distortion',delay:'Echo / Delay',tremolo:'Tremolo'};
export function audioEffectParameter(type:AudioEffectType){return type==='lowpass'||type==='highpass'||type==='bandpass'?'Cutoff / frequency':type==='compressor'?'Compression':type==='distortion'?'Drive':type==='delay'?'Delay mix':'Modulation depth'}
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
export function buildAudioEffects(ctx:AudioContext,input:AudioNode,output:AudioNode,effects:AudioEffect[]):()=>void{
 let current=input;const nodes:AudioNode[]=[];const oscillators:OscillatorNode[]=[];
 for(const fx of effects.filter(e=>e.enabled)){
  const amt=clamp(Number(fx.amount)||0,0,100)/100;
  if(fx.type==='lowpass'||fx.type==='highpass'||fx.type==='bandpass'){
   const filter=ctx.createBiquadFilter();filter.type=fx.type;filter.frequency.value=40*Math.pow(450,amt);filter.Q.value=fx.type==='bandpass'?1.2:.7;current.connect(filter);current=filter;nodes.push(filter);
  }else if(fx.type==='compressor'){
   const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-5-amt*48;compressor.ratio.value=1+amt*13;compressor.attack.value=.004;compressor.release.value=.2;current.connect(compressor);current=compressor;nodes.push(compressor);
  }else if(fx.type==='distortion'){
   const shaper=ctx.createWaveShaper();const curve=new Float32Array(2048);const drive=1+amt*45;
   for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=Math.tanh(drive*x)/Math.tanh(drive)}
   shaper.curve=curve as Float32Array<ArrayBuffer>;shaper.oversample='4x';current.connect(shaper);current=shaper;nodes.push(shaper);
  }else if(fx.type==='delay'){
   const dry=ctx.createGain(),wet=ctx.createGain(),delay=ctx.createDelay(1.5),feedback=ctx.createGain(),mix=ctx.createGain();
   dry.gain.value=1-amt;wet.gain.value=amt;delay.delayTime.value=.27;feedback.gain.value=.29;
   current.connect(dry);dry.connect(mix);current.connect(delay);delay.connect(wet);wet.connect(mix);delay.connect(feedback);feedback.connect(delay);
   current=mix;nodes.push(dry,wet,delay,feedback,mix);
  }else if(fx.type==='tremolo'){
   const gain=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();gain.gain.value=1-amt*.5;
   lfo.frequency.value=5;depth.gain.value=amt*.5;lfo.connect(depth);depth.connect(gain.gain);lfo.start();oscillators.push(lfo);
   current.connect(gain);current=gain;nodes.push(gain,depth);
  }
 }
 current.connect(output);
 return ()=>{for(const lfo of oscillators){try{lfo.stop()}catch{}lfo.disconnect()}for(const node of nodes)node.disconnect()};
}
