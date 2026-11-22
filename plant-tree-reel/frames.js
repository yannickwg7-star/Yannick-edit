const {chromium}=require('playwright');
(async()=>{const [a,b]=process.argv.slice(2).map(Number);
const br=await chromium.launch();const p=await br.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
await p.goto('file://'+process.cwd()+'/overlay.html');await p.evaluate(()=>document.fonts.ready);
for(let f=a;f<b;f++){await p.evaluate(t=>render(t),f/30);
 await p.screenshot({path:`ov/${String(f).padStart(4,'0')}.png`,omitBackground:true});}
await br.close();})();
