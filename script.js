/* =====================================================================
   script.js — FULL REPLACEMENT for the new index.html + style.css
   
   • Replaces the old fetch-uploader: compression now runs 100% in the
     browser (privacy-first) with the geometric VFX engine.
   • BONUS hybrid mode: files over 80 MB automatically route to the
     optional Node backend (POST /api/compress/image from server.js)
     when it is reachable — relative URL, no hardcoded localhost.
   • Pairs with: index.html (steps/canvases), style.css, server.js.
   ===================================================================== */

/* ================================================================
   PART 1 — THREE.JS 3D COSMOS (background layer)
   ================================================================ */
(function(){
"use strict";
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
window.__fx3={setBusy:function(){},burst:function(){},punch:function(){}};
if(typeof THREE==='undefined') return;

const cv=document.getElementById('fx3d');
const renderer=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
renderer.setSize(innerWidth,innerHeight);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,120);
camera.position.set(0,0,9);

const PAL3=[0xff6b4a,0x4ee1c1,0xffd166,0x8fb0ff,0xff9ecb];

/* hero geodesic wireframe */
const hero=new THREE.Group();
hero.position.set(3.4,.4,0);
const heroEdges=new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.1,1)),
  new THREE.LineBasicMaterial({color:0x8fb0ff,transparent:true,opacity:.5}));
hero.add(heroEdges);
const heroCore=new THREE.Points(
  new THREE.IcosahedronGeometry(1.15,1),
  new THREE.PointsMaterial({color:0x4ee1c1,size:.055,transparent:true,opacity:.85}));
hero.add(heroCore);
const orbitA=new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,3.1,3.1).getPoints(96)),
  new THREE.LineBasicMaterial({color:0xffd166,transparent:true,opacity:.16}));
orbitA.rotation.x=Math.PI/2.3;
hero.add(orbitA);
const orbitB=new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,3.6,3.6).getPoints(96)),
  new THREE.LineBasicMaterial({color:0x4ee1c1,transparent:true,opacity:.12}));
orbitB.rotation.x=Math.PI/1.7; orbitB.rotation.y=.5;
hero.add(orbitB);
scene.add(hero);

/* satellite octahedron */
const sat=new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.05)),
  new THREE.LineBasicMaterial({color:0x4ee1c1,transparent:true,opacity:.42}));
sat.position.set(-3.7,-1.7,-.6);
scene.add(sat);

/* debris ring */
const ringGroup=new THREE.Group();
ringGroup.rotation.x=.4;
const debris=[];
for(let i=0;i<26;i++){
  const geoType=i%3;
  const geo=geoType===0?new THREE.TetrahedronGeometry(.1):geoType===1?new THREE.OctahedronGeometry(.09):new THREE.IcosahedronGeometry(.08);
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({wireframe:true,color:PAL3[i%PAL3.length],transparent:true,opacity:.75}));
  const a=i/26*Math.PI*2;
  mesh.position.set(Math.cos(a)*5.4,(Math.random()-.5)*2.4,Math.sin(a)*5.4);
  mesh.userData={rx:(Math.random()-.5)*.03,ry:(Math.random()-.5)*.03};
  ringGroup.add(mesh); debris.push(mesh);
}
scene.add(ringGroup);

/* starfields */
function makeStars(n,size,spread,opacity){
  const pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const r=spread*.5+Math.random()*spread;
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th);
    pos[i*3+1]=r*Math.sin(ph)*Math.sin(th)*.6;
    pos[i*3+2]=r*Math.cos(ph);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  return new THREE.Points(g,new THREE.PointsMaterial({color:0x9fb4e8,size:size,transparent:true,opacity:opacity,sizeAttenuation:true}));
}
const stars1=makeStars(650,.05,40,.75);
const stars2=makeStars(260,.09,34,.5);
stars2.material.color.set(0xffd166);
scene.add(stars1); scene.add(stars2);

/* state */
const mouseN={x:0,y:0};
addEventListener('pointermove',e=>{ mouseN.x=(e.clientX/innerWidth-.5)*2; mouseN.y=(e.clientY/innerHeight-.5)*2; });
let busyF=0,busyTarget=0,heroScale=1,camZ=9;
const baseCol=new THREE.Color(0x8fb0ff), busyCol=new THREE.Color(0xff6b4a), tmpCol=new THREE.Color();

/* 3D success explosions */
const bursts3=[];
function spawnBurst3(){
  const N=240, pos=new Float32Array(N*3), vel=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), v=.06+Math.random()*.14;
    vel[i*3]=v*Math.sin(ph)*Math.cos(th); vel[i*3+1]=v*Math.sin(ph)*Math.sin(th); vel[i*3+2]=v*Math.cos(ph);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:PAL3[(Math.random()*PAL3.length)|0],size:.07,transparent:true,opacity:1});
  const pts=new THREE.Points(g,mat);
  pts.position.copy(hero.position);
  scene.add(pts);
  bursts3.push({pts:pts,vel:vel,life:1});
}

const clock=new THREE.Clock();
function frame(){
  const t=clock.getElapsedTime();
  busyF+=(busyTarget-busyF)*.04;
  const speed=1+busyF*3.4;

  hero.rotation.x+=.0012*speed;
  hero.rotation.y+=.0018*speed;
  heroCore.rotation.y-=.004*speed;
  hero.position.y=.4+Math.sin(t*.6)*.16;
  tmpCol.copy(baseCol).lerp(busyCol,busyF);
  heroEdges.material.color.copy(tmpCol);
  heroScale+=(1-heroScale)*.06;
  const pulse=busyF>0?1+busyF*.03*Math.sin(t*6):1;
  hero.scale.setScalar(heroScale*pulse);
  orbitA.rotation.z+=.003*speed;
  orbitB.rotation.z-=.0022*speed;

  sat.rotation.x-=.004*speed; sat.rotation.y+=.006*speed;
  sat.position.y=-1.7+Math.sin(t*.8+2)*.2;

  ringGroup.rotation.y+=.0009*speed;
  for(const d of debris){ d.rotation.x+=d.userData.rx*speed; d.rotation.y+=d.userData.ry*speed; }

  stars1.rotation.y+=.00022; stars2.rotation.y-=.00015;

  for(let i=bursts3.length-1;i>=0;i--){
    const b=bursts3[i];
    const arr=b.pts.geometry.attributes.position.array;
    for(let j=0;j<arr.length;j+=3){
      arr[j]+=b.vel[j]; arr[j+1]+=b.vel[j+1]; arr[j+2]+=b.vel[j+2];
      b.vel[j]*=.985; b.vel[j+1]*=.985; b.vel[j+2]*=.985;
    }
    b.pts.geometry.attributes.position.needsUpdate=true;
    b.life-=.016; b.pts.material.opacity=Math.max(0,b.life);
    if(b.life<=0){ scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts3.splice(i,1); }
  }

  camZ=9-busyF*.9;
  camera.position.x+=(mouseN.x*.7-camera.position.x)*.04;
  camera.position.y+=(-mouseN.y*.45-camera.position.y)*.04;
  camera.position.z+=(camZ-camera.position.z)*.05;
  camera.lookAt(0,0,0);

  renderer.render(scene,camera);
}
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
if(REDUCED){ renderer.render(scene,camera); }
else{ (function loop(){ frame(); requestAnimationFrame(loop); })(); }

window.__fx3={
  setBusy:function(on){ busyTarget=on?1:0; },
  burst:function(){ if(!REDUCED){ spawnBurst3(); heroScale=1.3; } },
  punch:function(){ if(!REDUCED) heroScale=1.14; }
};
})();

/* ================================================================
   PART 2 — APP LOGIC + 2D FX + HYBRID SERVER FALLBACK
   ================================================================ */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const card=$('card'), stepDrop=$('stepDrop'), stepReady=$('stepReady'), stepDone=$('stepDone');
const dropZone=$('dropZone'), fileInput=$('fileInput'), imagePreview=$('imagePreview'), cancelBtn=$('cancelBtn');
const sizeSlider=$('sizeSlider'), kbEcho=$('kbEcho'), kbRead=$('kbRead'), chipsBox=$('chips'), codecSeg=$('codecSeg'), segNote=$('segNote');
const compressBtn=$('compressBtn'), statusRow=$('statusRow'), dropStatus=$('dropStatus'), srcInfo=$('srcInfo');
const processing=$('processing'), ringFg=$('ringFg'), procPct=$('procPct'), procLabel=$('procLabel'), squeezeImg=$('squeezeImg');
const compareEl=$('compare'), compareRange=$('compareRange'), cmpOriginal=$('cmpOriginal'), cmpCompressed=$('cmpCompressed');
const sizeBefore=$('sizeBefore'), sizeAfter=$('sizeAfter'), savedBadge=$('savedBadge'), finePrint=$('finePrint');
const downloadBtn=$('downloadBtn'), againBtn=$('againBtn');

const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER=matchMedia('(pointer: fine)').matches;
const HEX_C=468;

/* Hybrid engine limits:
   ≤ 80 MB  → on-device engine (private, offline-capable)
   > 80 MB  → optional Node backend /api/compress/image (same origin) */
const CLIENT_MAX=80*1024*1024;
const SERVER_MAX=200*1024*1024;
const SERVER_API='/api/compress/image';

/* ---- UI micro-animation systems ---- */
document.querySelectorAll('.fmt').forEach((f,i)=>{ f.style.animationDelay=(0.9+i*0.055)+'s'; });

const GLYPHS='◜◞▮#%◇+=*◊';
function scramble(el,text){
  if(REDUCED){ el.textContent=text; return; }
  cancelAnimationFrame(el._sc);
  let frame=0;
  (function step(){
    frame++;
    const resolved=Math.floor(frame/1.6);
    let out='';
    for(let i=0;i<text.length;i++){
      out+=i<resolved?text[i]:(text[i]===' '?' ':GLYPHS[(Math.random()*GLYPHS.length)|0]);
    }
    el.textContent=out;
    if(resolved<text.length) el._sc=requestAnimationFrame(step);
  })();
}

function attachRipple(el){
  el.addEventListener('pointerdown',e=>{
    const r=el.getBoundingClientRect();
    const s=document.createElement('span');
    s.className='ripple';
    const d=Math.max(r.width,r.height)*.7;
    s.style.width=s.style.height=d+'px';
    s.style.left=(e.clientX-r.left-d/2)+'px';
    s.style.top=(e.clientY-r.top-d/2)+'px';
    el.appendChild(s);
    setTimeout(()=>s.remove(),650);
  });
}
[compressBtn,downloadBtn,againBtn].forEach(attachRipple);

document.querySelectorAll('.magnetic').forEach(el=>{
  el.addEventListener('pointermove',e=>{
    if(REDUCED) return;
    const r=el.getBoundingClientRect();
    const dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
    el.style.transform='translate('+(dx*.14).toFixed(1)+'px,'+(dy*.24).toFixed(1)+'px)';
  });
  el.addEventListener('pointerleave',()=>{
    el.style.transition='transform .4s cubic-bezier(.34,1.56,.64,1)';
    el.style.transform='';
    setTimeout(()=>{ el.style.transition=''; },400);
  });
});

if(FINE_POINTER){
  card.addEventListener('pointermove',e=>{
    const r=card.getBoundingClientRect();
    card.style.setProperty('--gx',(e.clientX-r.left)+'px');
    card.style.setProperty('--gy',(e.clientY-r.top)+'px');
  });
}
const tilt={x:0,y:0,tx:0,ty:0};
if(!REDUCED && FINE_POINTER){
  card.addEventListener('pointermove',e=>{
    const r=card.getBoundingClientRect();
    tilt.tx=((e.clientY-r.top)/r.height-.5)*-3;
    tilt.ty=((e.clientX-r.left)/r.width-.5)*3;
  });
  card.addEventListener('pointerleave',()=>{ tilt.tx=0; tilt.ty=0; });
  (function tiltLoop(){
    tilt.x+=(tilt.tx-tilt.x)*.1; tilt.y+=(tilt.ty-tilt.y)*.1;
    card.style.transform='perspective(1100px) rotateX('+tilt.x.toFixed(2)+'deg) rotateY('+tilt.y.toFixed(2)+'deg)';
    requestAnimationFrame(tiltLoop);
  })();
}
function cardImpact(){
  if(REDUCED) return;
  card.classList.remove('impact'); void card.offsetWidth; card.classList.add('impact');
}

let curStep=stepDrop;
function showStep(el){
  if(el===curStep) return;
  const old=curStep; curStep=el;
  old.classList.add('leaving');
  setTimeout(()=>{
    old.classList.remove('active','leaving');
    el.classList.add('active');
    if(el===stepDone) sweepCompare();
  },250);
}
function sweepCompare(){
  if(REDUCED){ compareEl.style.setProperty('--pos','50%'); return; }
  const t0=performance.now(), dur=1100;
  (function step(t){
    const p=Math.min(1,(t-t0)/dur);
    const e=1-Math.pow(1-p,3);
    const pos=6+44*e;
    compareEl.style.setProperty('--pos',pos+'%');
    compareRange.value=pos;
    if(p<1) requestAnimationFrame(step);
  })(t0);
}
compareRange.addEventListener('input',()=>compareEl.style.setProperty('--pos',compareRange.value+'%'));

/* ---- format registry ---- */
const TIFF_SET=new Set(['tif','tiff']);
const HEIF_SET=new Set(['heic','heif','hif']);
const NATIVE_SET=new Set(['jpg','jpeg','jfif','pjpeg','pjp','png','apng','gif','webp','avif','svg','bmp','ico','cur']);
const UTIF_URL='https://cdn.jsdelivr.net/npm/utif2@1.0.1/build/UTIF.js';
const HEIF_URL='https://cdn.jsdelivr.net/npm/libheif-js@1.17.1/libheif-bundle.js';
const libCache={};
function loadScript(url){
  if(!libCache[url]){
    libCache[url]=new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src=url; s.onload=res; s.onerror=()=>rej(new Error('lib-load'));
      document.head.appendChild(s);
    });
  }
  return libCache[url];
}
function extOf(file){ return ((file.name||'').split('.').pop()||'').toLowerCase(); }

let currentFile=null, originalURL=null, compressedURL=null, sourceCanvas=null;
let outputMime='image/webp', busy=false, serverMode=false;

/* ---- helpers ---- */
function fmtBytes(b){
  if(b>=1048576) return (b/1048576).toFixed(2)+' MB';
  if(b>=1024)    return (b/1024).toFixed(1)+' KB';
  return Math.round(b)+' B';
}
function clampKB(v){ return Math.min(5000, Math.max(50, Math.round(v)||500)); }
function tick(){ return new Promise(r=>setTimeout(r,0)); }
function loadImage(url){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('decode')); im.src=url; }); }
function probeDims(url){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight});
    im.onerror=()=>res({w:0,h:0});
    im.src=url;
  });
}
function canvasBlob(cv,mime,q){
  return new Promise(res=>{
    cv.toBlob(b=>{
      if(b) return res(b);
      const d=cv.toDataURL(mime,q), bin=atob(d.split(',')[1]), arr=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
      res(new Blob([arr],{type:mime}));
    },mime,q);
  });
}
function springCount(el,target,fmt,dur){
  dur=dur||800; const t0=performance.now();
  function fr(t){
    const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=fmt(target*e);
    if(p<1) requestAnimationFrame(fr); else el.textContent=fmt(target);
  }
  requestAnimationFrame(fr);
}
function setStatus(kind,msg){ statusRow.className='status-row'+(kind?' '+kind:''); statusRow.innerHTML=msg||''; }
function setDropStatus(kind,msg){ dropStatus.className='status-row'+(kind?' '+kind:''); dropStatus.innerHTML=msg||''; }
function setSrcInfo(extn,size,w,h,via){
  srcInfo.innerHTML='<b>'+extn.toUpperCase()+'</b> · '+fmtBytes(size)+(w?' · '+w+'×'+h+' px':' · vector')+
    ' · engine: <em>'+via+'</em>';
}

/* ---- exotic decoders (on-device) ---- */
async function decodeTiff(file){
  await loadScript(UTIF_URL);
  const buf=await file.arrayBuffer();
  const ifds=window.UTIF.decode(buf);
  if(!ifds.length) throw new Error('tiff-empty');
  const ifd=ifds[0];
  window.UTIF.decodeImage(buf,ifd);
  const rgba=window.UTIF.toRGBA8(ifd);
  const w=ifd.width,h=ifd.height;
  if(!w||!h) throw new Error('tiff-dims');
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const ctx=cv.getContext('2d');
  const imgData=ctx.createImageData(w,h);
  imgData.data.set(rgba);
  ctx.putImageData(imgData,0,0);
  return cv;
}
async function decodeHeif(file){
  await loadScript(HEIF_URL);
  const buf=await file.arrayBuffer();
  const decoder=new (window.libheif)();
  const images=decoder.decode(buf);
  if(!images||!images.length) throw new Error('heic-empty');
  const image=images[0];
  const w=image.get_width(), h=image.get_height();
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const ctx=cv.getContext('2d');
  await new Promise((res,rej)=>{
    const to=setTimeout(()=>rej(new Error('heic-timeout')),25000);
    try{ image.display(ctx,()=>{ clearTimeout(to); res(); }); }
    catch(e){ clearTimeout(to); rej(e); }
  });
  return cv;
}
async function buildNativeCanvas(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await loadImage(url);
    let w=img.naturalWidth,h=img.naturalHeight;
    if(!w||!h){ w=1024; h=1024; }
    const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
    cv.getContext('2d').drawImage(img,0,0,w,h);
    return cv;
  } finally{ URL.revokeObjectURL(url); }
}

/* ---- optional server engine (files > 80 MB) ---- */
async function serverCompress(file,targetKB){
  const fd=new FormData();
  fd.append('file',file);
  fd.append('targetSize',targetKB);
  const resp=await fetch(SERVER_API,{method:'POST',body:fd});
  if(!resp.ok){
    let msg='Server error '+resp.status;
    try{ const j=await resp.json(); if(j&&j.error) msg=j.error; }catch(e){}
    throw new Error(msg);
  }
  const blob=await resp.blob();
  const meta={
    quality:resp.headers.get('X-Compression-Quality')||'?',
    time:resp.headers.get('X-Processing-Time')||'?'
  };
  return {blob:blob,meta:meta};
}

/* ---- 2D FX layers ---- */
const backCv=$('fxBack'), frontCv=$('fxFront');
const bctx=backCv.getContext('2d'), fctx=frontCv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=innerWidth; H=innerHeight;
  [backCv,frontCv].forEach(cv2=>{ cv2.width=W*DPR; cv2.height=H*DPR; cv2.style.width=W+'px'; cv2.style.height=H+'px'; });
  bctx.setTransform(DPR,0,0,DPR,0,0); fctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize',resize); resize();

const PAL=['#ff6b4a','#4ee1c1','#ffd166','#8fb0ff','#ff9ecb'];
const mouse={x:W/2,y:H/2,tx:W/2,ty:H/2};
function hexPath(ctx,x,y,r,rot){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=rot+i*Math.PI/3;
    const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
    i?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.closePath();
}
function cardRect(){ return card.getBoundingClientRect(); }

const shardsAmb=[];
if(!REDUCED){
  for(let i=0;i<11;i++){
    shardsAmb.push({
      x:Math.random()*W, y:Math.random()*H,
      z:.35+Math.random()*.65, r:7+Math.random()*15,
      rot:Math.random()*Math.PI*2, spin:(Math.random()-.5)*.008,
      vx:(Math.random()-.5)*.14, vy:(Math.random()-.5)*.1,
      sides:Math.random()<.5?3:6, c:PAL[i%PAL.length]
    });
  }
}

let vortexOn=false; const vortex={x:W/2,y:H/2};
const SPIRAL_ARMS=3, SPIRAL_PTS=26, SPIRAL_COLS=['#4ee1c1','#ffd166','#ff6b4a'];
let spiralPhase=0;
const hexWaves=[], shardBursts=[];
const ret={x:W/2,y:H/2,rot:0,scale:1};

function hexWave(x,y,big){ if(!REDUCED) hexWaves.push({x:x,y:y,r:big?10:6,a:big?.7:.5,rot:Math.random()*Math.PI/3,grow:big?9:6}); }
function shardBurst(x,y,n,pow){
  if(REDUCED) return;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, v=(pow||6)*(0.3+Math.random());
    shardBursts.push({
      x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2.6,g:.12,
      rot:Math.random()*Math.PI*2, vr:(Math.random()-.5)*.3,
      size:3+Math.random()*6, c:PAL[(Math.random()*PAL.length)|0],
      life:1, decay:.010+Math.random()*.012, sides:Math.random()<.6?3:4
    });
  }
}
addEventListener('pointermove',e=>{ mouse.tx=e.clientX; mouse.ty=e.clientY; });
addEventListener('pointerdown',()=>{ ret.scale=1.7; });

function renderBack(t){
  const tt=t/1000;
  bctx.clearRect(0,0,W,H);
  const r0=cardRect(), cx=r0.left+r0.width/2, cy=r0.top+r0.height/2;
  const m=Math.max(r0.width,r0.height);
  bctx.lineWidth=1; bctx.strokeStyle='#9fb4e8';
  bctx.globalAlpha=.07; hexPath(bctx,cx,cy,m*.66, tt*.06); bctx.stroke();
  bctx.globalAlpha=.06; hexPath(bctx,cx,cy,m*.82,-tt*.045+.5); bctx.stroke();
  bctx.globalAlpha=.08; bctx.setLineDash([2,7]);
  bctx.beginPath(); bctx.arc(cx,cy,m*.97,0,7); bctx.stroke(); bctx.setLineDash([]);
  bctx.globalAlpha=.09;
  for(let i=0;i<60;i++){
    const a=tt*.03+i*Math.PI/30, long=i%5===0;
    const r1=m*.97, r2=r1+(long?10:5);
    bctx.beginPath();
    bctx.moveTo(cx+Math.cos(a)*r1, cy+Math.sin(a)*r1);
    bctx.lineTo(cx+Math.cos(a)*r2, cy+Math.sin(a)*r2);
    bctx.stroke();
  }
  bctx.globalAlpha=1;
  for(const s of shardsAmb){
    s.x+=s.vx; s.y+=s.vy; s.rot+=s.spin;
    if(s.x<-30)s.x=W+30; if(s.x>W+30)s.x=-30;
    if(s.y<-30)s.y=H+30; if(s.y>H+30)s.y=-30;
    const px=s.x+(mouse.x-W/2)*-.025*s.z, py=s.y+(mouse.y-H/2)*-.025*s.z;
    bctx.globalAlpha=.09+.13*s.z;
    bctx.strokeStyle=s.c; bctx.lineWidth=1;
    bctx.beginPath();
    for(let k=0;k<s.sides;k++){
      const a=s.rot+k*2*Math.PI/s.sides;
      const qx=px+Math.cos(a)*s.r, qy=py+Math.sin(a)*s.r;
      k?bctx.lineTo(qx,qy):bctx.moveTo(qx,qy);
    }
    bctx.closePath(); bctx.stroke();
  }
  bctx.globalAlpha=1;
}
function renderFront(t){
  const tt=t/1000;
  fctx.clearRect(0,0,W,H);
  if(vortexOn){
    spiralPhase=(spiralPhase+.0045)%1;
    const maxR=Math.min(260,Math.max(150,Math.min(W,H)*.3));
    fctx.globalCompositeOperation='lighter';
    const pr=26+6*Math.sin(tt*5);
    const g=fctx.createRadialGradient(vortex.x,vortex.y,0,vortex.x,vortex.y,pr*2.2);
    g.addColorStop(0,'rgba(255,209,102,.5)'); g.addColorStop(1,'rgba(255,107,74,0)');
    fctx.fillStyle=g; fctx.beginPath(); fctx.arc(vortex.x,vortex.y,pr*2.2,0,7); fctx.fill();
    for(let arm=0;arm<SPIRAL_ARMS;arm++){
      let prevX=0,prevY=0,has=false;
      fctx.strokeStyle=SPIRAL_COLS[arm]; fctx.lineWidth=1.2;
      for(let i=0;i<SPIRAL_PTS;i++){
        const s=(spiralPhase+i/SPIRAL_PTS)%1;
        const dist=maxR*(1-s);
        const ang=arm*2*Math.PI/3 + s*4.6 + tt*.5;
        const px=vortex.x+Math.cos(ang)*dist, py=vortex.y+Math.sin(ang)*dist;
        if(has){
          fctx.globalAlpha=.08+.6*s;
          fctx.beginPath(); fctx.moveTo(prevX,prevY); fctx.lineTo(px,py); fctx.stroke();
        }
        fctx.globalAlpha=.2+.75*s;
        fctx.fillStyle=SPIRAL_COLS[arm];
        fctx.beginPath(); fctx.arc(px,py,1.1+2.2*s,0,7); fctx.fill();
        prevX=px; prevY=py; has=true;
      }
    }
    fctx.globalAlpha=1; fctx.globalCompositeOperation='source-over';
  }
  fctx.globalCompositeOperation='lighter';
  for(let i=hexWaves.length-1;i>=0;i--){
    const wv=hexWaves[i];
    wv.r+=wv.grow; wv.a-=.018; wv.rot+=.012;
    if(wv.a<=0){ hexWaves.splice(i,1); continue; }
    fctx.globalAlpha=Math.max(0,wv.a);
    fctx.strokeStyle='#ffd166'; fctx.lineWidth=1.6;
    hexPath(fctx,wv.x,wv.y,wv.r,wv.rot); fctx.stroke();
    fctx.globalAlpha=Math.max(0,wv.a*.5);
    fctx.strokeStyle='#4ee1c1';
    hexPath(fctx,wv.x,wv.y,wv.r*.72,-wv.rot); fctx.stroke();
  }
  for(let i=shardBursts.length-1;i>=0;i--){
    const s=shardBursts[i];
    s.x+=s.vx; s.y+=s.vy; s.vy+=s.g; s.rot+=s.vr; s.life-=s.decay;
    if(s.life<=0){ shardBursts.splice(i,1); continue; }
    fctx.globalAlpha=Math.max(0,s.life);
    fctx.fillStyle=s.c;
    fctx.save(); fctx.translate(s.x,s.y); fctx.rotate(s.rot);
    fctx.beginPath();
    if(s.sides===4){ fctx.rect(-s.size/2,-s.size/2,s.size,s.size); }
    else{
      fctx.moveTo(0,-s.size*.62);
      fctx.lineTo(s.size*.55,s.size*.42);
      fctx.lineTo(-s.size*.55,s.size*.42);
      fctx.closePath();
    }
    fctx.fill(); fctx.restore();
  }
  fctx.globalCompositeOperation='source-over'; fctx.globalAlpha=1;
  if(FINE_POINTER){
    ret.x+=(mouse.tx-ret.x)*.2; ret.y+=(mouse.ty-ret.y)*.2;
    ret.rot+=.022; ret.scale+=(1-ret.scale)*.12;
    mouse.x+=(mouse.tx-mouse.x)*.1; mouse.y+=(mouse.ty-mouse.y)*.1;
    fctx.save();
    fctx.translate(ret.x,ret.y); fctx.rotate(ret.rot); fctx.scale(ret.scale,ret.scale);
    fctx.strokeStyle='rgba(78,225,193,.75)'; fctx.lineWidth=1.2;
    hexPath(fctx,0,0,13,0); fctx.stroke();
    fctx.rotate(-ret.rot*2);
    fctx.strokeStyle='rgba(143,176,255,.4)';
    fctx.beginPath(); fctx.arc(0,0,19,0,7); fctx.setLineDash([3,6]); fctx.stroke(); fctx.setLineDash([]);
    fctx.restore();
    fctx.fillStyle='#ffd166';
    fctx.beginPath(); fctx.arc(ret.x,ret.y,1.6,0,7); fctx.fill();
  } else { mouse.x+=(mouse.tx-mouse.x)*.1; mouse.y+=(mouse.ty-mouse.y)*.1; }
}
if(REDUCED){ renderBack(1200); }
else{ (function loop(t){ renderBack(t||0); renderFront(t||0); requestAnimationFrame(loop); })(0); }

function cardCenter(){ const r=card.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; }

/* ---- codec detect ---- */
const SEG_NOTES={
  'image/webp':'WebP — best size-to-quality ratio.',
  'image/jpeg':'JPEG — opens everywhere, even grandma\u2019s phone.',
  'image/png':'PNG — lossless, keeps transparency. Size comes from dimensions.'
};
(function(){
  const c=document.createElement('canvas'); c.width=c.height=2;
  if(c.toDataURL('image/webp').indexOf('data:image/webp')!==0){
    outputMime='image/jpeg';
    const w=codecSeg.querySelector('[data-mime="image/webp"]'), j=codecSeg.querySelector('[data-mime="image/jpeg"]');
    w.disabled=true; w.classList.remove('is-on'); j.classList.add('is-on');
    segNote.textContent=SEG_NOTES['image/jpeg'];
  }
})();
codecSeg.addEventListener('click',e=>{
  const b=e.target.closest('button[data-mime]');
  if(!b||b.disabled||busy) return;
  codecSeg.querySelectorAll('button').forEach(x=>x.classList.toggle('is-on',x===b));
  outputMime=b.dataset.mime;
  segNote.textContent=serverMode?'Server engine outputs JPEG.':(SEG_NOTES[outputMime]||'');
});

/* ---- slider ---- */
function paintSlider(){
  const p=(sizeSlider.value-sizeSlider.min)/(sizeSlider.max-sizeSlider.min)*100;
  sizeSlider.style.setProperty('--fill',p+'%');
  kbEcho.textContent=Number(sizeSlider.value).toLocaleString();
}
sizeSlider.addEventListener('input',()=>{
  paintSlider();
  kbRead.classList.remove('bump'); void kbRead.offsetWidth; kbRead.classList.add('bump');
  chipsBox.querySelectorAll('.chip').forEach(c=>c.classList.toggle('is-on',Number(c.dataset.kb)===Number(sizeSlider.value)));
});
chipsBox.addEventListener('click',e=>{
  const c=e.target.closest('.chip'); if(!c) return;
  sizeSlider.value=c.dataset.kb; paintSlider();
  chipsBox.querySelectorAll('.chip').forEach(x=>x.classList.toggle('is-on',x===c));
  const cc=cardCenter(); shardBurst(cc.x,cc.y,8,3);
});
paintSlider();

/* ---- file intake (hybrid routing) ---- */
async function acceptFile(file){
  if(!file) return;
  const extn=extOf(file);
  const known=NATIVE_SET.has(extn)||TIFF_SET.has(extn)||HEIF_SET.has(extn);
  if(!known && (!file.type || file.type.indexOf('image/')!==0)){
    setDropStatus('err','.'+(extn||'?')+' isn\u2019t an image format I know. Try JPG, PNG, WEBP, TIFF, HEIC…');
    return;
  }
  if(file.size>SERVER_MAX){ setDropStatus('err','Over the 200 MB limit — even the server engine taps out.'); return; }

  setDropStatus('',''); setStatus('','');
  if(originalURL && originalURL.indexOf('blob:')===0) URL.revokeObjectURL(originalURL);
  originalURL=null; sourceCanvas=null;
  currentFile=file;
  serverMode=file.size>CLIENT_MAX;

  /* huge file → server engine path */
  if(serverMode){
    showStep(stepReady);
    originalURL=URL.createObjectURL(file);
    imagePreview.src=originalURL;
    setSrcInfo(extn,file.size,0,0,'SERVER (sharp) — too big for on-device');
    segNote.textContent='Server engine outputs JPEG.';
    const probe=new Image();
    probe.onload=()=>{ if(currentFile===file) setSrcInfo(extn,file.size,probe.naturalWidth,probe.naturalHeight,'SERVER (sharp)'); };
    probe.src=originalURL;
    const cc=cardCenter(); hexWave(cc.x,cc.y,true); shardBurst(cc.x,cc.y,22,5);
    cardImpact(); window.__fx3.punch();
    return;
  }

  /* TIFF / HEIC → in-browser decoders */
  if(TIFF_SET.has(extn)||HEIF_SET.has(extn)){
    showStep(stepReady);
    imagePreview.removeAttribute('src');
    setSrcInfo(extn,file.size,0,0,'loading decoder…');
    setStatus('info','⚙ Fetching '+extn.toUpperCase()+' decoder & unpacking pixels…');
    compressBtn.disabled=true;
    try{
      sourceCanvas=TIFF_SET.has(extn)?await decodeTiff(file):await decodeHeif(file);
      originalURL=sourceCanvas.toDataURL('image/jpeg',.9);
      imagePreview.src=originalURL;
      setSrcInfo(extn,file.size,sourceCanvas.width,sourceCanvas.height,TIFF_SET.has(extn)?'UTIF (on-device)':'libheif (on-device)');
      setStatus('','');
    }catch(err){
      setStatus('err','Couldn\u2019t decode this '+extn.toUpperCase()+' file. Try converting it to PNG/JPG first.');
      setSrcInfo(extn,file.size,0,0,'decoder failed');
    }finally{ compressBtn.disabled=false; }
    cardImpact(); window.__fx3.punch();
    return;
  }

  /* native formats */
  originalURL=URL.createObjectURL(file);
  imagePreview.src=originalURL;
  showStep(stepReady);
  setSrcInfo(extn,file.size,0,0,'on-device canvas');
  const probe=new Image();
  probe.onload=()=>{
    if(currentFile===file) setSrcInfo(extn,file.size,probe.naturalWidth,probe.naturalHeight,'on-device canvas');
  };
  probe.src=originalURL;
  const cc=cardCenter(); hexWave(cc.x,cc.y,true); shardBurst(cc.x,cc.y,22,5);
  cardImpact(); window.__fx3.punch();
}
dropZone.addEventListener('click',()=>fileInput.click());
dropZone.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener('change',()=>acceptFile(fileInput.files[0]));
let dragDepth=0;
dropZone.addEventListener('dragenter',e=>{ e.preventDefault(); dragDepth++; dropZone.classList.add('is-dragging'); });
dropZone.addEventListener('dragover',e=>e.preventDefault());
dropZone.addEventListener('dragleave',e=>{ e.preventDefault(); if(--dragDepth<=0){ dragDepth=0; dropZone.classList.remove('is-dragging'); } });
dropZone.addEventListener('drop',e=>{
  e.preventDefault(); dragDepth=0; dropZone.classList.remove('is-dragging');
  if(e.dataTransfer.files.length) acceptFile(e.dataTransfer.files[0]);
});

function fullReset(){
  if(originalURL && originalURL.indexOf('blob:')===0) URL.revokeObjectURL(originalURL);
  if(compressedURL) URL.revokeObjectURL(compressedURL);
  originalURL=compressedURL=null; currentFile=null; sourceCanvas=null;
  serverMode=false; fileInput.value='';
  srcInfo.textContent=''; setStatus('',''); setDropStatus('','');
  segNote.textContent=SEG_NOTES[outputMime]||'';
  showStep(stepDrop);
}
cancelBtn.addEventListener('click',()=>{ const cc=cardCenter(); shardBurst(cc.x,cc.y,12,4); fullReset(); });
againBtn.addEventListener('click',fullReset);

/* ---- progress UI ---- */
function setProgress(frac,label){
  const p=Math.min(1,Math.max(0,frac));
  ringFg.style.strokeDashoffset=(HEX_C*(1-p)).toFixed(1);
  procPct.textContent=Math.round(p*100)+'%';
  if(label) scramble(procLabel,label);
  squeezeImg.style.transform='scale('+(1-p*.22).toFixed(3)+') rotate('+(p*6).toFixed(1)+'deg)';
}

/* ---- on-device compression engine ---- */
function renderScaled(src,scale,mime){
  const w=Math.max(1,Math.round(src.width*scale));
  const h=Math.max(1,Math.round(src.height*scale));
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const ctx=cv.getContext('2d');
  if(mime==='image/jpeg'){ ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); }
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(src,0,0,w,h);
  return cv;
}
async function compressPNG(src,targetBytes,onPass){
  let scale=1,blob=null,w=src.width,h=src.height,passes=0;
  for(let round=0;round<8;round++){
    passes++; onPass(passes);
    const cv=renderScaled(src,scale,'image/png');
    w=cv.width; h=cv.height;
    setProgress((round+0.5)/8,'PASS '+passes+' · LOSSLESS ENCODE');
    blob=await canvasBlob(cv,'image/png'); await tick();
    if(blob.size<=targetBytes) return {blob:blob,quality:1,width:w,height:h,passes:passes,hit:true};
    scale*=Math.max(.2,Math.sqrt(targetBytes/Math.max(1,blob.size))*.9);
    if(scale<.04) break;
  }
  return {blob:blob,quality:1,width:w,height:h,passes:passes,hit:false};
}
async function compressLossy(src,targetBytes,mime,onPass){
  const MIN_Q=.35, MAX_Q=.96, ITER=7, ROUNDS=5;
  let scale=1,passes=0,best=null,bestQ=MAX_Q,bestW=0,bestH=0;
  for(let round=0;round<ROUNDS;round++){
    passes++; onPass(passes);
    const cv=renderScaled(src,scale,mime);
    const w=cv.width,h=cv.height;
    let lo=MIN_Q,hi=MAX_Q,found=null,foundQ=MIN_Q;
    for(let i=0;i<ITER;i++){
      const q=(lo+hi)/2;
      setProgress((round+i/ITER)/ROUNDS,'PASS '+passes+' · QUALITY '+Math.round(q*100)+'%');
      const blob=await canvasBlob(cv,mime,q); await tick();
      if(blob.size<=targetBytes){ found=blob; foundQ=q; lo=q; } else hi=q;
    }
    if(found){ best=found; bestQ=foundQ; bestW=w; bestH=h; break; }
    const floor=await canvasBlob(cv,mime,MIN_Q);
    if(!best||floor.size<best.size){ best=floor; bestQ=MIN_Q; bestW=w; bestH=h; }
    scale*=Math.max(.2,Math.sqrt(targetBytes/Math.max(1,floor.size))*.92);
    if(scale<.04) break;
  }
  setProgress(1,'POLISHING…');
  return {blob:best,quality:bestQ,width:bestW,height:bestH,passes:passes,hit:best.size<=targetBytes};
}

/* ---- shared results renderer ---- */
async function presentResults(res,ext,qTxt,timeMs){
  if(compressedURL) URL.revokeObjectURL(compressedURL);
  compressedURL=URL.createObjectURL(res.blob);
  const base=(currentFile.name.replace(/\.[^.]+$/,'')||'image');
  downloadBtn.href=compressedURL;
  downloadBtn.download=base+'-squeezed.'+ext;

  cmpOriginal.src=originalURL; cmpCompressed.src=compressedURL;
  compareRange.value=50; compareEl.style.setProperty('--pos','50%');
  const orig=currentFile.size, comp=res.blob.size;
  const saved=(orig-comp)/orig*100;

  showStep(stepDone);
  springCount(sizeBefore,orig,fmtBytes);
  springCount(sizeAfter,comp,fmtBytes);
  savedBadge.classList.toggle('over',saved<0);
  savedBadge.textContent=(saved>=0?'−':'+')+Math.abs(saved).toFixed(1)+'%';
  finePrint.textContent=ext.toUpperCase()+' · '+qTxt+' · '+(res.passes?res.passes+(res.passes===1?' pass':' passes')+' · ':'')+res.width+'×'+res.height+' px · '+(timeMs/1000).toFixed(1)+'s'+(res.hit?'':' · best effort');

  const c2=cardCenter();
  hexWave(c2.x,c2.y,true);
  shardBurst(c2.x,c2.y-40,46,7.5);
  setTimeout(()=>{ hexWave(c2.x-150,c2.y-70,false); shardBurst(c2.x-150,c2.y-70,20,5); },200);
  setTimeout(()=>{ hexWave(c2.x+150,c2.y-70,false); shardBurst(c2.x+150,c2.y-70,20,5); },360);

  if(saved<0) setStatus('info','Heads up: re-encoding grew it slightly — try a lower target.');
}

/* ---- main compress handler (hybrid) ---- */
compressBtn.addEventListener('click',async()=>{
  if(busy||!currentFile) return;
  busy=true; compressBtn.disabled=true; setStatus('','');

  const targetKB=clampKB(Number(sizeSlider.value));
  const targetBytes=targetKB*1024;
  squeezeImg.src=originalURL;
  processing.classList.add('active');
  setProgress(0,'WARMING UP');
  const cc=cardCenter(); vortex.x=cc.x; vortex.y=cc.y; vortexOn=true; hexWave(cc.x,cc.y,true);
  window.__fx3.setBusy(true);

  const t0=performance.now();
  try{
    if(serverMode){
      /* ---------- SERVER ENGINE (>80 MB) ---------- */
      setProgress(.35,'ROUTING TO SERVER ENGINE');
      scramble(procLabel,'SERVER ENGINE · SHARP');
      const out=await serverCompress(currentFile,targetKB);
      const dims=await probeDims(URL.createObjectURL(out.blob));
      vortexOn=false; processing.classList.remove('active');
      window.__fx3.setBusy(false); window.__fx3.burst();
      await presentResults(
        {blob:out.blob,width:dims.w,height:dims.h,hit:true,passes:0},
        'jpg',
        'server quality '+out.meta.quality+'%',
        out.meta.time!=='?'?Number(out.meta.time):(performance.now()-t0)
      );
      setStatus('info','Processed by the Node backend (sharp) — on-device limit is 80 MB.');
    }else{
      /* ---------- ON-DEVICE ENGINE ---------- */
      if(!sourceCanvas) sourceCanvas=await buildNativeCanvas(currentFile);
      const onPass=p=>{ const c=cardCenter(); vortex.x=c.x; vortex.y=c.y; hexWave(c.x,c.y,false); setProgress(null,'PASS '+p+' · SQUEEZING'); };
      const res=outputMime==='image/png'
        ? await compressPNG(sourceCanvas,targetBytes,onPass)
        : await compressLossy(sourceCanvas,targetBytes,outputMime,onPass);

      vortexOn=false; processing.classList.remove('active');
      window.__fx3.setBusy(false); window.__fx3.burst();

      const ext=outputMime==='image/webp'?'webp':(outputMime==='image/png'?'png':'jpg');
      const qTxt=outputMime==='image/png'?'lossless':'quality '+Math.round(res.quality*100)+'%';
      await presentResults(res,ext,qTxt,performance.now()-t0);
    }
  }catch(err){
    vortexOn=false; processing.classList.remove('active');
    window.__fx3.setBusy(false);
    if(serverMode){
      setStatus('err','Server unreachable — files over 80 MB need the Node backend running (node server.js).');
    }else{
      setStatus('err','Couldn\u2019t decode that image. Try another file.');
    }
  }finally{
    busy=false; compressBtn.disabled=false;
  }
});
})();