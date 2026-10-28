const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const mode=process.argv[2];const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/index.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
if(mode==='preview'){const ts=[2.9,6.3,9.8,13.3,15.9,18.6];for(const [i,t] of ts.entries()){await p.evaluate(t=>render(t),t);await p.screenshot({path:`prev${i}.png`})}}
else{fs.mkdirSync('frames',{recursive:true});const N=19*30;for(let f=0;f<N;f++){await p.evaluate(t=>render(t),f/30);await p.screenshot({path:`frames/f${String(f).padStart(4,'0')}.jpg`,type:'jpeg',quality:95})}}
await b.close()})();
