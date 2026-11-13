import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#15131e');
scene.fog = new THREE.Fog('#15131e', 9, 22);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 100);
camera.position.set(7.8, 5.6, 10.8);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const hemi = new THREE.HemisphereLight('#b6b5e6','#34232b',2.0); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffe0c7',3.2); key.position.set(-4,8,6); key.castShadow=true; key.shadow.mapSize.set(2048,2048); scene.add(key);
const pinkLight = new THREE.PointLight('#ff6bb4',22,9); pinkLight.position.set(-2,2.6,-1.5); scene.add(pinkLight);
const warmLight = new THREE.PointLight('#ffb56b',18,8); warmLight.position.set(0,2.8,2.1); scene.add(warmLight);
const mat=(color,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const mats={wall:mat('#292633'),wall2:mat('#201e2a'),floor:mat('#77666a'),dark:mat('#171620'),black:mat('#0c0b14'),pink:mat('#ff75b6',.35),wood:mat('#8b6255'),cream:mat('#ded3d2'),metal:mat('#6b6877',.3,.7),blue:mat('#656d9c'),green:mat('#87b6a1')};
function cube(name,x,y,z,w,h,d,material,opts={}){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o}
function sphere(name,x,y,z,r,material){const o=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),material);o.name=name;o.position.set(x,y,z);o.castShadow=true;scene.add(o);return o}
function cylinder(name,x,y,z,r1,r2,h,material){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),material);o.name=name;o.position.set(x,y,z);o.castShadow=true;scene.add(o);return o}
// Room shell and parquet-like floor
cube('floor',0,-.16,0,12,.3,10,mats.floor);
for(let x=-5.5;x<6;x+=.72) cube('floor seam',x,-.002,0,.012,.008,9.8,mat('#4f444c'));
cube('back wall',0,2.7,-4.9,12,5.7,.22,mats.wall2);cube('left wall',-5.9,2.7,0,.22,5.7,10,mats.wall);cube('right wall',5.9,2.7,0,.22,5.7,10,mats.wall2);
// wall panels
for(let x=-5.1;x<=5.2;x+=1.1) cube('wall seam',x,2.65,-4.76,.025,5.2,.025,mat('#373341'));
// city window behind desk
cube('window frame',-.2,3.25,-4.73,4.8,2.65,.12,mats.black);
const windowMat=new THREE.MeshBasicMaterial({color:'#f6bca7'});cube('city dusk',-.2,3.25,-4.65,4.55,2.4,.04,windowMat);
// skyline silhouettes and lit windows
for(let i=0;i<13;i++){let x=-2.35+i*.36;let h=.45+((i*7)%11)*.13;cube('city building',x,2.12+h/2,-4.59,.27,h,.035,mat(i%2?'#47435f':'#6a536b'));for(let wy=2.15;wy<2.1+h;wy+=.22)for(let wx=x-.07;wx<x+.1;wx+=.13){if((Math.round(wx*100)+Math.round(wy*100))%3!==0)cube('window glow',wx,wy,-4.56,.035,.065,.01,mat('#ffc58e',.3));}}
// window mullions
cube('window mullion',-.2,3.25,-4.52,.055,2.45,.08,mats.black);cube('window mullion',-.2,3.25,-4.52,4.6,.055,.08,mats.black);
// rug
cube('rug',-.15,.012,.7,5.8,.025,4.2,mat('#b4a3a0'));
for(let x=-2.8;x<=2.8;x+=.18)cube('rug stripe',x,.03,.7,.012,.008,4.1,mat('#9d898f'));
// desk body, top, edge light
cube('desk pedestal',-.3,.67,-.2,3.45,.95,1.3,mats.dark);cube('desk top',-.3,1.2,-.2,3.85,.16,1.62,mats.black);
cube('desk glowing edge',-.3,1.105,-1.015,3.7,.035,.025,mats.pink);cube('desk glowing edge',-2.235,1.105,-.2,.025,.035,1.45,mats.pink);cube('desk glowing edge',1.635,1.105,-.2,.025,.035,1.45,mats.pink);
// monitor clickable
const monitor=cube('projects',-.65,2.03,-.48,1.6,1.18,.13,mats.black);monitor.userData.action='projects';
cube('monitor screen',-.65,2.05,-.4,1.48,1.02,.025,mat('#252139',.3));
// monitor typography via canvas texture
function textTexture(lines, bg='#171421', fg='#ff86bf', size=72){const c=document.createElement('canvas');c.width=512;c.height=320;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,320);ctx.fillStyle=fg;ctx.font=`500 ${size}px monospace`;lines.forEach((l,i)=>ctx.fillText(l,28,92+i*78));ctx.fillStyle='#a8a0b8';ctx.font='20px monospace';ctx.fillText('SELECT TO EXPLORE',28,284);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t});}
const screen=cube('screen text',-.65,2.05,-.38,1.42,.96,.012,textTexture(['MY','WORK']));screen.userData.action='projects';
cube('monitor stand',-.65,1.38,-.48,.12,.3,.12,mats.metal);cube('monitor foot',-.65,1.27,-.48,.55,.05,.3,mats.metal);
// small keyboard and mug
cube('keyboard',.4,1.31,-.25,.85,.07,.32,mat('#373340'));for(let i=0;i<9;i++)cube('key',.05+i*.085,1.352,-.25,.055,.015,.2,mat('#9b91a6'));
cylinder('mug',1.05,1.43,-.55,.14,.16,.28,mats.cream);cylinder('coffee',1.05,1.58,-.55,.125,.125,.012,mat('#30202b'));
// desk lamp
cylinder('lamp base',-2.05,1.32,-.25,.28,.28,.07,mats.metal);cylinder('lamp stem',-2.05,1.66,-.25,.035,.035,.65,mats.metal);const shade=cylinder('lamp shade',-2.05,2.04,-.25,.3,.12,.25,mats.pink);shade.rotation.z=Math.PI;
// wall project board clickable
const board=cube('board',3.4,3.1,-4.65,2.7,1.7,.12,mats.black);board.userData.action='projects';
cube('board inner',3.4,3.1,-4.56,2.55,1.55,.03,mat('#262331'));
for(let i=0;i<4;i++){let x=2.45+i*.62;cube('project card',x,3.12,-4.51,.43,.93,.05,mat(['#e6a2b8','#7d91ad','#d5ba8c','#7fa99d'][i]));cube('project card header',x,3.38,-4.47,.31,.07,.012,mats.black);for(let j=0;j<3;j++)cube('project card line',x,3.15-j*.16,-4.47,.27,.018,.012,mat('#494457'));sphere('pin',x,3.67,-4.45,.045,mats.pink)}
// shelves left wall: books and decor
cube('shelf upper',-5.48,3.65,-1.65,.62,.12,2.8,mats.wood);cube('shelf lower',-5.48,2.45,-1.65,.62,.12,2.8,mats.wood);
for(let i=0;i<9;i++){let h=.35+(i%3)*.09;cube('book',-5.35,3.65+h/2,-2.8+i*.27,.25,h,.18,mat(['#d47fa3','#7d91ad','#e5c48d','#5e8d83'][i%4]));}
const aboutObj=cube('about object',-5.45,2.83,-.55,.45,.55,.45,mats.blue);aboutObj.userData.action='about';sphere('decor orb',-5.4,3.25,-.55,.22,mats.pink);
// plant by window
cylinder('plant pot',2.4,.45,-3.2,.34,.28,.65,mat('#a96e71'));for(let i=0;i<7;i++){let leaf=cube('plant leaf',2.4+Math.sin(i*2)*.35,1.05+(i%3)*.16,-3.2+Math.cos(i*2)*.18,.12,.7,.1,mat(i%2?'#648c78':'#8db39a'));leaf.rotation.z=(i-3)*.22;leaf.rotation.x=.22;}
// floor speaker and side cabinet
cube('cabinet',4.6,.55,-3.5,1.55,.95,.7,mats.dark);cube('cabinet top',4.6,1.05,-3.5,1.65,.12,.8,mats.wood);
const speaker=cylinder('speaker',4.6,1.55,-3.55,.28,.28,.16,mats.black);speaker.rotation.x=Math.PI/2;speaker.userData.action='contact';const cone=cylinder('speaker cone',4.6,1.55,-3.45,.17,.17,.04,mats.metal);cone.rotation.x=Math.PI/2;
// framed abstract art on left wall
cube('art frame',-5.72,4.55,-3.6,.08,1.05,.82,mats.black);cube('art canvas',-5.66,4.55,-3.6,.035,.9,.67,mat('#e4d6d5'));const art1=cube('art stripe',-5.63,4.55,-3.6,.02,.72,.12,mats.pink);art1.rotation.z=.55;const art2=cube('art stripe',-5.62,4.55,-3.6,.02,.72,.12,mats.blue);art2.rotation.z=-.55;
// ceiling light
const ceiling=cylinder('ceiling light',0,5.25,-.3,.55,.55,.08,mats.black);const glow=cylinder('ceiling glow',0,5.19,-.3,.42,.42,.035,mats.cream);
// clickable invisible-ish hotspots
const contactHot=cube('contact',4.58,1.5,-3.42,.75,.75,.18,mat('#ff75b6'));contactHot.material.transparent=true;contactHot.material.opacity=.01;contactHot.userData.action='contact';
// camera target and responsive composition
const target=new THREE.Vector3(0,2.1,-.7);let targetX=0,targetY=0,dragging=false,downX=0,downY=0,prevX=0,prevY=0,hasDragged=false;
function setCamera(){const mobile=innerWidth<760;camera.position.set(mobile?7.7:7.8,mobile?5.7:5.6,mobile?12.6:10.8);camera.lookAt(target)}setCamera();
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;hasDragged=false;downX=prevX=e.clientX;downY=prevY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;let dx=e.clientX-prevX,dy=e.clientY-prevY;if(Math.abs(e.clientX-downX)+Math.abs(e.clientY-downY)>5)hasDragged=true;  targetX+=dx*.0028;targetY+=dy*.0016;targetY=THREE.MathUtils.clamp(targetY,-.1,.1);prevX=e.clientX;prevY=e.clientY;});
canvas.addEventListener('pointerup',e=>{dragging=false;if(!hasDragged)pick(e.clientX,e.clientY);});canvas.addEventListener('pointercancel',()=>dragging=false);
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
const clickableObjects=[];
function pick(x,y){
  // Do not let room picking interfere with an open information panel.
  if (panel?.classList.contains('open')) return false;
  const rect=canvas.getBoundingClientRect();
  mouse.x=((x-rect.left)/rect.width)*2-1;
  mouse.y=-((y-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);
  // Dedicated hit targets are tested directly, so decorative meshes cannot swallow clicks.
  const hits=raycaster.intersectObjects(clickableObjects,false);
  if(hits.length){openPanel(hits[0].object.userData.action);return true;}
  const fallback=raycaster.intersectObjects(scene.children,false).find(h=>h.object.userData.action && !h.object.userData.hitTarget);
  if(fallback){openPanel(fallback.object.userData.action);return true;}
  return false;
}
canvas.addEventListener('pointermove',e=>{
  if(dragging)return;
  const rect=canvas.getBoundingClientRect();
  mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
  mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);
  canvas.style.cursor=raycaster.intersectObjects(clickableObjects,false).length?'pointer':'grab';
});
const panel=document.querySelector('#detailPanel'),backdrop=document.querySelector('#backdrop'),panelContent=document.querySelector('#panelContent');
  const content={projects:`<span class="panel-kicker">01 / PROJECTS</span><h3>Selected Work</h3><p>Projects I've built across development, cloud, and blockchain.</p>
  <a class="project" href="https://github.com/Koushik-raju/Library-Management-System" target="_blank" rel="noopener"><div><strong>Library Management System</strong><span>PYTHON · XAMPP · MYSQL</span></div><em>↗</em></a>
  <a class="project" href="https://github.com/Koushik-raju/AWS-Website-Hosting" target="_blank" rel="noopener"><div><strong>Website Hosting on AWS (EC2 + S3)</strong><span>AWS · EC2 · S3 · IAM</span></div><em>↗</em></a>
  <a class="project" href="https://github.com/Koushik-raju/Blockchain-Website-Hosting" target="_blank" rel="noopener"><div><strong>Decentralized Website Hosting (Ethereum)</strong><span>NODE.JS · TRUFFLE · GANACHE · SOLIDITY · WEB3.JS</span></div><em>↗</em></a>
  <p style="font-family:var(--mono);font-size:10px;color:var(--accent-2); margin-top:1.8rem; letter-spacing:.12em">EXPERIMENTS</p>
<a class="project" href="Snake.html" target="_blank" rel="noopener"><div><strong>Snake</strong><span>HTML · JS · CANVAS</span></div><em>↗</em></a>
<a class="project" href="TicTacToe.html" target="_blank" rel="noopener"><div><strong>Tic Tac Toe</strong><span>HTML · JS</span></div><em>↗</em></a>
<a class="project" href="2048.html" target="_blank" rel="noopener"><div><strong>2048</strong><span>HTML · JS</span></div><em>↗</em></a>
<a class="project" href="Pong.html" target="_blank" rel="noopener"><div><strong>Pong</strong><span>HTML · JS</span></div><em>↗</em></a>
<a class="project" href="MemoryCard.html" target="_blank" rel="noopener"><div><strong>Memory Card</strong><span>HTML · JS</span></div><em>↗</em></a>
<a class="project" href="ScheduleManager.html" target="_blank" rel="noopener"><div><strong>Task / Schedule Manager</strong><span>HTML · JS</span></div><em>↗</em></a>
<a class="contact-link" href="Certification.html" target="_blank" rel="noopener">VIEW ALL CERTIFICATIONS ↗</a>`,about:`<span class="panel-kicker">02 / ABOUT KOUSHIK</span><h3>Developer.<br>Tester. Designer.</h3><p>Hey, I'm <b style="color:#fff">Koushik Raju</b>. A web developer with a love for creating intuitive and user-friendly digital experiences. Background in Bachelor of Computer Applications.</p><p>I specialize in front-end (HTML, CSS, JavaScript), ReactJS, back-end (Java), databases (MySQL, MongoDB), and Manual Testing. Jr. Software Tester at EXAR for ~8 months (manual + automated testing, tracking via Notion).</p><div class="skill-list"><span>HTML & CSS</span><span>JAVASCRIPT</span><span>REACTJS</span><span>JAVA</span><span>MYSQL</span><span>MONGODB</span><span>MANUAL TESTING</span><span>AUTOMATED TESTING</span></div><p>When I'm not coding, I enjoy reading books and skating.</p>`,contact:`<span class="panel-kicker">03 / CONTACT</span><h3>Let's build something</h3><p>Open to collaborations, QA/testing opportunities, and interesting projects.</p><div class="project"><div><strong>Email</strong><span>koushikrajusr@gmail.com</span></div><em>→</em></div><a class="contact-link" href="mailto:koushikrajusr@gmail.com">SEND EMAIL ↗</a><a class="contact-link" href="https://github.com/Koushik-raju" target="_blank" rel="noopener">GITHUB ↗</a><a class="contact-link" href="https://www.linkedin.com/in/koushik-raju-s-r-0a0871231/" target="_blank" rel="noopener">LINKEDIN ↗</a>`};
const roomHomeTarget = new THREE.Vector3(0, 2.1, -.7);
const sectionTargets = {
  projects: new THREE.Vector3(-.65, 2.1, -.45),
  about: new THREE.Vector3(-4.9, 3.0, -.65),
  contact: new THREE.Vector3(4.35, 1.65, -3.35),
  games: new THREE.Vector3(3.1, 3.1, -4.35)
};
let cameraGoal = null;
function moveCameraToSection(which) {
  const focus = sectionTargets[which];
  if (!focus) return;
  // Move the camera toward the selected object while preserving a readable angle.
  const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
  const distance = which === 'about' ? 4.0 : 4.4;
  cameraGoal = { position: focus.clone().add(direction.multiplyScalar(distance)).add(new THREE.Vector3(0, 0.6, 0)), target: focus.clone() };
}
function openPanel(which){
  if (!content[which]) return;
  panelContent.innerHTML=content[which];
  panel.classList.add('open');backdrop.classList.add('open');panel.setAttribute('aria-hidden','false');
  moveCameraToSection(which);
}
function closePanel(){
  panel.classList.remove('open');backdrop.classList.remove('open');panel.setAttribute('aria-hidden','true');
  cameraGoal = { position: baseCamera.clone(), target: roomHomeTarget.clone() };
  setTimeout(()=>{ targetX = THREE.MathUtils.lerp(targetX, 0, 0.3); targetY = THREE.MathUtils.lerp(targetY, 0, 0.3); }, 100);
}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.open)));document.querySelector('#closePanel').addEventListener('click',closePanel);backdrop.addEventListener('click',closePanel);addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()});
let toastTimer;function showToast(){const t=document.querySelector('#toast');t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4000)}setTimeout(showToast,900);
// Sound toggle visual state
document.querySelector('#soundToggle').addEventListener('click',()=>{const label=document.querySelector('#soundLabel');label.textContent=label.textContent==='SOUND OFF'?'SOUND ON':'SOUND OFF';showToast()});

// Larger invisible hit targets make the portfolio objects easy to click.
function addHitTarget(name, x, y, z, w, h, d, action) {
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = name; hit.position.set(x, y, z); hit.userData.action = action; hit.userData.hitTarget = true; scene.add(hit);
  clickableObjects.push(hit);
  return hit;
}
addHitTarget('monitor click target', -.65, 2.03, -.22, 2.05, 1.55, .65, 'projects');
addHitTarget('about click target', -5.15, 2.95, -.55, 1.1, 1.15, .9, 'about');
addHitTarget('contact click target', 4.58, 1.55, -3.45, 1.15, 1.35, 1.0, 'contact');
addHitTarget('games click target', 3.1, 2.95, -4.35, 1.25, 1.25, .8, 'games');

const clock=new THREE.Clock();
const baseCamera=new THREE.Vector3(6.6,4.9,9.2);
function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  const orbitX=THREE.MathUtils.clamp(targetX,-.24,.24);
  const orbitY=THREE.MathUtils.clamp(targetY,-.1,.1);
  const desired=new THREE.Vector3(
    baseCamera.x*Math.cos(orbitX)-baseCamera.z*Math.sin(orbitX),
    baseCamera.y+orbitY*3.2,
    baseCamera.x*Math.sin(orbitX)+baseCamera.z*Math.cos(orbitX)
  );
  if (cameraGoal) {
    camera.position.lerp(cameraGoal.position, .09);
    target.lerp(cameraGoal.target, .09);
    if (camera.position.distanceTo(cameraGoal.position) < .015 && target.distanceTo(cameraGoal.target) < .015) cameraGoal = null;
  } else {
    camera.position.lerp(desired,.06);
  }
  camera.lookAt(target.x,target.y,target.z);
  pinkLight.intensity=20+Math.sin(t*1.5)*2;
  renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);setCamera()});

// Additional room detailing: a more believable workspace with chair, window trim,
// books, desk hardware and warm practical lights. These are real 3D meshes.
const extraMat=(c,r=.8,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const leather=extraMat('#28232c',.52), walnut=extraMat('#604337',.55), brass=extraMat('#a98555',.28,.72), softPink=extraMat('#f1a4bd',.38), screenDark=extraMat('#11121d',.28);
// Parquet boards add clear perspective/depth to the floor.
for(let z=-4.45;z<4.7;z+=.62){
  for(let x=-5.55;x<5.55;x+=1.62){
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.57,.025,.58),extraMat(((Math.round((x+6)*10)+Math.round((z+5)*10))%3===0)?'#8a6b5d':'#6f574e',.88));
    board.position.set(x+.78,-.005,z+.3);board.receiveShadow=true;scene.add(board);
  }
}
// A cushioned task chair in front of the desk, with a metal pedestal and casters.
cube('chair seat',-.45,.72,1.55,1.05,.22,.92,leather);
cube('chair back',-.45,1.35,2.0,1.04,1.08,.2,leather);
cube('chair back inset',-.45,1.37,2.105,.77,.78,.025,extraMat('#332b37',.9));
cylinder('chair column',-.45,.37,1.55,.09,.11,.55,brass);
cube('chair base',-.45,.12,1.55,.82,.07,.72,brass);
for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const leg=cube('chair spoke',-.45+Math.cos(a)*.38,.09,1.55+Math.sin(a)*.32,.42,.045,.055,brass);leg.rotation.y=-a;}
// Desk drawers and handles, plus a mouse and desk mat.
for(let i=0;i<3;i++){cube('drawer',.78,.88,-.12+i*.34,.55,.2,.28,extraMat('#29242d'));cube('drawer handle',.78,.89,.035+i*.34,.17,.025,.025,brass)}
cube('desk mat',.45,1.292,.18,1.2,.025,.57,extraMat('#28242e',.95));
sphere('mouse',1.04,1.35,.18,.095,extraMat('#b8b2bd',.4,.3));
// Better monitor bezels, status LED and speaker pair.
cube('monitor lower bezel',-.65,1.49,-.385,1.5,.075,.04,extraMat('#28242e',.35,.4));
sphere('monitor power light',-.02,1.49,-.357,.018,softPink);
for(const x of [-1.75,1.45]){
  cube('desktop speaker',x,1.53,-.4,.25,.42,.24,extraMat('#17151d',.5,.2));
  cylinder('speaker driver',x,1.55,-.265,.073,.073,.025,brass).rotation.x=Math.PI/2;
}
// Curtain rails and side curtains frame the glowing city window.
cylinder('curtain rail',-.2,4.64,-4.54,.035,.035,5.0,brass).rotation.z=Math.PI/2;
for(const x of [-2.65,2.25]){
  const curtain=cube('curtain',x,3.25,-4.55,.38,2.75,.08,extraMat('#38303e',.94));
  curtain.rotation.z=x<0?-.025:.025;
  for(let j=0;j<4;j++)cube('curtain fold',x-.12+j*.08,3.25,-4.49,.018,2.55,.018,extraMat('#514052'));
}
// Ceiling perimeter coving and warm under-shelf lighting.
// Open ceiling intentionally omitted so the camera can look into the room.
cube('back wall crown',0,5.36,-4.73,11.7,.12,.18,extraMat('#3b3442'));
const shelfGlow=new THREE.PointLight('#ffb78a',7,4);shelfGlow.position.set(-4.7,3.5,-1.65);scene.add(shelfGlow);
const monitorGlow=new THREE.PointLight('#a6b7ff',4,3);monitorGlow.position.set(-.65,2.05,-.15);scene.add(monitorGlow);
// A small pinned note on the board, and a second portfolio entry point for writing.
const note=cube('writing note',3.1,2.93,-4.48,.48,.55,.04,extraMat('#e7d7b5'));
note.userData.action='games';
for(let i=0;i<3;i++)cube('note line',3.1,3.05-i*.12,-4.45,.28,.018,.012,extraMat('#5c5361'));
// Replace placeholder panel copy with the user's role and a Writing section.
content.about=`<span class="panel-kicker">02 / ABOUT</span><h3>Developer · Tester · Designer</h3><p>Hey, I'm <b style="color:#fff">Koushik Raju</b>. A web developer with a background in Bachelor of Computer Applications, focused on building intuitive digital experiences.</p><p>I specialize in front-end (HTML, CSS, JavaScript, ReactJS), back-end (Java), databases (MySQL, MongoDB), and Manual Testing. Former Jr. Software Tester at EXAR (~8 months) doing manual and automated testing with Notion for tracking.</p><div class="skill-list"><span>HTML & CSS</span><span>JAVASCRIPT</span><span>REACTJS</span><span>JAVA</span><span>MYSQL</span><span>MONGODB</span><span>MANUAL TESTING</span><span>AUTOMATED TESTING</span></div><p>When I'm not coding, I enjoy reading and skating.</p>`;
content.games=`<span class="panel-kicker">04 / GAMES</span><h3>Mini games<br>& experiments.</h3><p>A collection of small games built while learning. Click any to play.</p><a class="project" href="Snake.html" target="_blank" rel="noopener"><div><strong>Snake Game</strong><span>CANVAS · JAVASCRIPT</span></div><em>↗</em></a><a class="project" href="TicTacToe.html" target="_blank" rel="noopener"><div><strong>Tic Tac Toe</strong><span>LOGIC · INTERACTION</span></div><em>↗</em></a><a class="project" href="2048.html" target="_blank" rel="noopener"><div><strong>2048</strong><span>GRID · SLIDING LOGIC</span></div><em>↗</em></a><a class="project" href="Pong.html" target="_blank" rel="noopener"><div><strong>Pong</strong><span>CLASSIC · CANVAS</span></div><em>↗</em></a><a class="project" href="MemoryCard.html" target="_blank" rel="noopener"><div><strong>Memory Card</strong><span>MATCHING · FLIP</span></div><em>↗</em></a><a class="project" href="ScheduleManager.html" target="_blank" rel="noopener"><div><strong>Task Manager</strong><span>CRUD · LOCALSTORAGE</span></div><em>↗</em></a>`;
