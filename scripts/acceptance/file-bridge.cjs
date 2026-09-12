const {_electron}=require(process.env.NUWAX_QA_PLAYWRIGHT || 'playwright-core');
const {createServer}=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');const assert=require('node:assert/strict');const {createHash}=require('node:crypto');const {tmpdir}=require('node:os');
const resources=process.env.NUWAX_QA_RESOURCES;
const executable=process.env.NUWAX_QA_ELECTRON;
if(!resources || !executable) throw Error('Set NUWAX_QA_RESOURCES and NUWAX_QA_ELECTRON');
const payload=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6C1kAAAAASUVORK5CYII=','base64');
(async()=>{
const dir=await fs.mkdtemp(path.join(tmpdir(),'nuwax-file-bridge-'));const target=path.join(dir,'saved.png');
let sameOriginAuthorization = null; let otherOriginAuthorization = null;
const otherServer=createServer((req,res)=>{otherOriginAuthorization=req.headers.authorization||null;res.writeHead(200,{'content-type':'image/png'});res.end(payload);});
await new Promise(r=>otherServer.listen(0,'127.0.0.1',r));
const otherOrigin=`http://127.0.0.1:${otherServer.address().port}`;
let markSlow;const slowStarted=new Promise(r=>{markSlow=r;});
const server=createServer((req,res)=>{
 if(req.url==='/cross'){sameOriginAuthorization=req.headers.authorization||null;res.writeHead(302,{location:otherOrigin+'/image'});res.end();return;}
 if(req.url==='/slow'){res.writeHead(200,{'content-type':'image/png'});res.write(payload);markSlow();return;}
 if(req.url==='/loop'){res.writeHead(302,{location:'/loop'});res.end();return;}
 if(req.url==='/redirect'){res.writeHead(302,{location:'/image'});res.end();return;}
 if(req.url==='/error'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({code:'4010',message:'expired'}));return;}
 if(req.url==='/broken'){res.writeHead(200,{'content-type':'image/png','content-length':100000});res.write(payload);setTimeout(()=>res.destroy(),20);return;}
 res.writeHead(200,{'content-type':'image/png'});res.end(payload);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const app=await _electron.launch({executablePath:executable,args:[__dirname+'/isolated-entry.cjs'],env:{...process.env,NODE_ENV:'production',NUWAX_QA_PROFILE:path.join(dir,'profile'),NUWAX_QA_RESOURCES:resources},timeout:60000});
try{
const page=await app.firstWindow();await page.waitForTimeout(8000);
await app.evaluate(({dialog},target)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:target});},target);
async function save(route){return app.evaluate(async({webContents},url)=>{const wc=webContents.getAllWebContents().find(w=>w.getType()==='webview');if(!wc)throw Error('no webview');return wc.executeJavaScript(`window.NuwaClawBridge.native.saveImage(${JSON.stringify(url)},'saved.png')`);},origin+route);}
for(const route of ['/image','/redirect']){const result=await save(route);assert.equal(result.success,true,JSON.stringify(result));assert.deepEqual(await fs.readFile(target),payload);console.log('PASS exact bytes',route);}
for(const route of ['/error','/broken','/loop']){const result=await save(route);assert.equal(result.success,false,JSON.stringify(result));assert.deepEqual(await fs.readFile(target),payload);assert(!(await fs.readdir(dir)).some(f=>f.endsWith('.part')));console.log('PASS failure preserves destination and cleans partial',route);}
await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});
const canceled=await save('/image');assert.equal(canceled.success,false);assert.equal(canceled.canceled,true);assert.deepEqual(await fs.readFile(target),payload);console.log('PASS dialog cancellation');
await app.evaluate(({dialog},target)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:target});},target);
const slow=save('/slow').catch(error=>({success:false,error:String(error)}));
await Promise.race([slowStarted,new Promise((_,reject)=>setTimeout(()=>reject(Error('slow request did not start')),10000))]);
const switched=await page.evaluate(()=>window.electronAPI.services.configureServerHost('https://agent.nuwax.com'));assert.equal(switched.success,true);
assert.equal((await slow).success,false);assert.deepEqual(await fs.readFile(target),payload);assert(!(await fs.readdir(dir)).some(f=>f.endsWith('.part')));console.log('PASS domain switch aborts pending transfer without overwrite');
// Two local origins stand in for business host and redirected CDN. No real credential is used.
const localHost=await page.evaluate(host=>window.electronAPI.services.configureServerHost(host),origin);assert.equal(localHost.success,true);
await page.waitForTimeout(2500);
const tokenBound=await app.evaluate(async({webContents})=>{const wc=webContents.getAllWebContents().find(w=>w.getType()==='webview');await wc.executeJavaScript('window.NuwaClawBridge.auth.getToken()');return wc.executeJavaScript('window.NuwaClawBridge.auth.persistToken("qa-fixture-token")');});assert.equal(tokenBound,true);
const cross=await save('/cross');assert.equal(cross.success,true,JSON.stringify(cross));assert.deepEqual(await fs.readFile(target),payload);
assert.equal(sameOriginAuthorization,'Bearer qa-fixture-token');assert.equal(otherOriginAuthorization,null);console.log('PASS bearer only to business origin, stripped on redirected origin');
console.log('PAYLOAD_SHA256' ,createHash('sha256').update(payload).digest('hex'));
console.log('PASS FILE_BRIDGE_FIXTURE',dir);
}finally{await app.close();await new Promise(r=>server.close(r));await new Promise(r=>otherServer.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
