
/* Voyage choices, in-flight crystal allocation, and a short learn-by-doing guide. */
(() => {
  'use strict';
  function init() {
    const A=window.Aether, g=A?.game;
    if (!g || document.getElementById('a-voyage-routes')) return;
    const $=id=>document.getElementById(id);
    const number=n=>Math.round(n).toLocaleString('en');
    const touch=document.body.classList.contains('touch');
    const title=$('title');
    const edition=document.createElement('div'); edition.className='a-edition'; edition.textContent='THE EXPANDED FLIGHT EDITION';
    title.querySelector('h1').before(edition);
    title.querySelector('.lede').textContent='Take the helm. Trade broadsides, bring home Crystal Shards, and build a ship that sails your way.';
    const sub=document.createElement('p'); sub.className='a-title-modes'; sub.textContent='Combat voyages · Free flight · Navigation courses · Photo camera';
    $('btn-to-port').after(sub);
    const dragTip=document.createElement('p'); dragTip.id='a-port-drag'; dragTip.innerHTML='<span>↔</span> Drag to turn the ship'; document.body.append(dragTip);
    const power=document.createElement('section'); power.id='a-flight-power'; power.setAttribute('aria-label','Crystal power allocation');
    power.innerHTML='<div>Crystal power <small>switch with X</small></div><nav><button data-power="-2" type="button">Sails</button><button data-power="0" type="button">Even</button><button data-power="2" type="button">Guns</button></nav>';
    $('ship').append(power);
    let lastPowerChange=-Infinity;
    function setPower(value) {
      if (g.mode!=='voyage' || g.paused || performance.now()-lastPowerChange<650) return;
      lastPowerChange=performance.now(); g.setPower(value);
      A.notify(value<0?'Power to sails: more speed':value>0?'Power to guns: faster, heavier shots':'Crystal power balanced');
      A.emit('power',{power:value}); updatePower();
    }
    function updatePower() {
      if (!g.player) return;
      const value=g.progress.data.ships[g.player.ship.recipe.id].power;
      power.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.power)===value)));
    }
    power.addEventListener('click',e=>{const b=e.target.closest('[data-power]');if(b)setPower(Number(b.dataset.power));});
    document.addEventListener('keydown',e=>{
      if (e.repeat || /input|textarea|select/i.test(e.target.tagName) || document.body.classList.contains('explore-photo')) return;
      if (e.key.toLowerCase()==='x' && g.mode==='voyage') { const n=g.progress.data.ships[g.player.ship.recipe.id].power; setPower(n<0?0:n===0?2:-2); }
    });
    const guide=document.createElement('section'); guide.id='a-flight-guide'; guide.className='panel'; guide.hidden=true;
    guide.innerHTML='<div><span id="a-guide-count"></span><button type="button" id="a-guide-close" aria-label="Dismiss flight guide">✕</button></div><b id="a-guide-title"></b><p id="a-guide-copy"></p><button type="button" id="a-guide-next">Next tip →</button>';
    document.body.append(guide);
    let guideStep=-1, guideStart=0, guideBaseline=.5, guideSeen=false;
    try { guideSeen=localStorage.getItem('aethermoor-guide-complete')==='1'; } catch (_) {}
    const lessons=[
      ['Take the helm',touch?'Drag anywhere on the left side to turn. Move your thumb up or down to climb or descend.':'A / D turn the ship. Space climbs; Shift descends. The camera follows your heading.'],
      ['Set your pace',touch?'Hold Sail + to accelerate. Sail − slows you down for a tighter approach.':'W opens the sails; S reduces sail. Slowing down helps you line up a turn.'],
      ['Bring your guns to bear',touch?'Drag on the right to aim. The ship diagram shows which bank is facing your aim.':'Move the mouse to look around. Click the sky to capture the mouse; Esc releases it. Side-on aim brings your broadside to bear.'],
      ['Choose where to hit',touch?'Tap Aim to cycle hull, sails, or crystals. Hold Fire to shoot when the bank is ready.':'Press T to cycle hull, sails, or crystals. Click or hold F to fire. The reticle confirms which part you hit.'],
      ['A burst of speed',touch?'Tap Surge for a short burst. It recharges as you fly. Collect the glowing shards by flying through them.':'R gives a short surge of speed. Fly through glowing shards to collect them; X shifts power between sails and guns.']
    ];
    function showLesson(index) {
      guideStep=index; guideStart=performance.now(); guideBaseline=g.player?.sail??.5;
      if (index>=lessons.length) { guide.hidden=true;guideSeen=true;try{localStorage.setItem('aethermoor-guide-complete','1');}catch(_){} return; }
      guide.hidden=false; $('a-guide-count').textContent=`FLIGHT GUIDE ${index+1} / ${lessons.length}`;
      $('a-guide-title').textContent=lessons[index][0]; $('a-guide-copy').textContent=lessons[index][1];
      $('a-guide-next').textContent=index===lessons.length-1?'Ready to fly ✓':'Next tip →';
    }
    $('a-guide-next').addEventListener('click',()=>showLesson(guideStep+1));
    $('a-guide-close').addEventListener('click',()=>showLesson(lessons.length));
    A.on('shot',d=>{
      if (d.owner==='player') {
        if (!g.paused) g.cam.shake=Math.max(g.cam.shake,Math.min(.12,.035+d.count*.006));
        if (guideStep===3&&!guide.hidden) showLesson(4);
      }
    });
    A.on('surge',()=>{if(guideStep===4&&!guide.hidden)showLesson(5);});
    A.on('settings',()=>{if(!A.settings.tutorial)guide.hidden=true;});
    const calm=$('calm');
    const lead=document.createElement('span'); lead.className='a-eyebrow'; lead.textContent='YOUR NEXT MOVE'; calm.prepend(lead);
    const recap=document.createElement('div'); recap.id='a-voyage-recap';
    recap.innerHTML='<span><small>Carrying</small><b id="a-recap-carry">◆ 0</b></span><span><small>Banked in port</small><b id="a-recap-bank">◆ 0</b></span><span><small>Ship condition</small><b id="a-recap-health">Recovering</b></span>';
    $('calm-line').after(recap);
    const routeTitle=document.createElement('h3'); routeTitle.textContent='Choose the next encounter'; routeTitle.className='a-choice-label'; recap.after(routeTitle);
    const routes=document.createElement('div'); routes.id='a-voyage-routes'; routeTitle.after(routes);
    const perkLabel=document.createElement('h3'); perkLabel.textContent='Prepare for this encounter'; perkLabel.className='a-choice-label'; routes.after(perkLabel);
    const perks=document.createElement('div'); perks.id='a-voyage-perks'; perkLabel.after(perks);
    const perkDefs=[
      {id:'drill',title:'Quick loading',line:'Guns reload 15% faster',icon:'✦',values:{reload:.85,surgeRecharge:1,magnet:1}},
      {id:'surge',title:'Crystal reserve',line:'Surge recharges 20% sooner',icon:'◇',values:{reload:1,surgeRecharge:.8,magnet:1}},
      {id:'collector',title:'Salvage rig',line:'Shard collection reach +70%',icon:'◆',values:{reload:1,surgeRecharge:1,magnet:1.7}}
    ];
    let perk='drill', route=0, options=[], lastState='', lastMode='', lastUpdate=0, lastWave=0;
    function pickPerk(id) {
      perk=id; const def=perkDefs.find(p=>p.id===id); window.__aetherPerks={...def.values};
      if (g.player) g.setPower(g.progress.data.ships[g.player.ship.recipe.id].power,false);
      perks.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.perk===id)));
    }
    perks.innerHTML=perkDefs.map(p=>`<button type="button" data-perk="${p.id}" aria-pressed="${p.id===perk}"><span>${p.icon}</span><b>${p.title}</b><small>${p.line}</small></button>`).join('');
    perks.addEventListener('click',e=>{const b=e.target.closest('[data-perk]');if(b)pickPerk(b.dataset.perk);});
    const names={skiff:'Skiff',cutter:'Cutter',brig:'Brig',frigate:'Frigate',galleon:'Treasure galleon',manowar:"Man-o’-war"};
    const composition=ids=>{const sums={};ids.forEach(id=>sums[id]=(sums[id]||0)+1);return Object.entries(sums).map(([id,n])=>`${n} ${names[id]}${n>1?'s':''}`).join(' · ');};
    function selectRoute(index) {
      route=index; const option=options[index]; if(!option)return;
      g.waves.next={ids:[...option.recipe.ids],captain:option.recipe.captain};
      g.waves.routeLabel=option.title; window.__aetherRouteReward=option.reward;
      routes.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
      $('btn-sail-on').textContent=`Sail on: ${option.title}`;
    }
    function presentChoices() {
      guide.hidden=true;
      if(document.pointerLockElement)document.exitPointerLock();
      const n=g.waves.n, standard=g.waves.next||g.waveRecipe(n,g.difficulty.extra), strongest=standard.ids.find(id=>id!=='galleon'&&id!=='manowar')||'brig';
      $('calm-title').textContent=`Wave ${n} complete`;
      const alternate=n>=3&&n%2===1?{title:'Treasure chase',description:'Catch a fleeing galleon. Target its sails before it escapes.',recipe:{ids:['galleon',...(n>=6?['cutter']:[])],captain:-1},reward:1.2}
        :{title:'Captain duel',description:'A single tougher opponent, with a richer bounty.',recipe:{ids:[strongest],captain:0},reward:1.15};
      options=[{title:'Patrol',description:'The next scheduled wave. Several targets; the usual rewards.',recipe:{ids:[...standard.ids],captain:standard.captain},reward:1},alternate];
      routes.innerHTML=options.map((o,i)=>`<button type="button" data-route="${i}" aria-pressed="${i===0}"><div><b>${o.title}</b><span>${o.reward===1?'Standard rewards':`+${Math.round((o.reward-1)*100)}% shards`}</span></div><small>${composition(o.recipe.ids)}${o.recipe.captain>=0?' · Captain aboard':''}</small><p>${o.description}</p></button>`).join('');
      selectRoute(0); pickPerk(perk);
      $('calm-line').textContent='Your crew salvaged the remaining shards. Prepare the next encounter, or return to port with everything.';
      $('btn-go-port').textContent=`Bank ◆ ${number(g.voyage.shards)}`;
      A.emit('intermission',{wave:n,carrying:g.voyage.shards});
    }
    routes.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)selectRoute(Number(b.dataset.route));});
    $('score').innerHTML='<span>Wave <b id="wave-n">1</b> · Downed <b id="score-n">0</b></span><span hidden>◆ <b id="voyage-n">0</b></span>';
    const statsNode=document.createElement('div'); statsNode.id='a-voyage-status'; statsNode.className='panel'; statsNode.innerHTML='<span id="a-status-main"></span><span id="a-status-detail"></span>';
    $('score').after(statsNode);
    const veil=document.createElement('div'); veil.id='a-voyage-veil'; veil.hidden=true; document.body.append(veil);
    const waveKey=()=>g.waves.state;
    function loop(now) {
      requestAnimationFrame(loop);
      if(now-lastUpdate<100)return;lastUpdate=now;
      const mode=g.mode, exploring=window.__aetherExplore&&mode==='voyage', state=waveKey();
      if(mode!==lastMode) {
        lastMode=mode;
        if(mode==='voyage') {
          lastState='';lastWave=0;updatePower();
          $('help').hidden=true;$('btn-help').hidden=false;
          if(!guideSeen&&A.settings.tutorial)showLesson(0);
        } else { guide.hidden=true;window.__aetherExplore=false; }
      }
      const choose=mode==='voyage'&&!exploring&&state==='choose'&&!g.paused;
      document.body.classList.toggle('a-intermission',choose);veil.hidden=!choose;
      if(mode==='voyage'&&state!==lastState) {
        lastState=state;
        if(state==='choose'&&!exploring)presentChoices();
      }
      statsNode.hidden=mode!=='voyage'||exploring||choose;
      power.hidden=mode!=='voyage';
      if(mode==='voyage') {
        updatePower();
        if(!exploring) {
          const left=g.raiders.list.filter(r=>!r.f.down).length;
          $('a-status-main').textContent=state==='fight'?`${left} raider${left===1?'':'s'} remaining`:'Preparing the next encounter';
          $('a-status-detail').textContent=`Bank ◆ ${number(g.progress.data.shards)} · Aboard ◆ ${number(g.voyage.shards)}`;
          if(state==='fight'&&g.waves.n!==lastWave) {lastWave=g.waves.n;A.emit('wave',{number:g.waves.n+1});}
        }
        if(choose) {
          $('a-recap-carry').textContent=`◆ ${number(g.voyage.shards)}`;$('a-recap-bank').textContent=`◆ ${number(g.progress.data.shards)}`;
          const f=Math.min(...['hull','sails','crystals'].map(p=>g.player.frac(p)));
          $('a-recap-health').textContent=f>.995?'Fully repaired':`Recovering ${Math.round(f*100)}%`;
          $('btn-go-port').textContent=`Bank ◆ ${number(g.voyage.shards)}`;
        }
        if(!guide.hidden&&!g.paused&&!choose) {
          const age=now-guideStart;
          if(age>1800&&((guideStep===0&&Math.abs(g.player.turn)>.25)||(guideStep===1&&Math.abs(g.player.sail-guideBaseline)>.1)||(guideStep===2&&Math.abs(g.cam.yaw)>.25)))showLesson(guideStep+1);
        }
      }
    }
    const guideLines=$('help').querySelector('dl');
    for(const [keys,label] of [['X','shift crystal power'],['O','photo camera']]) {
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=keys;dd.textContent=label;guideLines.append(dt,dd);
    }
    A.director={presentChoices,selectRoute,pickPerk,showGuide:()=>showLesson(0),get options(){return options;},get route(){return route;},get perk(){return perk;}};
    requestAnimationFrame(loop);
  }
  document.addEventListener('aether:ready',init,{once:true});
  if(window.Aether?.game?.ready)init();
})();

