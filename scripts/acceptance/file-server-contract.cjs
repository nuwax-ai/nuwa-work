const {spawn}=require('node:child_process');const {mkdtemp,mkdir,readFile,rm}=require('node:fs/promises');const {tmpdir}=require('node:os');const path=require('node:path');const net=require('node:net');const assert=require('node:assert/strict');const {createHash}=require('node:crypto');const {inflateRawSync}=require('node:zlib');
const resource=process.env.NUWAX_QA_RESOURCES;if(!resource)throw Error('Set NUWAX_QA_RESOURCES');
const payload=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6C1kAAAAASUVORK5CYII=','base64');
function extractZipEntry(zip,basename){
 let end=-1;for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--){if(zip.readUInt32LE(i)===0x06054b50){end=i;break;}}assert(end>=0,'zip end record missing');
 const count=zip.readUInt16LE(end+10);let cursor=zip.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  assert.equal(zip.readUInt32LE(cursor),0x02014b50,'invalid central header');
  const nameLength=zip.readUInt16LE(cursor+28),extraLength=zip.readUInt16LE(cursor+30),commentLength=zip.readUInt16LE(cursor+32);
  const name=zip.subarray(cursor+46,cursor+46+nameLength).toString();
  if(path.posix.basename(name)===basename){
   const method=zip.readUInt16LE(cursor+10),size=zip.readUInt32LE(cursor+20),local=zip.readUInt32LE(cursor+42);
   assert.equal(zip.readUInt32LE(local),0x04034b50,'invalid local header');
   const start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
   const compressed=zip.subarray(start,start+size);
   if(method===0)return compressed;if(method===8)return inflateRawSync(compressed);throw Error('unsupported zip compression');
  }
  cursor+=46+nameLength+extraLength+commentLength;
 }
 throw Error('uploaded file missing from downloaded zip');
}
(async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'nuwax-fs-contract-'));const workspace=path.join(dir,'workspace');await mkdir(workspace);const roots=Object.fromEntries(['INIT_PROJECT_DIR','PROJECT_SOURCE_DIR','DIST_TARGET_DIR','UPLOAD_PROJECT_DIR','COMPUTER_WORKSPACE_DIR','LOG_BASE_DIR','COMPUTER_LOG_DIR'].map(x=>[x,path.join(dir,x)]));
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn(process.execPath,[path.join(resource,'nuwax-file-server','dist','server.js')],{cwd:path.join(resource,'nuwax-file-server'),env:{...process.env,...roots,PORT:String(port),NODE_ENV:'production',DEPLOYMENT_MODE:'local'},stdio:'ignore'});
 try{
  const base=`http://127.0.0.1:${port}`;let ready=false;
  for(let i=0;i<50;i++){if(child.exitCode!==null)throw Error('File server exited during startup');try{const r=await fetch(base+'/api/computer/fs/roots',{signal:AbortSignal.timeout(1000)});if(r.status<500){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
  assert(ready,'file server did not become ready');
  const data=new FormData();data.append('userId','qa4');data.append('cId','123');data.append('filePath','probe.png');data.append('customTargetDir',workspace);data.append('file',new Blob([payload],{type:'image/png'}),'probe.png');
  const upload=await fetch(base+'/api/computer/upload-file',{method:'POST',body:data});const uploadJson=await upload.json();assert.equal(uploadJson.success,true,JSON.stringify(uploadJson));
  assert.deepEqual(await readFile(path.join(workspace,'probe.png')),payload);
  const query=new URLSearchParams({userId:'qa4',cId:'123',customTargetDir:workspace});
  const list=await fetch(base+'/api/computer/get-file-list?'+query);const listJson=await list.json();assert.equal(listJson.success,true,JSON.stringify(listJson));
  const download=await fetch(base+'/api/computer/download-all-files?'+query);assert.equal(download.status,200);assert.match(download.headers.get('content-type')||'',/zip/);const archive=Buffer.from(await download.arrayBuffer());assert(archive.length>payload.length);assert.deepEqual(extractZipEntry(archive,'probe.png'),payload);
  console.log('PASS LOCAL_FILE_SERVER_UPLOAD_LIST_DOWNLOAD',JSON.stringify({port,uploadBytes:payload.length,zipBytes:archive.length,payloadSha256:createHash('sha256').update(payload).digest('hex')}));
 }finally{child.kill('SIGTERM');await new Promise(r=>{if(child.exitCode!==null)return r();const t=setTimeout(()=>{child.kill('SIGKILL');r();},5000);child.once('exit',()=>{clearTimeout(t);r();});});await rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
