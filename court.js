/* RMV Basketball · Pavilion recreation. Hand-built geometry, not a 3D scan.
   Three.js r160.1 is bundled locally, so no network is needed to play. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const config = window.RMV_CONFIG || {};
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedQuery.matches;
  reducedQuery.addEventListener?.('change', (event) => { reducedMotion = event.matches; });
  const shootButton = $('shoot-button');
  const soundButton = $('sound-button');
  const viewButton = $('view-button');
  const resetViewButton = $('reset-view');
  const dialog = $('join-dialog');
  let groupUrl = '';
  let dialogTrigger = null;
  try {
    const url = new URL(config.facebookGroupUrl);
    if (url.protocol === 'https:' && ['facebook.com','www.facebook.com','m.facebook.com'].includes(url.hostname)
      && /^\/groups\/[^/]+/.test(url.pathname) && !url.username && !url.password) groupUrl = url.href;
  } catch (_) { /* An unset group is a deliberate preview state. */ }

  function openJoin(event) {
    if (groupUrl) return;
    event?.preventDefault();
    dialogTrigger = event?.currentTarget || document.activeElement;
    if (!dialog.open) dialog.showModal();
  }
  document.querySelectorAll('.join-link').forEach((link) => {
    if (groupUrl) { link.href = groupUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    else link.addEventListener('click', openJoin);
  });
  function closeDialog() { dialog.close(); dialogTrigger?.focus?.(); }
  $('close-dialog').addEventListener('click', closeDialog);
  $('back-to-court').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });

  if (typeof config.logoUrl === 'string' && config.logoUrl) {
    const logo = $('custom-logo');
    logo.onload = () => { logo.hidden = false; $('wordmark').hidden = true; };
    logo.src = config.logoUrl;
  }
  let soundOn = false;
  let audioContext;
  function getAudio() {
    if (!audioContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) audioContext = new Audio();
    }
    if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }
  function tone(frequency, duration, volume) {
    if (!soundOn) return;
    const audio = getAudio(); if (!audio) return;
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * .38, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function swish() {
    if (!soundOn) return;
    const audio = getAudio(); if (!audio) return;
    const count = Math.floor(audio.sampleRate * .24);
    const buffer = audio.createBuffer(1, count, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / count, 2);
    const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1700; filter.Q.value = .7; gain.gain.value = .17;
    source.connect(filter); filter.connect(gain); gain.connect(audio.destination); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  soundButton.addEventListener('click', () => {
    if (!getAudio()) return;
    soundOn = !soundOn;
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
    soundButton.title = soundOn ? 'Sound on' : 'Sound off';
    $('sound-off-mark').style.display = soundOn ? 'none' : '';
    $('sound-on-mark').style.display = soundOn ? '' : 'none';
    if (soundOn) tone(180, .16, .13);
  });

  function fallback(message) {
    document.body.classList.remove('ready');
    $('notice').textContent = message;
    $('notice').hidden = false;
    $('shoot-text').textContent = 'Join the Facebook group';
    $('shot-label').textContent = 'SEE YOU ON THE COURT.';
    $('shot-count').textContent = '';
    document.querySelector('.shot-track').hidden = true;
    $('play-hint').textContent = 'Private group. Request to join on Facebook.';
    $('drag-hint').hidden = true;
    shootButton.disabled = false;
    shootButton.onclick = (event) => { if (groupUrl) window.location.assign(groupUrl); else openJoin(event); };
    viewButton.disabled = true;
    resetViewButton.disabled = true;
  }
  if (!window.THREE) { fallback('The 3D court couldn’t load. You can still head to the group.'); return; }

  const T = window.THREE;
  const canvas = $('court');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'default'});
  } catch (_) { fallback('Your browser can’t display the 3D court. The group is still one tap away.'); return; }
  const scene = new T.Scene();
  scene.background = new T.Color('#c8e2ee');
  scene.fog = new T.Fog('#d1e2e1', 48, 90);
  const camera = new T.PerspectiveCamera(49, 1, .06, 100);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const hemi = new T.HemisphereLight('#e4f4ff', '#ad9a79', 2.25);
  scene.add(hemi);
  const sun = new T.DirectionalLight('#fff2d9', 3.2);
  sun.position.set(-18, 12, 5); sun.target.position.set(0, 0, -6);
  sun.castShadow = true;
  const shadowSize=canvas.clientWidth<641?1024:1536;
  sun.shadow.mapSize.set(shadowSize,shadowSize);
  Object.assign(sun.shadow.camera, {left:-23,right:23,top:24,bottom:-24,near:1,far:65});
  sun.shadow.normalBias = .035; sun.shadow.bias = -.0003;
  scene.add(sun, sun.target);
  const fill = new T.DirectionalLight('#d2eeff', 1.1);
  fill.position.set(13, 8, -13); scene.add(fill);
  const doorwayFill = new T.DirectionalLight('#fff6df', .75);
  doorwayFill.position.set(-19, 3.2, 1.5); doorwayFill.target.position.set(-2, 1.2, 1.5);
  scene.add(doorwayFill, doorwayFill.target);

  let seed = 9237;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function texture(width, height, draw) {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); draw(ctx, width, height);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }
  const wood = texture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#bd9259'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = random() > .5 ? 'rgba(87,50,16,.08)' : 'rgba(255,224,153,.10)';
      ctx.fillRect(random()*w, 0, .2 + random()*1.3, h);
    }
    const glow = ctx.createLinearGradient(0,0,w,0);
    glow.addColorStop(0,'#33200014'); glow.addColorStop(.5,'#ffdfad0a'); glow.addColorStop(1,'#33200014');
    ctx.fillStyle = glow; ctx.fillRect(0,0,w,h);
  });
  const perforated = texture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#bd9259'; ctx.fillRect(0,0,w,h);
    for (let y=8;y<h;y+=16) for(let x=8;x<w;x+=16) {
      ctx.fillStyle='#68451fcc';ctx.beginPath();ctx.arc(x,y,1.75,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f0bf8244';ctx.fillRect(x-1,y+2,3,1);
    }
  });
  const materials = {
    wood:new T.MeshStandardMaterial({map:wood,roughness:.79}),
    acoustic:new T.MeshStandardMaterial({map:perforated,roughness:.87}),
    cream:new T.MeshStandardMaterial({color:'#e5e7de',roughness:.64}),
    roof:new T.MeshStandardMaterial({color:'#e0e0d4',roughness:.85}),
    metal:new T.MeshStandardMaterial({color:'#c0caca',roughness:.43,metalness:.48}),
    burgundy:new T.MeshStandardMaterial({color:'#671e3c',roughness:.63}),
    trim:new T.MeshStandardMaterial({color:'#331a29',roughness:.7}),
    door:new T.MeshStandardMaterial({color:'#263331',roughness:.74}),
    dark:new T.MeshStandardMaterial({color:'#202d32',roughness:.73}),
    bleacher:new T.MeshStandardMaterial({color:'#808983',roughness:.68,metalness:.18}),
    tread:new T.MeshStandardMaterial({color:'#afb2a3',roughness:.75}),
    window:new T.MeshBasicMaterial({color:'#c8ebf7'}),
    light:new T.MeshBasicMaterial({color:'#fff5d9'}),
    orange:new T.MeshStandardMaterial({color:'#d8551e',roughness:.44,metalness:.2}),
    concrete:new T.MeshStandardMaterial({color:'#c3c4b9',roughness:.92}),
    stone:new T.MeshStandardMaterial({color:'#dbd9c8',roughness:.9}),
    soil:new T.MeshStandardMaterial({color:'#554b38',roughness:1}),
    foliage:new T.MeshStandardMaterial({color:'#6e8150',roughness:1,flatShading:true}),
    foliageLight:new T.MeshStandardMaterial({color:'#94a364',roughness:1,flatShading:true}),
    ground:new T.MeshStandardMaterial({color:'#b8b99c',roughness:1})
  };
  const staticGroup = new T.Group(); staticGroup.name = 'Pavilion architecture'; scene.add(staticGroup);
  const batchMap = new Map();
  const cube = new T.BoxGeometry(1,1,1);
  const cylinder = new T.CylinderGeometry(1,1,1,8);
  const roundCylinder = new T.CylinderGeometry(1,1,1,16);
  const dummy = new T.Object3D();
  function instance(geometry, material, position, scale, rotation = null, cast = false) {
    dummy.position.set(...position); dummy.scale.set(...scale);
    dummy.rotation.set(0,0,0);
    if (rotation instanceof T.Quaternion) dummy.quaternion.copy(rotation);
    else if (rotation) dummy.rotation.set(...rotation);
    dummy.updateMatrix();
    const key = geometry.uuid + material.uuid + String(cast);
    if (!batchMap.has(key)) batchMap.set(key,{geometry,material,cast,matrices:[]});
    batchMap.get(key).matrices.push(dummy.matrix.clone());
  }
  function box(x,y,z,w,h,d,material,rotation=null,cast=false) { instance(cube,material,[x,y,z],[w,h,d],rotation,cast); }
  function beam(a,b,r,material,cast=false) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = end.clone().sub(start);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
    instance(cylinder,material,start.add(end).multiplyScalar(.5).toArray(),[r,delta.length(),r],q,cast);
  }
  function finishBatches() {
    batchMap.forEach(({geometry,material,cast,matrices}) => {
      const mesh = new T.InstancedMesh(geometry,material,matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.castShadow=cast;mesh.receiveShadow=true;staticGroup.add(mesh);
    });
    batchMap.clear();
  }
  function mesh(geometry, material, parent, x=0,y=0,z=0) {
    const result = new T.Mesh(geometry,material); result.position.set(x,y,z);
    result.castShadow=true;result.receiveShadow=true;parent.add(result);return result;
  }
  function panelText(text, width, height, size, bg, fg, font='Arial') {
    return texture(width,height,(ctx,w,h)=>{
      if (bg) {ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);}
      ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${size}px ${font}`;
      ctx.fillText(text,w/2,h/2);
    });
  }
  function sign(tex,w,h,x,y,z,rotationY=0,parent=scene) {
    const p=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}),parent,x,y,z);
    p.rotation.y=rotationY;p.castShadow=false;return p;
  }

  // Court markings are drawn at model scale on a single material, not hundreds of meshes.
  const floorTexture=texture(2048,2048,(ctx,w,h)=>{
    ctx.fillStyle='#929795';ctx.fillRect(0,0,w,h);
    for(let i=0;i<85000;i++){
      ctx.fillStyle=random()>.5?'rgba(19,35,35,.035)':'rgba(245,241,223,.035)';
      ctx.fillRect(random()*w,random()*h,1+random()*2,1+random()*2);
    }
    ctx.scale(w/25,h/34);ctx.translate(12.5,17);
    ctx.strokeStyle='#57636422';ctx.lineWidth=.012;
    for(let x=-12.5;x<=12.5;x+=1.25){ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x,17);ctx.stroke();}
    for(let z=-17;z<=17;z+=1.25){ctx.beginPath();ctx.moveTo(-12.5,z);ctx.lineTo(12.5,z);ctx.stroke();}
    function line(points,color='#e6e9dc',width=.045){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));ctx.stroke();}
    function arc(x,z,r,a,b,color='#e6e9dc',width=.045){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,z,r,a,b);ctx.stroke();}
    // Secondary multipurpose markings, quieter than the basketball lines.
    line([[-9,-9],[9,-9],[9,9],[-9,9],[-9,-9]],'#853c49',.032);
    line([[-9,-3],[9,-3]],'#853c49',.032);line([[-9,3],[9,3]],'#853c49',.032);
    for(const z of [-7.2,7.2]){
      line([[-11.7,z-5.6],[11.7,z-5.6],[11.7,z+5.6],[-11.7,z+5.6],[-11.7,z-5.6]],'#bfc4b8',.028);
      arc(-10.7,z,5.3,-Math.PI/2,Math.PI/2,'#c7cabd',.03);
      arc(10.7,z,5.3,Math.PI/2,Math.PI*1.5,'#c7cabd',.03);
      line([[-11.7,z-1.6],[-6.8,z-1.6],[-6.8,z+1.6],[-11.7,z+1.6]],'#374444',.032);
      line([[11.7,z-1.6],[6.8,z-1.6],[6.8,z+1.6],[11.7,z+1.6]],'#374444',.032);
    }
    line([[-7.62,-14.325],[7.62,-14.325],[7.62,14.325],[-7.62,14.325],[-7.62,-14.325]]);
    line([[-7.62,0],[7.62,0]]);arc(0,0,1.83,0,Math.PI*2);
    for(const side of [-1,1]){
      ctx.save();ctx.scale(1,side);
      const baseline=-14.325,rim=-12.75,free=-8.553;
      line([[-1.83,baseline],[-1.83,free],[1.83,free],[1.83,baseline]]);
      arc(0,free,1.83,0,Math.PI*2);
      arc(0,rim,6.325,0,Math.PI);
      line([[-6.325,baseline],[-6.325,rim]]);line([[6.325,baseline],[6.325,rim]]);
      for(const z of [-11.9,-10.8,-9.7])for(const x of [-1,1])line([[x*1.83,z],[x*2.06,z]]);
      ctx.restore();
    }
    ctx.fillStyle='#d9b34a';
    for(const x of [-4.3,4.3])for(const z of [-10.5,-3.5,3.5,10.5])ctx.fillRect(x-.13,z-.13,.26,.26);
    if(!config.logoUrl){
    ctx.save();ctx.translate(0,0);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='900 2.05px Arial';ctx.lineWidth=.11;ctx.strokeStyle='#efe9d9';ctx.strokeText('RMV',0,-.18);
    ctx.fillStyle='#28393d';ctx.fillText('RMV',0,-.18);
    ctx.font='700 .32px Arial';ctx.fillText('B A S K E T B A L L',0,1.05);
    ctx.restore();
    }
  });
  const floorMaterial=new T.MeshStandardMaterial({map:floorTexture,roughness:.54,metalness:.1});
  const floor=mesh(new T.PlaneGeometry(25,34),floorMaterial,scene,0,0,0);
  floor.rotation.x=-Math.PI/2;floor.castShadow=false;floor.name='Multipurpose court floor';

  // Keep the playing lines fixed while giving the five-row bleachers a deeper sideline.
  const roomLeft=-12.5,roomRight=14.5,roomWidth=roomRight-roomLeft,roomCenter=1;
  const sideline=mesh(new T.PlaneGeometry(2,34),new T.MeshStandardMaterial({color:'#929795',roughness:.54,metalness:.1}),scene,13.5,0,0);
  sideline.rotation.x=-Math.PI/2;sideline.castShadow=false;sideline.name='Bleacher setback floor';
  const doorStart=-.5,doorEnd=3.5,doorHeight=4.15;

  // Four timber walls, acoustic panels above, clerestory windows along the long sides.
  for(const side of [-1,1]){
    for(let start=roomLeft;start<roomRight;start+=1.25){
      const width=Math.min(1.25,roomRight-start),x=start+width/2;
      box(x,2.25,side*17,width-.007,4.5,.2,materials.wood,null,true);
      box(x,5.65,side*17,width-.007,2.28,.2,materials.acoustic,null,true);
    }
    box(roomCenter,7.13,side*17,roomWidth,.65,.24,materials.cream,null,true);
    box(roomCenter,8.6,side*17,roomWidth,2.3,.2,materials.roof,null,true);
    const wallX=side<0?roomLeft:roomRight;
    for(let start=-17;start<17;start+=1.25){
      const end=Math.min(17,start+1.25),width=end-start,z=(start+end)/2;
      if(side<0 && end>doorStart && start<doorEnd){
        // Split the lower wall around the opening rather than covering it with a door texture.
        for(const [a,b] of [[start,Math.min(end,doorStart)],[Math.max(start,doorEnd),end]]){
          if(b>a)box(wallX,2.25,(a+b)/2,.2,4.5,b-a-.007,materials.wood,null,true);
        }
        const a=Math.max(start,doorStart),b=Math.min(end,doorEnd);
        box(wallX,(doorHeight+4.5)/2,(a+b)/2,.2,4.5-doorHeight,b-a,materials.wood,null,true);
      }else box(wallX,2.25,z,.2,4.5,width-.007,materials.wood,null,true);
      box(wallX,5.65,z,.2,2.28,width-.007,materials.acoustic,null,true);
    }
    box(wallX,7.04,0,.28,.5,34,materials.cream,null,true);
    box(wallX,8.97,0,.28,.50,34,materials.cream,null,true);
    // Individual clerestory panes with solid white piers, as in the supplied photo.
    for(let start=-17;start<17;start+=2){
      const width=Math.min(2,17-start),z=start+width/2;
      box(wallX+side*.10,8.0,z,.08,1.45,width-.22,materials.window);
      box(wallX-side*.07,8.0,start,.15,1.55,.22,materials.cream,null,true);
      box(wallX-side*.09,7.30,z,.12,.055,width,materials.metal);
      box(wallX-side*.09,8.71,z,.12,.055,width,materials.metal);
    }
    if(side<0){
      box(wallX+.1,.09,(-17+doorStart)/2,.14,.18,17+doorStart,materials.dark);
      box(wallX+.1,.09,(doorEnd+17)/2,.14,.18,17-doorEnd,materials.dark);
    }else box(wallX-.1,.09,0,.14,.18,34,materials.dark);
    box(roomCenter,.09,side*16.88,roomWidth,.18,.14,materials.dark);
    // Burgundy pads at both main baskets.
    for(let x=-3.4;x<3.6;x+=.85)box(x,.96,side*16.82,.83,1.78,.17,materials.burgundy,null,true);
    // Door facings, push bars, exit signs.
    for(const x of [-7.1,7.1]){
      box(x,1.25,side*16.77,1.73,2.5,.2,materials.dark);
      box(x,1.2,side*16.64,1.57,2.28,.045,materials.door);
      box(x,1.05,side*16.59,1.25,.045,.06,materials.metal);
      box(x,2.79,side*16.76,.61,.25,.11,materials.burgundy);
      sign(panelText('EXIT',128,48,32,null,'#ffc1b5'),.52,.2,x,2.79,side*16.68,side===1?Math.PI:0);
      box(x,1.78,side*16.59,1.32,.52,.025,materials.window);
    }
    // Round HVAC grilles in the white upper band.
    for(const center of [-6,6])for(const offset of [-.6,0,.6]){
      instance(roundCylinder,materials.dark,[center+offset,7.07,side*16.82],[.19,.04,.19],[Math.PI/2,0,0]);
    }
  }
  // Barn doors slid fully to either side; a real opening onto the concrete walkway.
  for(const z of [doorStart,doorEnd])box(-12.35,2.08,z,.23,4.16,.11,materials.metal,null,true);
  box(-12.35,4.20,1.5,.23,.12,4.22,materials.metal,null,true);
  box(-12.13,4.38,1.5,.12,.065,8.4,materials.dark);
  for(const z of [-1.59,4.59]){
    box(-12.23,2.06,z,.15,4.10,2.04,materials.wood,null,true);
    box(-12.12,.12,z,.07,.12,2.04,materials.metal);
    box(-12.10,3.99,z,.08,.08,2.04,materials.metal);
    for(const offset of [-.7,.7])beam([-12.08,4.0,z+offset],[-12.08,4.38,z+offset],.026,materials.dark);
    const handleZ=z<1.5?z+.63:z-.63;
    beam([-12.02,1.2,handleZ],[-12.02,1.63,handleZ],.035,materials.metal);
  }
  box(-12.42,.015,1.5,.35,.03,4,materials.metal);
  sign(panelText('4:19',256,80,57,'#292e32','#ffaaa3'),1.35,.43,-12.32,4.94,1.5,Math.PI/2);
  box(-17.15,-.115,1.5,9.3,.2,16,materials.concrete);
  box(-25,-.24,1.5,7,.2,28,materials.ground);
  for(let z=-6.5;z<=9.5;z+=2)box(-17.2,-.009,z,9.3,.008,.018,materials.bleacher);
  for(const x of [-15.5,-18.5,-21.5])box(x,-.009,1.5,.018,.008,16,materials.bleacher);
  const foliageGeometry=new T.IcosahedronGeometry(1,1);
  for(const z of [-1.2,4.2]){
    box(-19.8,.26,z,1.25,.62,2.4,materials.stone,null,true);
    box(-19.8,.58,z,1.06,.04,2.2,materials.soil);
    for(let i=0;i<10;i++){
      const px=-19.8+(random()-.5)*.65,pz=z+(random()-.5)*1.6;
      instance(foliageGeometry,i%3?materials.foliage:materials.foliageLight,[px,.74+random()*.20,pz],[.26+random()*.16,.25+random()*.22,.29+random()*.16],null,true);
    }
    // A few taller leaves add variation without a heavy imported plant model.
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      beam([-19.8,.64,z],[-19.8+Math.cos(a)*.42,1.3+random()*.25,z+Math.sin(a)*.42],.026,materials.foliage);
    }
  }

  // Shallow retractable bleachers along the right wall.
  for(let row=0;row<5;row++){
    const x=11.9+row*.55, height=.28+row*.36;
    box(x,height/2,0,.58,height,21.5,materials.bleacher,null,true);
    box(x-.025,height+.035,0,.56,.07,21.5,materials.tread,null,true);
    box(x-.32,height-.045,0,.045,.16,21.5,materials.dark);
  }
  for(const z of [-10.7,-5.4,5.4,10.7]){
    beam([11.85,.35,z],[11.85,1.0,z],.035,materials.dark);
    beam([11.85,1.0,z],[14.12,2.35,z],.035,materials.dark);
    beam([14.12,2.35,z],[14.12,1.75,z],.035,materials.dark);
  }

  // Exposed steel roof, open-web trusses, suspended lights, and ceiling fans.
  box(roomCenter,9.83,0,roomWidth,.13,34,materials.roof);
  for(let x=-12;x<=14;x+=.48)box(x,9.72,0,.04,.10,34,materials.cream);
  for(let z=-15.5;z<=16;z+=5.2){
    box(roomCenter,8.93,z,roomWidth,.16,.12,materials.cream);
    box(roomCenter,9.58,z,roomWidth,.12,.12,materials.cream);
    for(let x=-12;x<13;x+=2.4){
      beam([x,8.93,z],[x+1.2,9.58,z],.045,materials.cream);
      beam([x+1.2,9.58,z],[x+2.4,8.93,z],.045,materials.cream);
    }
  }
  for(const x of [-8,0,8]){
    box(x,9.1,0,.15,.16,34,materials.cream);
    for(let z=-13;z<16;z+=5.2){
      beam([x,9.65,z],[x,8.37,z],.023,materials.metal);
      instance(new T.ConeGeometry(.28,.24,16,1,true),materials.cream,[x,8.29,z],[1,1,1]);
      instance(roundCylinder,materials.light,[x,8.17,z],[.265,.025,.265]);
    }
  }
  for(const z of [-6,6]){
    instance(roundCylinder,materials.dark,[0,8.72,z],[.16,.22,.16]);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      box(Math.sin(a)*.6,8.65,z+Math.cos(a)*.6,.12,.035,1.2,materials.dark,[0,a,0]);
    }
  }

  const scoreCanvas=document.createElement('canvas');scoreCanvas.width=512;scoreCanvas.height=256;
  const scoreCtx=scoreCanvas.getContext('2d');
  const scoreTexture=new T.CanvasTexture(scoreCanvas);scoreTexture.colorSpace=T.SRGBColorSpace;
  function paintScore(makes){
    const c=scoreCtx;c.fillStyle='#391c2b';c.fillRect(0,0,512,256);
    c.strokeStyle='#946570';c.lineWidth=5;c.strokeRect(6,6,500,244);
    c.fillStyle='#ede5d6';c.font='700 24px Arial';c.textAlign='center';c.fillText('RMV BASKETBALL',256,38);
    c.font='700 17px Arial';c.fillText('HOME',102,77);c.fillText('GUEST',412,77);c.fillText('PERIOD',256,197);
    c.fillStyle='#ff9e65';c.font='700 62px monospace';c.fillText(String(makes*2).padStart(2,'0'),102,141);c.fillText('00',412,141);
    c.font='700 38px monospace';c.fillText('00:00',256,123);c.font='700 27px monospace';c.fillText('1',256,231);
    scoreTexture.needsUpdate=true;
  }
  paintScore(0);
  box(0,5.3,-16.75,3.2,1.65,.16,materials.trim);
  sign(scoreTexture,3.12,1.56,0,5.3,-16.65);
  box(0,5.3,16.75,3.2,1.65,.16,materials.trim);
  sign(scoreTexture,3.12,1.56,0,5.3,16.65,Math.PI);
  // Use community typography, not an unrelated sponsor's logo.
  const wallWordmark=texture(1024,256,(ctx,w,h)=>{
    ctx.fillStyle='#f0e6ce';ctx.font='900 115px Arial';ctx.textAlign='center';ctx.fillText('RMV BASKETBALL',w/2,130);
    ctx.font='700 29px Arial';ctx.fillText('SEE YOU ON THE COURT',w/2,200);
  });
  sign(wallWordmark,7.1,1.78,14.32,5.2,0,-Math.PI/2);

  function makeHoop(x,z,angle,active=false){
    const group=new T.Group();group.position.set(x,0,z);group.rotation.y=angle;scene.add(group);
    group.name=active?'Main basket':'Practice basket';
    const localBox=(px,py,pz,w,h,d,mat)=>mesh(new T.BoxGeometry(w,h,d),mat,group,px,py,pz);
    const rod=(a,b,r,mat)=>{
      const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
      const m=mesh(new T.CylinderGeometry(r,r,delta.length(),8),mat,group);
      m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
    };
    // Rim center is the group origin in XZ; board is 0.375 m behind it.
    localBox(0,6.23,-.57,.105,5.0,.12,materials.cream);
    rod([0,8.65,-2.65],[0,5.9,-.57],.043,materials.metal);
    rod([-.7,8.65,-2.3],[0,5.5,-.57],.027,materials.dark);
    localBox(0,3.49,-.52,.11,1.18,.15,materials.metal);
    const glass=new T.MeshStandardMaterial({color:'#d5eeed',transparent:true,opacity:.16,roughness:.16,metalness:.08,side:T.DoubleSide,depthWrite:false});
    const board=localBox(0,3.55,-.39,1.83,1.07,.025,glass);board.castShadow=false;
    localBox(0,4.09,-.39,1.92,.04,.065,materials.metal);
    for(const side of [-1,1])localBox(side*.935,3.54,-.39,.04,1.11,.065,materials.metal);
    localBox(0,3.0,-.39,1.93,.115,.095,materials.burgundy);
    for(const side of [-1,1])localBox(side*.925,3.20,-.39,.1,.42,.095,materials.burgundy);
    localBox(0,3.67,-.361,.61,.028,.015,materials.cream);
    localBox(0,3.21,-.361,.61,.028,.015,materials.cream);
    for(const side of [-1,1])localBox(side*.292,3.44,-.361,.028,.46,.015,materials.cream);
    localBox(0,3.065,-.29,.12,.07,.2,materials.orange);
    const rimGroup=new T.Group();rimGroup.position.set(0,3.05,0);group.add(rimGroup);
    const rim=mesh(new T.TorusGeometry(.2286,.018,8,40),materials.orange,rimGroup);rim.rotation.x=Math.PI/2;
    const netPoints=[];
    const levels=6,strands=12;
    function vertex(level,index){
      const r=.22-(level/levels)*.085,a=(index+(level%2)*.5)*Math.PI*2/strands;
      return [Math.cos(a)*r,-level*.088,Math.sin(a)*r];
    }
    for(let level=0;level<levels;level++)for(let i=0;i<strands;i++){
      netPoints.push(...vertex(level,i),...vertex(level+1,i));
      netPoints.push(...vertex(level,i),...vertex(level+1,i+(level%2?1:-1)));
    }
    const netGeometry=new T.BufferGeometry();netGeometry.setAttribute('position',new T.Float32BufferAttribute(netPoints,3));
    const net=new T.LineSegments(netGeometry,new T.LineBasicMaterial({color:'#f3ead3',transparent:true,opacity:.85}));rimGroup.add(net);
    if(active)return {group,rimGroup,net};
    return null;
  }
  const hoop=makeHoop(0,-12.75,0,true);
  makeHoop(0,12.75,Math.PI);
  for(const z of [-7.2,7.2]){makeHoop(-10.7,z,Math.PI/2);makeHoop(10.7,z,-Math.PI/2);}
  finishBatches();

  if(config.logoUrl){
    new T.TextureLoader().load(config.logoUrl,(tex)=>{
      tex.colorSpace=T.SRGBColorSpace;
      const logoMat=new T.MeshStandardMaterial({map:tex,transparent:true,roughness:.65,polygonOffset:true,polygonOffsetFactor:-2});
      const aspect=tex.image.width/tex.image.height;
      const logo=mesh(new T.PlaneGeometry(3.7,3.7/aspect),logoMat,scene,0,.014,0);
      logo.rotation.x=-Math.PI/2;logo.castShadow=false;
    },undefined,()=>{});
  }

  // A compact, stylized player with articulated limbs. Not a scanned likeness.
  const player=new T.Group();player.name='Free throw player';player.position.set(0,0,-8.1);scene.add(player);
  const skin=new T.MeshStandardMaterial({color:'#bd8865',roughness:.92,flatShading:true});
  const jersey=new T.MeshStandardMaterial({color:'#ebeadf',roughness:.84,flatShading:true});
  const shorts=new T.MeshStandardMaterial({color:'#234454',roughness:.89,flatShading:true});
  const shoeMat=new T.MeshStandardMaterial({color:'#e4e6dc',roughness:.75});
  const soleMat=new T.MeshStandardMaterial({color:'#fa7540',roughness:.78});
  const hairMat=new T.MeshStandardMaterial({color:'#302b25',roughness:1,flatShading:true});
  const bodyRoot=new T.Group();player.add(bodyRoot);
  mesh(new T.CylinderGeometry(.265,.225,.48,8),jersey,bodyRoot,0,1.12,0);
  mesh(new T.CylinderGeometry(.095,.09,.12,8),skin,bodyRoot,0,1.42,0);
  const head=mesh(new T.SphereGeometry(.183,10,8),skin,bodyRoot,0,1.63,0);head.scale.set(.88,1.12,.98);
  const hair=mesh(new T.SphereGeometry(.188,10,5,0,Math.PI*2,0,Math.PI*.49),hairMat,bodyRoot,0,1.67,.018);
  hair.scale.set(.94,1.02,1);
  mesh(new T.BoxGeometry(.075,.06,.07),skin,bodyRoot,0,1.625,-.169);
  for(const side of [-1,1]){
    mesh(new T.SphereGeometry(.035,6,5),skin,bodyRoot,side*.169,1.64,0);
    const trim=mesh(new T.BoxGeometry(.08,.043,.25),shorts,bodyRoot,side*.198,1.359,0);trim.rotation.z=side*.15;
    const short=mesh(new T.CylinderGeometry(.15,.16,.28,8),shorts,bodyRoot,side*.13,.79,0);short.scale.z=1.05;
    mesh(new T.BoxGeometry(.065,.23,.075),jersey,bodyRoot,side*.259,.78,.015);
  }
  const number=panelText('5',128,128,99,null,'#234454');
  sign(number,.26,.26,0,1.13,-.255,Math.PI,bodyRoot);
  sign(number,.24,.24,0,1.1,.255,0,bodyRoot);
  sign(panelText('RMV',256,64,50,null,'#234454'),.28,.07,0,1.29,.256,0,bodyRoot);

  function limb(radius,material){const m=mesh(new T.CylinderGeometry(radius*.86,radius,1,8),material,player);return m;}
  function setLimb(m,a,b){
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);
    m.position.copy(av.add(bv).multiplyScalar(.5));m.scale.y=d.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
  }
  const limbs={};
  for(const side of [-1,1]){
    limbs[side]={upper:limb(.076,skin),fore:limb(.060,skin),thigh:limb(.097,skin),shin:limb(.069,skin),
      hand:mesh(new T.SphereGeometry(.063,8,6),skin,player),knee:mesh(new T.SphereGeometry(.078,8,6),skin,player)};
    mesh(new T.CylinderGeometry(.074,.072,.24,8),shorts,player,side*.155,.26,side===1?-.08:.06);
    const shoe=mesh(new T.BoxGeometry(.185,.13,.32),shoeMat,player,side*.155,.105,-.07+(side===1?-.08:.06));
    const sole=mesh(new T.BoxGeometry(.188,.035,.33),soleMat,player,side*.155,.025,-.07+(side===1?-.08:.06));
    shoe.rotation.y=side*.10;sole.rotation.y=side*.10;
  }
  const ballMaterial=new T.MeshStandardMaterial({color:'#de682a',roughness:.79,flatShading:false});
  const ball=new T.Group();ball.name='Basketball';scene.add(ball);
  mesh(new T.SphereGeometry(.119,24,16),ballMaterial,ball);
  const seamMaterial=new T.MeshBasicMaterial({color:'#462a20'});
  const seamGeometry=new T.TorusGeometry(.1195,.0025,4,64);
  for(const rotation of [[0,0,0],[Math.PI/2,0,0],[0,Math.PI/2,0]]){
    const seam=mesh(seamGeometry,seamMaterial,ball);seam.rotation.set(...rotation);seam.castShadow=false;
  }
  // Curved panel seams distinguish the ball even close to the basket.
  const seamPts=[];for(let i=0;i<=64;i++){
    const a=i/64*Math.PI*2,lat=.52*Math.sin(a*2);
    seamPts.push(new T.Vector3(.120*Math.cos(a)*Math.cos(lat),.120*Math.sin(lat),.120*Math.sin(a)*Math.cos(lat)));
  }
  const seamLine=new T.Line(new T.BufferGeometry().setFromPoints(seamPts),new T.LineBasicMaterial({color:'#462a20'}));ball.add(seamLine);
  const contactTex=texture(128,128,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(7,19,24,.36)');g.addColorStop(.4,'rgba(7,19,24,.16)');g.addColorStop(1,'rgba(7,19,24,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
  function contactShadow(w,h){const p=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false}),scene);p.rotation.x=-Math.PI/2;p.castShadow=false;return p;}
  const playerShadow=contactShadow(1.35,.92);playerShadow.position.set(0,.012,-8.04);
  const ballShadow=contactShadow(.65,.65);

  const mix=T.MathUtils.lerp;
  const clamp=T.MathUtils.clamp;
  const smooth=(v)=>{v=clamp(v,0,1);return v*v*(3-2*v);};
  const mix3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  function pose(gather=0,release=0,bend=0){
    const drop=bend*.16;
    bodyRoot.position.y=-drop;bodyRoot.rotation.x=bend*-.025;
    let held=mix3([.12,1.22,-.36],[.13,1.70,-.26],gather);
    held=mix3(held,[.10,1.99,-.48],release);held[1]-=drop;
    for(const side of [-1,1]){
      const l=limbs[side];
      const shoulder=[side*.252,1.35-drop,.0];
      let elbow=mix3([side*.35,1.05-drop,-.11],[side*.32,1.40-drop,-.27],gather);
      elbow=mix3(elbow,[side*.21,1.72-drop,-.31],release);
      const hand=[held[0]+side*.08,held[1]-.043,held[2]+.025];
      setLimb(l.upper,shoulder,elbow);setLimb(l.fore,elbow,hand);l.hand.position.set(...hand);
      const ankle=[side*.155,.35,side===1?-.08:.06];
      const knee=[side*.145,.55-drop*.4,-.03-bend*.19+(side===1?-.05:.04)];
      setLimb(l.thigh,[side*.13,.79-drop,.025],knee);setLimb(l.shin,knee,ankle);l.knee.position.set(...knee);
    }
    return new T.Vector3(held[0],held[1],held[2]-8.1);
  }

  let makes=0,phase='idle',shotClock=0,scored=false;
  let flightStart=new T.Vector3(),ballVelocity=new T.Vector3();
  let bounceMode=false,lastBounce=-1,wideView=true;
  let elapsed=0,lastTimestamp=0,raf=0,running=true;
  let feedbackUntil=0;
  const target=new T.Vector3(),cameraTarget=new T.Vector3();
  const desiredCamera=new T.Vector3();
  let orbitYaw=0,orbitPitch=0,zoom=1,panX=0,panZ=0,cameraTouched=false;
  const pointers=new Map();
  let gesture=null;
  const orbitOffset=new T.Vector3(),orbitSpherical=new T.Spherical();
  const baseLook={wide:[0,1.8,-5.5],close:[0,1,-10.2]};
  function getCameraState(){
    const mobile=canvas.clientWidth<641;
    const close=!wideView;
    return {position:mobile?(close?[4.5,6.2,3]:[6.8,7.5,9.5]):(close?[5.3,5.2,1]:[10.1,7.5,12.0]),
      target:mobile?(close?[0,.1,-10.1]:[0,1.8,-6.2]):baseLook[close?'close':'wide'],fov:mobile?56:49};
  }
  function resize(){
    const rect=$('experience').getBoundingClientRect();
    renderer.setSize(rect.width,rect.height,false);
    camera.aspect=rect.width/rect.height;camera.fov=getCameraState().fov;camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe($('experience'));resize();
  const initial=getCameraState();camera.position.set(...initial.position);cameraTarget.set(...initial.target);camera.lookAt(cameraTarget);
  function updateCamera(dt){
    const s=getCameraState();target.set(...s.target);
    orbitOffset.set(...s.position).sub(target);orbitSpherical.setFromVector3(orbitOffset);
    orbitSpherical.theta+=orbitYaw;
    orbitSpherical.phi=clamp(orbitSpherical.phi+orbitPitch,.32,1.39);
    orbitSpherical.radius*=zoom;
    orbitOffset.setFromSpherical(orbitSpherical);
    target.x=clamp(target.x+panX,-4,4);target.z=clamp(target.z+panZ,-11.8,7);
    // Shorten the orbit at the room boundary so the camera stays inside walls,
    // below the ceiling, and in front of the bleachers throughout a full turn.
    let distanceLimit=1;
    for(const [axis,low,high] of [['x',-11.6,10.9],['z',-15.7,15.7],['y',-Infinity,8.48]]){
      if(orbitOffset[axis]>0)distanceLimit=Math.min(distanceLimit,(high-target[axis])/orbitOffset[axis]);
      else if(orbitOffset[axis]<0)distanceLimit=Math.min(distanceLimit,(low-target[axis])/orbitOffset[axis]);
    }
    desiredCamera.copy(target).addScaledVector(orbitOffset,Math.max(.08,distanceLimit));
    desiredCamera.y=Math.max(1.25,desiredCamera.y);
    if(!reducedMotion&&!cameraTouched&&phase==='idle'){
      desiredCamera.x+=Math.sin(elapsed*.16)*.06;desiredCamera.y+=Math.sin(elapsed*.21)*.025;
    }
    const blend=reducedMotion?1:1-Math.exp(-dt*(pointers.size?14:5));
    camera.position.lerp(desiredCamera,blend);cameraTarget.lerp(target,blend);camera.lookAt(cameraTarget);
  }
  function resetCamera(useWide=true){
    wideView=useWide;orbitYaw=0;orbitPitch=0;zoom=1;panX=0;panZ=0;cameraTouched=false;
    pointers.clear();gesture=null;
    viewButton.setAttribute('aria-label',wideView?'Switch to courtside camera':'Switch to wide camera');
  }
  function rotateCamera(dx,dy){
    const s=getCameraState();
    const base=new T.Spherical().setFromVector3(new T.Vector3(...s.position).sub(new T.Vector3(...s.target)));
    orbitYaw-=dx*Math.PI/Math.max(canvas.clientWidth,400);
    orbitYaw=Math.atan2(Math.sin(orbitYaw),Math.cos(orbitYaw));
    orbitPitch=clamp(orbitPitch-dy*Math.PI/Math.max(canvas.clientHeight,500),.32-base.phi,1.39-base.phi);
    cameraTouched=true;
  }
  function panCamera(dx,dy){
    const forward=new T.Vector3().subVectors(cameraTarget,camera.position);forward.y=0;forward.normalize();
    const right=new T.Vector3().crossVectors(forward,new T.Vector3(0,1,0)).normalize();
    const scale=camera.position.distanceTo(cameraTarget)*1.05/Math.max(canvas.clientHeight,400);
    panX=clamp(panX-right.x*dx*scale+forward.x*dy*scale,-4,4);
    panZ=clamp(panZ-right.z*dx*scale+forward.z*dy*scale,-7,9);
    cameraTouched=true;
  }
  function zoomCamera(factor){zoom=clamp(zoom*factor,.48,1.35);cameraTouched=true;}
  function readGesture(){
    const points=[...pointers.values()];
    if(points.length<1)return null;
    if(points.length===1)return {...points[0],distance:0};
    return {x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2,
      distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)};
  }
  function showFeedback(text){$('shot-feedback').textContent=text;$('shot-feedback').classList.add('visible');feedbackUntil=elapsed+1.05;}
  function updateCount(){
    $('shot-count').textContent=`${makes} / 3`;
    $('shot-count').setAttribute('aria-label',`${makes} of 3 shots made`);
    document.querySelectorAll('.shot-track span').forEach((p,i)=>p.classList.toggle('made',i<makes));paintScore(makes);
  }
  function countBasket(){
    if(scored)return;scored=true;makes++;updateCount();swish();
    showFeedback(['SWISH.','THAT’S TWO.','THREE FOR THREE.'][makes-1]);
    $('announcement').textContent=`Made it! ${makes} of 3. ${makes===3?'You’re ready to run. Join the Facebook group when you’re ready.':''}`;
  }
  function finishShot(){
    phase=makes>=3?'complete':'idle';
    if(makes>=3){
      $('play-content').hidden=true;$('success-content').hidden=false;
      $('success-content').querySelector('.join-link').focus({preventScroll:true});
      if(groupUrl&&config.autoRedirectAfterThree===true){
        $('announcement').textContent='Three for three. Opening the Facebook group.';
        window.location.assign(groupUrl);
      }
    }else{shootButton.disabled=false;$('shoot-text').textContent='Take another shot';$('shot-label').textContent=makes===1?'ONE DOWN. TWO TO GO.':'ONE MORE FOR THE RUN.';}
  }
  function shoot(){
    if(phase!=='idle')return;
    if(soundOn)getAudio();
    phase='windup';shotClock=0;scored=false;bounceMode=false;lastBounce=-1;
    resetCamera(false);
    shootButton.disabled=true;$('shoot-text').textContent='Nice and easy…';
    $('announcement').textContent='Taking a free throw.';
  }
  shootButton.onclick=shoot;
  viewButton.addEventListener('click',()=>{
    resetCamera(!wideView);
  });
  resetViewButton.addEventListener('click',()=>{resetCamera();$('announcement').textContent='Camera reset to the wide view.';});
  $('play-again').addEventListener('click',()=>{
    makes=0;phase='idle';shotClock=0;scored=false;updateCount();
    $('play-content').hidden=false;$('success-content').hidden=true;shootButton.disabled=false;
    $('shoot-text').textContent='Take a shot';$('shot-label').textContent='THREE SHOTS. YOU’RE UP.';
    $('announcement').textContent='New round. Take your first shot.';shootButton.focus({preventScroll:true});
  });
  window.addEventListener('keydown',(event)=>{
    if(dialog.open||event.repeat||event.code!=='Space'||/INPUT|TEXTAREA|BUTTON|A|SELECT/.test(document.activeElement.tagName))return;
    event.preventDefault();shoot();
  });
  canvas.addEventListener('pointerdown',(event)=>{
    if(event.button!==0&&event.button!==2)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});gesture=readGesture();
    canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
  });
  canvas.addEventListener('pointermove',(event)=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const next=readGesture();
    if(gesture&&next){
      const dx=next.x-gesture.x,dy=next.y-gesture.y;
      if(pointers.size>1){
        if(next.distance>8&&gesture.distance>8)zoomCamera(gesture.distance/next.distance);
        panCamera(dx,dy);
      }else if(event.buttons===2||event.shiftKey)panCamera(dx,dy);
      else rotateCamera(dx,dy);
    }
    gesture=next;
  });
  const endDrag=(event)=>{pointers.delete(event.pointerId);gesture=readGesture();};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('contextmenu',(event)=>event.preventDefault());
  canvas.addEventListener('wheel',(event)=>{
    if(event.ctrlKey)return; // Preserve browser/OS text zoom.
    event.preventDefault();
    const amount=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?500:1);
    zoomCamera(Math.exp(clamp(amount,-400,400)*.0015));
  },{passive:false});
  canvas.addEventListener('keydown',(event)=>{
    if(dialog.open)return;
    if(event.key==='ArrowLeft')rotateCamera(-60,0);
    else if(event.key==='ArrowRight')rotateCamera(60,0);
    else if(event.key==='ArrowUp')rotateCamera(0,45);
    else if(event.key==='ArrowDown')rotateCamera(0,-45);
    else if(event.key==='+'||event.key==='=')zoomCamera(.88);
    else if(event.key==='-')zoomCamera(1.12);
    else if(event.key==='0')resetCamera();
    else return;
    event.preventDefault();
  });
  window.addEventListener('blur',()=>{pointers.clear();gesture=null;});
  const touchDevice=window.matchMedia('(pointer: coarse)').matches;
  $('drag-hint').textContent=touchDevice?'Drag to orbit · Pinch to zoom':'Drag to orbit · Scroll to zoom';

  function animate(timestamp){
    if(!running)return;
    const dt=lastTimestamp?Math.min((timestamp-lastTimestamp)/1000,.04):.016;
    lastTimestamp=timestamp;elapsed+=dt;
    if(phase==='idle'||phase==='complete'){
      const breath=reducedMotion?0:Math.sin(elapsed*1.8)*.007;
      ball.position.copy(pose(0,0,0));ball.position.y+=breath;
    }else{
      shotClock+=dt;
      // Camera moves in while the shooter dips, gathers, then extends.
      if(shotClock<.92){
        const p=shotClock/.92,gather=smooth((p-.15)/.45),release=smooth((p-.67)/.33);
        const bend=Math.sin(p*Math.PI)*.85;
        ball.position.copy(pose(gather,release,bend));flightStart.copy(ball.position);
        phase='windup';
      }else{
        const flightTime=shotClock-.92,duration=1.06;
        pose(1,1-smooth((flightTime-1.0)/.7),0);
        if(flightTime<=duration){
          phase='flight';const t=flightTime/duration;
          ball.position.lerpVectors(flightStart,new T.Vector3(0,3.05,-12.75),t);
          ball.position.y+=4*1.65*t*(1-t);
          ball.rotation.x-=dt*7;
        }else{
          phase='followthrough';const q=flightTime-duration;
          if(!bounceMode){
            bounceMode=true;
            ball.position.set(0,3.05,-12.75);
            ballVelocity.set((0-flightStart.x)/duration,(3.05-flightStart.y-6.6)/duration,(-12.75-flightStart.z)/duration);
          }
          if(q>.045)countBasket();
          ballVelocity.y-=9.81*dt;ball.position.addScaledVector(ballVelocity,dt);ball.rotation.x-=dt*5;
          if(ball.position.y<.119){
            ball.position.y=.119;ballVelocity.y=Math.abs(ballVelocity.y)*.64;ballVelocity.x*=.7;ballVelocity.z*=.7;
            if(shotClock-lastBounce>.14){tone(135,.14,Math.min(.21,ballVelocity.y*.04));lastBounce=shotClock;}
          }
          // Keep the rebounding ball inside the gym.
          if(ball.position.z<-16.45){ball.position.z=-16.45;ballVelocity.z=Math.abs(ballVelocity.z)*.6;}
          const netPulse=Math.exp(-q*5)*Math.sin(q*27);
          hoop.net.scale.set(1+Math.abs(netPulse)*.20,1+Math.abs(netPulse)*.13,1+Math.abs(netPulse)*.20);
          hoop.net.rotation.x=netPulse*.10;
          if(shotClock>3.65){hoop.net.scale.set(1,1,1);hoop.net.rotation.x=0;finishShot();}
        }
      }
    }
    ballShadow.position.set(ball.position.x,.015,ball.position.z);
    const shadowScale=.65+ball.position.y*.16;ballShadow.scale.setScalar(shadowScale);
    ballShadow.material.opacity=Math.max(.12,1-ball.position.y*.13);
    if(elapsed>feedbackUntil)$('shot-feedback').classList.remove('visible');
    updateCamera(dt);
    renderer.render(scene,camera);
    raf=requestAnimationFrame(animate);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){running=false;pointers.clear();gesture=null;cancelAnimationFrame(raf);audioContext?.suspend().catch(()=>{});}
    else if(!contextLost){running=true;lastTimestamp=0;raf=requestAnimationFrame(animate);if(soundOn)audioContext?.resume().catch(()=>{});}
  });
  let contextLost=false;
  canvas.addEventListener('webglcontextlost',(event)=>{
    event.preventDefault();contextLost=true;running=false;cancelAnimationFrame(raf);
    fallback('The 3D view paused. Reload to play again, or continue to the group.');
  });
  try {
    ball.position.copy(pose());renderer.render(scene,camera);
    document.body.classList.add('ready');shootButton.disabled=false;viewButton.disabled=false;resetViewButton.disabled=false;
    $('shoot-text').textContent='Take a shot';
    raf=requestAnimationFrame(animate);
  } catch(error) { console.error('RMV court initialization:',error);fallback('The 3D court couldn’t start. You can still continue to the group.'); }
})();
