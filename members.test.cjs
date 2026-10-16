'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {parseHTML}=require('linkedom');const handler=require('./member-server.cjs');
const root=__dirname;let calls=[];process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test-only';delete process.env.MEMBERSHIP_EMAIL_READY;
const user={id:'test-user-id',email_confirmed_at:'2026-10-16'};
global.fetch=async(url,opts)=>{calls.push({url,opts});if(url.endsWith('/user'))return {ok:opts.headers.Authorization==='Bearer valid',status:401,json:async()=>user};if(url.includes('token?'))return {ok:true,status:200,json:async()=>({access_token:'valid',refresh_token:'refresh-valid',expires_in:3600,user})};return {ok:true,status:200,json:async()=>({})};};
async function invoke(query,method='GET',body={},headers={}){const req={url:'/api/member',query,method,body,headers:{host:'test.example',origin:'https://test.example','content-type':'application/json',...headers}};const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v||'';}};await handler(req,res);return res;}
(async()=>{
let r=await invoke({asset:'trainer/'});assert.equal(r.statusCode,303);assert.equal(r.headers.Location,'/log-in/?next=%2Ftrainer%2F');
r=await invoke({asset:'trainer/cases.js'});assert.equal(r.statusCode,401);assert(!r.body.includes('CULTURE_DATA'));
r=await invoke({asset:'../cases.js'});assert.equal(r.statusCode,404);
r=await invoke({asset:'atlas/data.js'},'GET',{}, {cookie:'__Host-dm-access=forged'});assert.equal(r.statusCode,401);
r=await invoke({asset:'trainer/'},'GET',{}, {cookie:'__Host-dm-access=valid'});assert.equal(r.statusCode,200);assert(r.body.includes('test-user-id'));assert.equal(r.headers['Cache-Control'],'private, no-store, max-age=0');
r=await invoke({asset:'trainer/app.js'},'GET',{}, {cookie:'__Host-dm-access=valid'});assert(r.body.includes('window.DM_USER_ID'));
r=await invoke({asset:'atlas/'},'GET',{}, {cookie:'__Host-dm-access=valid'});assert(r.body.includes('href="/trainer/"'));
r=await invoke({asset:'trainer/'},'GET',{}, {cookie:'__Host-dm-access=expired; __Host-dm-refresh=refresh-valid'});assert.equal(r.statusCode,200);assert(r.headers['Set-Cookie'].every(c=>c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=Lax')));
r=await invoke({action:'login'},'POST',{email:'test@example.com',password:'test-password'}, {origin:'https://evil.example'});assert.equal(r.statusCode,403);
r=await invoke({action:'login'},'POST',{email:'test@example.com',password:'test-password'});assert.equal(r.statusCode,200);assert(!r.body.includes('access_token'));assert.equal(r.headers['Set-Cookie'].length,2);
r=await invoke({action:'signup'},'POST',{email:'test@example.com',password:'long-test-password'});assert.equal(r.statusCode,503);
r=await invoke({action:'recover'},'POST',{email:'test@example.com'});assert.equal(r.statusCode,503);
r=await invoke({action:'password'},'POST',{password:'long-test-password'});assert.equal(r.statusCode,401);
r=await invoke({action:'logout'},'POST',{});assert.equal(r.statusCode,200);assert(r.headers['Set-Cookie'].every(c=>c.includes('Max-Age=0')));
const publicFiles=fs.readdirSync(root+'/dist');for(const secret of ['cases.js','app.js','data.js','atlas.js','atlas-index.html'])assert(!publicFiles.includes(secret));assert(!fs.existsSync(root+'/dist/atlas'));
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(root+'/dist/samples.js','utf8'),ctx);assert.equal(ctx.window.DM_SAMPLES.length,5);assert.equal(new Set(ctx.window.DM_SAMPLES.map(x=>x.id)).size,5);
const {window}=parseHTML(fs.readFileSync(root+'/dist/samples/index.html','utf8'));window.DM_SAMPLES=ctx.window.DM_SAMPLES;const c=vm.createContext({window,document:window.document,URLSearchParams,location:{pathname:'/samples/',search:''},console});vm.runInContext(fs.readFileSync(root+'/public.js','utf8'),c);assert.equal(window.document.querySelectorAll('[data-case]').length,5);for(let i=0;i<5;i++){window.document.querySelector(`[data-case="${i}"]`).onclick();assert(window.document.querySelector('h1').textContent.includes(ctx.window.DM_SAMPLES[i].title));}
for(const [name,hash]of Object.entries(require('./TRAINER_CHECKSUMS.json')))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'/'+name)).digest('hex'),hash);
console.log('PASS: 5 samples, all sample navigation, guest HTML redirect, unauthenticated data rejection, forged-cookie rejection, allowlist traversal rejection, valid session, refresh, CSRF, HttpOnly cookies, logout, registration launch gate, protected static exclusion, unchanged original trainer files.');
})().catch(e=>{console.error(e);process.exitCode=1;});
