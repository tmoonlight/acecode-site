import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import test from 'node:test';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire(path.join(root,'frontend/package.json'))('playwright');
const publicRoot=path.join(root,'dist');
const customerRoot=process.env.CUSTOMER_NAV_DIST;
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};

export async function inspectHeader(page) {
 await page.locator('.ace-unified-header').waitFor();
 await page.locator('.ace-unified-header select,.ace-unified-header [data-slot=select-trigger]').waitFor();
 await page.locator('.ace-unified-header button').last().waitFor();
 return page.locator('.ace-unified-header').evaluate(header=>{
  const shape=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:b.x,y:b.y,width:b.width,height:b.height,font:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight};};
  const controls=[...header.querySelectorAll('a,select,button')];
  return {header:shape(header),controls:controls.map(shape),overflow:document.documentElement.scrollWidth>innerWidth,labels:controls.map(e=>e.textContent.trim())};
 });
}

function sameGeometry(actual,expected,label) {
 assert.equal(actual.controls.length,expected.controls.length,label+' controls');
 for(const [i,a] of [actual.header,...actual.controls].entries()) {
  const b=[expected.header,...expected.controls][i];
  for(const key of ['x','y','width','height'])assert.ok(Math.abs(a[key]-b[key])<=.6,`${label} item ${i} ${key}: ${a[key]} != ${b[key]}`);
  assert.equal(a.font,b.font,label+' font');
  assert.equal(a.fontSize,b.fontSize,label+' font size');
  assert.equal(a.fontWeight,b.fontWeight,label+' font weight');
 }
 assert.equal(actual.overflow,false,label+' root overflow');
}

test('public navigation keeps its geometry across pages, themes, languages and hover',async()=>{
 const server=createServer(async(req,res)=>{
  try {
   const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
   const customer=pathname.startsWith('/customerv2')||pathname.startsWith('/admin/');
   const base=customer&&customerRoot?path.resolve(customerRoot):publicRoot;
   let relative=customer?(pathname.startsWith('/customerv2')?'index.html':pathname.replace(/^\/admin\//,'')):pathname.replace(/^\//,'');
   if(!relative||relative.endsWith('/'))relative+='index.html';
   const file=path.resolve(base,relative);assert.ok(file.startsWith(base+path.sep));
   const content=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(content);
  }catch{res.writeHead(404);res.end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [1440,820,390])for(const language of ['zh','zh-TW','en'])for(const theme of ['light','dark']) {
   const context=await browser.newContext({viewport:{width,height:900},locale:language==='en'?'en-US':'zh-CN',colorScheme:theme});
   await context.addInitScript(({language,theme})=>{localStorage.setItem('acecode.site.language.v1',language);localStorage.setItem('acecode.site.theme.v1',theme)}, {language,theme});
   await context.route(/\.(?:mp4|webm)(?:\?|$)/,r=>r.abort());
   const page=await context.newPage();let baseline;
   const routes=['/acemodel/','/key-usage/pricing/','/download/','/key-usage/guide/'];if(customerRoot)routes.push('/customerv2');
   for(const route of routes) {
    await page.goto(origin+route,{waitUntil:'load'});
    await page.waitForFunction(language=>{const s=document.querySelector('.ace-unified-header select');return s?s.value===language:!!document.querySelector('.ace-unified-header [data-slot=select-trigger]')},language);
    const current=await inspectHeader(page);const label=[width,language,theme,route].join(' ');
    assert.equal(current.controls.length,9,label);
    baseline??=current;sameGeometry(current,baseline,label);
    if(process.env.NAV_SCREENSHOT_DIR&&language==='zh'&&theme==='light'&&width!==820)await page.locator('.ace-unified-header').screenshot({path:path.join(process.env.NAV_SCREENSHOT_DIR,`preview-${route.replaceAll('/','-')}-${width}.png`)});
    await page.locator('.ace-unified-header .nav-cta,.ace-unified-header .ace-nav-cta').hover();
    // Narrow rows may scroll to bring the hovered item into view; compare at
    // the same scroll origin to test transforms rather than scroll position.
    await page.locator('.ace-unified-header nav').evaluate(nav=>{nav.scrollLeft=0});
    sameGeometry(await inspectHeader(page),current,label+' hover');
    await page.mouse.move(0,200);
    if(route==='/download/')assert.match(await page.locator('body').evaluate(e=>getComputedStyle(e).fontFamily),/ACE Pixel/);
   }
   await context.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
});
