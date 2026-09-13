const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const zoneEl=document.querySelector('#zone'),hintEl=document.querySelector('#shopHint'),themeBtn=document.querySelector('#themeBtn');
const panel=document.querySelector('#shopPanel'),shopTitle=document.querySelector('#shopTitle'),shopDesc=document.querySelector('#shopDesc'),shopMeta=document.querySelector('#shopMeta'),shopTag=document.querySelector('#shopTag');
document.querySelector('#closeShop').onclick=()=>panel.classList.add('hidden');

const keys=new Set();let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio,2),theme='dusk',last=performance.now(),cameraX=0,nearShop=null;
const world={width:6200,groundY:0};
const player={x:320,y:0,w:42,h:78,speed:220,run:380,dir:1,walkT:0};

const zones=[
  {x:0,w:900,name:'錦糸町駅前'},
  {x:900,w:1700,name:'南口商店街'},
  {x:2600,w:1300,name:'居酒屋横丁'},
  {x:3900,w:1200,name:'錦糸公園サイド'},
  {x:5100,w:1100,name:'晴空塔ビューストリート'}
];

const shops=[
  {x:760,w:260,h:340,name:'KINSI COFFEE',tag:'CAFE',desc:'木目と暖色ライトの小さなカフェ。雲逛街の休憩ポイント。',meta:'おすすめ：カフェラテ / プリン',c:'#d07a59'},
  {x:1080,w:300,h:390,name:'RAMEN 88',tag:'RAMEN',desc:'湯気と赤い暖簾が目印のラーメン店。横板街機らしい派手めの看板。',meta:'おすすめ：醤油ラーメン',c:'#c94f45'},
  {x:1430,w:280,h:360,name:'BOOKS & RECORDS',tag:'BOOKS',desc:'本とレコードの小店。ガラス越しに棚とポスターが見える。',meta:'2F USED RECORDS',c:'#527e9c'},
  {x:1760,w:340,h:430,name:'PARCO STYLE MALL',tag:'MALL',desc:'実在建物の再現ではなく、錦糸町の商業感を強めた大型モール風。',meta:'FASHION / FOOD / GOODS',c:'#b05b8b'},
  {x:2190,w:260,h:355,name:'SWEETS LAB',tag:'SWEETS',desc:'ネオンとショーケースが目立つスイーツ店。',meta:'CREPE / CAKE / SOFT CREAM',c:'#d985a2'},
  {x:2700,w:230,h:320,name:'焼鳥 とり金',tag:'IZAKAYA',desc:'提灯が並ぶ小さな居酒屋。夕方になると一番映える区画。',meta:'焼鳥 / ハイボール',c:'#a33f35'},
  {x:2960,w:220,h:300,name:'酒場 まる',tag:'IZAKAYA',desc:'赤提灯と木札の昔ながらの酒場。',meta:'刺身 / 煮込み',c:'#8d5138'},
  {x:3210,w:250,h:335,name:'GYOZA CLUB',tag:'DINER',desc:'レトロ街機風の餃子食堂。',meta:'餃子 / 炒飯',c:'#d89b48'},
  {x:3500,w:240,h:310,name:'NIGHT BAR 24',tag:'BAR',desc:'青紫ネオンの小さなバー。',meta:'COCKTAIL / MUSIC',c:'#6259aa'},
  {x:4130,w:280,h:300,name:'PARK SIDE CAFE',tag:'CAFE',desc:'公園沿いの開放的なカフェ。ベンチと緑が多い。',meta:'TERRACE SEAT',c:'#5b916a'},
  {x:5250,w:300,h:370,name:'SKYTREE VIEW DINER',tag:'DINER',desc:'遠くの晴空塔シルエットを見ながら歩く終盤エリア。',meta:'VIEW POINT',c:'#5973a8'}
];

const props=[];for(let x=420;x<world.width;x+=360){props.push({type:Math.random()>.55?'lamp':'vending',x:x+Math.random()*110});}
const npcs=[];for(let i=0;i<20;i++)npcs.push({x:500+Math.random()*5400,y:Math.random()*35-10,dir:Math.random()>.5?1:-1,speed:22+Math.random()*35,c:['#5e6d91','#7d5a61','#53725f','#6f6689'][i%4]});

function resize(){dpr=Math.min(devicePixelRatio,2);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);W=innerWidth;H=innerHeight;world.groundY=H*.76;player.y=world.groundY-10;}resize();addEventListener('resize',resize);
addEventListener('keydown',e=>{keys.add(e.code);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','ShiftLeft','ShiftRight','KeyE'].includes(e.code))e.preventDefault();if(e.code==='KeyE'&&nearShop)openShop(nearShop)});addEventListener('keyup',e=>keys.delete(e.code));
themeBtn.onclick=()=>{theme=theme==='dusk'?'day':'dusk';themeBtn.textContent=theme==='dusk'?'切换白天':'切换傍晚'};

function openShop(s){shopTag.textContent=s.tag;shopTitle.textContent=s.name;shopDesc.textContent=s.desc;shopMeta.textContent=s.meta;panel.classList.remove('hidden')}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function fill(c){ctx.fillStyle=c;ctx.fill()}
function line(c,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke()}
function text(t,x,y,size=16,c='#fff',align='left',weight=700){ctx.fillStyle=c;ctx.font=`${weight} ${size}px sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y)}

function drawSky(){const g=ctx.createLinearGradient(0,0,0,H*.72);if(theme==='dusk'){g.addColorStop(0,'#4d5e82');g.addColorStop(.55,'#8f7f8e');g.addColorStop(1,'#efaa79')}else{g.addColorStop(0,'#8ed0ff');g.addColorStop(.7,'#dff2ff');g.addColorStop(1,'#fff3d6')}ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const sunX=W*.77,sunY=H*.17;ctx.beginPath();ctx.arc(sunX,sunY,theme==='dusk'?34:42,0,Math.PI*2);ctx.fillStyle=theme==='dusk'?'rgba(255,210,130,.8)':'rgba(255,245,190,.95)';ctx.fill();
}
function drawParallax(){const p1=-cameraX*.15,p2=-cameraX*.28;
  ctx.fillStyle=theme==='dusk'?'#59657b':'#9bb3c5';for(let x=(p1%260)-260;x<W+300;x+=260){const h=90+((x*7)%70+70)%70;ctx.fillRect(x,H*.43-h,190,h)}
  ctx.fillStyle=theme==='dusk'?'#454d62':'#7f95a8';for(let x=(p2%190)-190;x<W+240;x+=190){const h=120+((x*5)%100+100)%100;ctx.fillRect(x,H*.52-h,135,h)}
  const sx=5600-cameraX*.2;if(sx>-100&&sx<W+100){ctx.fillStyle=theme==='dusk'?'#c1c9db':'#93a3b6';ctx.fillRect(sx,H*.2,12,H*.32);ctx.fillRect(sx-20,H*.28,52,10);ctx.fillRect(sx-10,H*.16,32,16);ctx.fillRect(sx+3,H*.1,5,50)}
}
function drawStreet(){ctx.fillStyle=theme==='dusk'?'#3c404c':'#656970';ctx.fillRect(0,world.groundY-42,W,100);ctx.fillStyle='#ded6c5';ctx.fillRect(0,world.groundY-12,W,H-world.groundY+12);ctx.fillStyle='#bdb3a1';ctx.fillRect(0,world.groundY-6,W,7);for(let x=(-cameraX%160)-160;x<W+160;x+=160){ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x,world.groundY-2,2,H-world.groundY+2)}
  for(let x=(-cameraX%80)-80;x<W+80;x+=80){ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillRect(x,world.groundY-30,42,4)}
}
function drawShop(s){const x=s.x-cameraX;if(x>W+100||x+s.w<-100)return;const baseY=world.groundY-46;ctx.fillStyle=theme==='dusk'?'#d7caba':'#eadfce';ctx.fillRect(x,baseY-s.h,s.w,s.h);ctx.fillStyle='#71675f';ctx.fillRect(x,baseY-s.h,s.w,12);
  for(let yy=baseY-s.h+42;yy<baseY-96;yy+=54){for(let xx=x+22;xx<x+s.w-24;xx+=48){ctx.fillStyle=theme==='dusk'?'#667897':'#8ca1b5';ctx.fillRect(xx,yy,28,32);if(theme==='dusk'&&Math.random()>.68){ctx.fillStyle='rgba(255,210,120,.38)';ctx.fillRect(xx+2,yy+2,24,28)}}}
  ctx.fillStyle='#9eb4c2';ctx.fillRect(x+18,baseY-84,s.w-36,78);ctx.fillStyle=s.c;ctx.fillRect(x+8,baseY-120,s.w-16,32);text(s.name,x+s.w/2,baseY-104,Math.min(18,s.w/12), '#fff','center',900);
  ctx.fillStyle='#5d4a3f';ctx.fillRect(x+s.w*.58,baseY-70,36,64);ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(x+28,baseY-74,s.w*.42,48);
  if(s.tag==='IZAKAYA'||s.tag==='BAR'){for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+s.w*.23+i*32,baseY-132,10,0,Math.PI*2);ctx.fillStyle=theme==='dusk'?'#ffb76d':'#d16845';ctx.fill()}}
  if(s.tag==='MALL'){ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(x+22,baseY-s.h+20,s.w-44,58);text('KINSI',x+s.w/2,baseY-s.h+49,28,'#fff','center',900)}
}
function drawProps(){
  for(const p of props){
    const x=p.x-cameraX; if(x<-80||x>W+80) continue;
    if(p.type==='lamp'){
      ctx.fillStyle='#59606c';ctx.fillRect(x,world.groundY-155,5,150);ctx.fillRect(x,world.groundY-154,30,4);
      ctx.fillStyle=theme==='dusk'?'#ffd98b':'#ece4cf';ctx.fillRect(x+23,world.groundY-160,18,12);
      if(theme==='dusk'){ctx.fillStyle='rgba(255,220,130,.13)';ctx.beginPath();ctx.arc(x+32,world.groundY-154,42,0,Math.PI*2);ctx.fill();}
    }else{
      ctx.fillStyle='#f0f1f0';rr(x,world.groundY-92,42,88,5);fill('#f0f1f0');
      ctx.fillStyle=theme==='dusk'?'#bfe4ff':'#a8cadc';ctx.fillRect(x+6,world.groundY-82,30,50);
      for(let i=0;i<3;i++){ctx.fillStyle=['#dc5a4c','#6ba2d8','#d6a24b'][i];ctx.fillRect(x+9+i*9,world.groundY-76,6,14);}
    }
  }
}
function drawNPC(n){const x=n.x-cameraX;if(x<-60||x>W+60)return;const gy=world.groundY+n.y;ctx.fillStyle=n.c;ctx.fillRect(x-10,gy-55,20,38);ctx.fillStyle='#ddbea4';ctx.beginPath();ctx.arc(x,gy-66,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#2f3341';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-5,gy-17);ctx.lineTo(x-8+n.dir*3,gy);ctx.moveTo(x+5,gy-17);ctx.lineTo(x+8+n.dir*3,gy);ctx.stroke()}
function drawPlayer(){const x=player.x-cameraX,gy=player.y;const moving=keys.has('ArrowLeft')||keys.has('ArrowRight')||keys.has('KeyA')||keys.has('KeyD');const swing=moving?Math.sin(player.walkT*10)*7:0;ctx.save();ctx.translate(x,gy);if(player.dir<0)ctx.scale(-1,1);ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0,4,26,7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#263247';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-7,-18);ctx.lineTo(-8+swing,1);ctx.moveTo(7,-18);ctx.lineTo(8-swing,1);ctx.stroke();ctx.fillStyle='#5d78a7';rr(-18,-62,36,46,8);fill('#5d78a7');ctx.fillStyle='#e2c1a5';ctx.beginPath();ctx.arc(0,-76,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2e2b31';ctx.beginPath();ctx.arc(0,-80,14,Math.PI,0);ctx.fill();ctx.fillStyle='#e2b54c';ctx.fillRect(13,-55,12,22);ctx.restore()}

function update(dt){let dx=0,dy=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))dx--;if(keys.has('ArrowRight')||keys.has('KeyD'))dx++;if(keys.has('ArrowUp')||keys.has('KeyW'))dy--;if(keys.has('ArrowDown')||keys.has('KeyS'))dy++;const sp=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?player.run:player.speed;if(dx){player.x=Math.max(50,Math.min(world.width-50,player.x+dx*sp*dt));player.dir=dx>0?1:-1;player.walkT+=dt}else player.walkT+=dt*.15;player.y=Math.max(world.groundY-24,Math.min(world.groundY+30,player.y+dy*95*dt));cameraX=Math.max(0,Math.min(world.width-W,player.x-W*.38));for(const n of npcs){n.x+=n.dir*n.speed*dt;if(n.x<150||n.x>world.width-150)n.dir*=-1}
  const z=zones.find(z=>player.x>=z.x&&player.x<z.x+z.w);if(z)zoneEl.textContent=z.name;nearShop=null;let best=9999;for(const s of shops){const c=s.x+s.w/2,d=Math.abs(player.x-c);if(d<best&&d<s.w*.65+90){best=d;nearShop=s}}hintEl.textContent=nearShop?`E 查看「${nearShop.name}」`:'继续往前逛 →';
}
function render(){drawSky();drawParallax();drawStreet();for(const s of shops)drawShop(s);drawProps();for(const n of npcs)drawNPC(n);drawPlayer();}
function loop(t){const dt=Math.min((t-last)/1000,.05);last=t;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
