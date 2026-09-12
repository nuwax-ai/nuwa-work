const {app}=require('electron');
const fs=require('fs');const path=require('path');
const profile=process.env.NUWAX_QA_PROFILE;
fs.mkdirSync(path.join(profile,'.nuwax'),{recursive:true});
fs.mkdirSync(path.join(profile,'appdata'),{recursive:true});
app.setPath('home',profile);app.setPath('appData',path.join(profile,'appdata'));
Object.defineProperty(app,'isPackaged',{get:()=>true});
Object.defineProperty(process,'resourcesPath',{value:process.env.NUWAX_QA_RESOURCES});
require(process.env.NUWAX_QA_MAIN || path.join(process.resourcesPath,'app.asar','dist','main','main.js'));
