import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const work=mkdtempSync(path.join(tmpdir(),'framework-e2e-'));
let video:string,music:string;
test.beforeAll(()=>{
 video=path.join(work,'clip.webm');music=path.join(work,'music.ogg');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=blue:s=320x180:r=30:d=2','-f','lavfi','-i','sine=frequency=350:duration=2','-c:v','libvpx','-b:v','500k','-c:a','libopus','-shortest',video]);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=880:duration=2','-c:a','libopus',music]);
});
test('imports, splits, animates, effects, mixes audio and exports edited frames',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 await page.getByRole('button',{name:'New Project'}).click();
 await page.getByRole('button',{name:'Create Project'}).click();
 await page.locator('input[accept="video/*,audio/*,image/*"]').first().setInputFiles(video);
 await expect(page.getByText('clip.webm')).toBeVisible();
 await page.locator('.media-item').first().getByTitle('Insert at playhead').click();
 await expect(page.locator('.timeline-clip')).toHaveCount(1);
 // Scrub to about frame 30 at 2 px/frame.
 await page.locator('.ruler-lane').click({position:{x:61,y:14}});
 await page.getByTitle('Split selected clip at playhead (S)').click();
 await expect(page.locator('.timeline-clip')).toHaveCount(2);
 // Apply a visible invert effect to the second half.
 await page.locator('.timeline-clip').nth(1).click();
 await page.locator('.panel-tabs').getByRole('button',{name:'Effects'}).click();
 await page.getByRole('button',{name:'Invert Colors',exact:true}).click();
 await expect(page.locator('.effect-control')).toHaveCount(1);
 // Add editable text and two position keyframes.
 await page.getByTitle('Add editable title at playhead').click();
 await page.getByLabel('Text content').fill('FRAMEWORK');
 await page.locator('.anim-row .diamond').first().click();
 await page.locator('.ruler-lane').click({position:{x:90,y:14}});
 await page.locator('.anim-row').first().locator('input[type=number]').fill('120');
 await page.locator('.anim-row').first().locator('input[type=number]').press('Tab');
 await expect(page.locator('.keyframes-list')).toBeVisible();
 await page.getByTitle('Apply Easy Ease to keyframes (F9)').click();
 // Import background music, on the audio track, and adjust gain.
 await page.locator('input[accept="video/*,audio/*,image/*"]').first().setInputFiles(music);
 await page.locator('.panel-tabs').getByRole('button',{name:'Project'}).click();
 await expect(page.getByText('music.ogg')).toBeVisible();
 await page.locator('.media-item').nth(1).getByTitle('Insert at playhead').click();
 await expect(page.locator('.timeline-clip')).toHaveCount(4);
 await page.locator('.anim-row').first().locator('input[type=number]').fill('0.35');
 await page.locator('.anim-row').first().locator('input[type=number]').press('Tab');
 // Render; assert the actual output contains an audio stream and altered pixels.
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const downloadPromise=page.waitForEvent('download',{timeout:90000});
 await page.getByRole('button',{name:'Export WebM'}).click();
 const result=await downloadPromise;const output=path.join(work,'result.webm');await result.saveAs(output);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
 expect(probe.streams.some((s:{codec_type:string})=>s.codec_type==='video')).toBe(true);
 expect(probe.streams.some((s:{codec_type:string})=>s.codec_type==='audio')).toBe(true);
 expect(Number(probe.format.duration)).toBeGreaterThan(1);
 const frameAt=(time:string)=>execFileSync('ffmpeg',['-v','error','-ss',time,'-i',output,'-vf','scale=80:45','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:80*45*3+10000});
 const a=frameAt('0.3'),b=frameAt('1.5');const pixel=(v:Buffer,x:number,y:number)=>{const i=(y*80+x)*3;return [v[i],v[i+1],v[i+2]]};
 const before=pixel(a,10,10),after=pixel(b,10,10);
 expect(before[2]).toBeGreaterThan(before[0]+45); // Blue input source
 expect(after[0]).toBeGreaterThan(before[0]+40); // Yellow after invert effect
 const audio=execFileSync('ffmpeg',['-v','error','-i',output,'-vn','-ac','1','-ar','16000','-f','s16le','pipe:1'],{maxBuffer:5_000_000});
 let total=0;for(let i=0;i+1<audio.length;i+=2)total+=Math.abs(audio.readInt16LE(i));
 expect(total).toBeGreaterThan(10000); // Actual non-silent mix
 writeFileSync(path.join(work,'test-summary.txt'),JSON.stringify({before,after,audioBytes:audio.length},null,2));
});
