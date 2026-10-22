'use strict';
// Presentation only. Permissions, emblem groups, routes, previews and transitions
// are supplied by the existing Campaign / GameState implementation.
const $ = id => document.getElementById(id);
let view, focus = [], selected = null, prediction = null, busy = false;
let navView, navPath = [], previewSerial = 0;
let planState = null, planMoves = [];
let planLoading=false;
let replacement=null;
function localValue(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch(_){return fallback;}}
// Preferences remain usable in memory when browser storage is unavailable.
function localWrite(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));}catch(_){}}
const learning=localValue('relay-learning',{});
let pinnedPaths=localValue('relay-pins',[]).filter(p=>Array.isArray(p)&&p.length<=9&&p.every(i=>Number.isInteger(i)&&i>=0&&i<9)).slice(0,3);
let pinnedRecords=[],pinKey='',pinPending='',analysisKey='',exampleStep=0,exampleKind='opening',exampleLast=6,exampleSerial=0,renderingExample=false,learningMarkup='';
const saveLearning=()=>localWrite('relay-learning',learning);
let replyView = null;
const replyHintCache=new Map(),replyHintPending=new Set();
let names = [];
let choiceHints=[], hintKey='', hintPending='';
let frontData=null, frontKey='', frontPending='';
let parentData=null,parentKey='',parentPending='';
const places=new Map(), openingPlaces=new Map(), capturePlaces=new Map(), layers=new Map();
function learnPlaces(value,cache=places){
  if(!value||typeof value!=='object')return;
  const remember=(path,p)=>{const key=JSON.stringify(path),previous=cache.get(key);cache.delete(key);cache.set(key,{...previous,...p,address:path});if(cache.size>1024)cache.delete(cache.keys().next().value);if(p.layer)layers.set(path.length,p.layer);};
  if(value.reference&&value.name&&Array.isArray(value.address))remember(value.address,value);
  if(Array.isArray(value.path)&&value.location?.reference)remember(value.path.slice(0,-1),value.location);
  if(Array.isArray(value.destination)&&value.destination_place?.reference)remember(value.destination,value.destination_place);
  if(Array.isArray(value.path)&&value.layer)layers.set(value.path.length,value.layer);
  for(const child of Object.values(value))if(child&&typeof child==='object')learnPlaces(child,cache);
}
const activePlaces=()=>renderingExample?(exampleKind==='opening'?openingPlaces:capturePlaces):places;
const placeFor=path=>activePlaces().get(JSON.stringify(path));
function replaceLivePlaces(data){places.clear();learnPlaces(data);}
const placeLabel=path=>{
  const p=placeFor(path);
  if(!p)return path.length?path.map(i=>String.fromCharCode(65+i)).join(' · '):'World';
  // Keep exact references for name collisions; ordinary choices need only a
  // name. Full references remain in details.
  const duplicate=[...activePlaces().values()].some(other=>other.name===p.name&&other.reference!==p.reference);
  return p.name+(duplicate?' · #'+p.reference:'');
};
// A location's visual marker is independent of visits, ownership and objectives.
// It is a recognition aid; the authoritative exact reference remains in details.
const PLACE_COLORS=['#8464be','#898247','#a3659c','#458367','#ab713e','#5c7d88','#9b7766','#777d9c'];
const PLACE_COLOR_NAMES=['purple','olive','mauve','green','copper','slate','clay','lavender'];
const PLACE_PATTERN_NAMES=['vertical stripe','horizontal stripe','diagonal stripe','cross','dot','twin vertical stripes','chevron','twin horizontal stripes'];
const PLACE_PATTERNS=['<path d="M8 2v16"/>','<path d="M3 10h18"/>','<path d="m5 17 14-14"/>','<path d="M12 3v14M5 10h14"/>','<circle cx="12" cy="10" r="3" fill="currentColor" stroke="none"/>','<path d="M8 4v12m8-12v12"/>','<path d="m6 13 6-6 6 6"/>','<path d="M4 7h16M4 13h16"/>'];
function placeMarker(p){if(!p)return '';const colorIndex=p.marker.color,patternIndex=p.marker.pattern;return `<span class="placeSeal" style="--seal:${PLACE_COLORS[colorIndex]}" title="Location reference ${p.reference}" role="img" aria-label="${PLACE_COLOR_NAMES[colorIndex]} ${PLACE_PATTERN_NAMES[patternIndex]} location marker"><svg viewBox="0 0 24 20" aria-hidden="true">${PLACE_PATTERNS[patternIndex]}</svg></span>`;}
const placeLayer=path=>placeFor(path)?.layer||layers.get(path.length)||'Location';
function placeCaption(path){return `<span class="placeCaption">${placeMarker(placeFor(path))}<span>${placeLabel(path)}</span></span>`;}
function placeTag(path){const p=placeFor(path);return p?`<div class="placeTag"><strong>${placeMarker(p)} ${p.name} <span class="placeRef">#${p.reference}</span></strong><small>${p.layer||layers.get(path.length)||'Location'}${placeFor(path.slice(0,-1))&&path.length?' · in '+placeFor(path.slice(0,-1)).name:''}</small></div>`:address(path);}
const code = i => String.fromCharCode(65+i);
const who = mark => mark === 1 ? 'Blue' : mark === -1 ? 'Red' : 'Drawn';
const color = mark => mark === 1 ? 'blue' : mark === -1 ? 'red' : 'draw';
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
// A released assignment is an area choice, not a silently selected first leaf.
const assignmentFocus=data=>data.ply>0&&data.outcome===null&&data.forced.length<9?data.forced:data.focus;
const choosingLocation=()=>view.ply>0&&!view.leaf&&!view.closed&&focus.length>=view.forced.length&&view.slots.some(s=>s.legal);
const inspecting=()=>!same(focus,assignmentFocus(view))&&!choosingLocation()&&(!view.leaf||!view.slots.some(s=>s.legal));
async function assignmentView(data){const path=assignmentFocus(data);return same(data.prefix,path)?data:read(path);}
function resultSentence(g) {
  if(!g.path.length)return g.owner===0?'The world is drawn.':`${who(g.owner)} wins the world.`;
  const location=placeLabel(g.path),parent=placeLabel(g.path.slice(0,-1));
  return g.owner===0?`${location} is drawn. Its entry in ${parent} closes without an owner.`:`${who(g.owner)} captures ${location}. This claims it within ${parent}.`;
}
function gainsHtml(gains){const rows=gains.map(g=>`<p class="result">${resultSentence(g)}</p>`).join('');return gains.length>2?`<p class="result">${gains.length} locations finish, through level ${Math.max(...gains.map(g=>10-g.path.length))}.</p><details><summary>Show all results</summary>${rows}</details>`:rows;}
function ownEvent(){const mark=view.mode==='human-x'?1:view.turn;return [...view.history].reverse().find(h=>h.event.mark===mark)?.event;}
const pathName = path => path.length ? path.map(code).join(' · ') : 'World';
const address = (path, changed = false, label = 'Address · world → local', origin = -1) => `<div class="address"><small>${label}</small><div>${path.map((i,n)=>`<span title="${names[i]}" class="${changed && n===path.length-1?'changed':''} ${n===origin?'origin':''}">${code(i)}</span>`).join('')}${path.length?'':'<small>World</small>'}</div></div>`;
async function request(url, data) {
  let result;
  try { result = await RelayTransport.request(url, data); }
  catch (failure) { failure.stale=!!failure.message?.includes('campaign changed'); throw failure; }
  learnPlaces(result,url.startsWith('/api/example')?(url.includes('kind=opening')?openingPlaces:capturePlaces):places);
  return result;
}
const read = path => request('/api/view?path='+encodeURIComponent(JSON.stringify(path)));
const act = (action, extra={}) => request('/api/action',{action,revision:view.revision,...extra});
function error(e) { $('error').hidden=false; $('error').textContent=e.message; }
function clearError() { $('error').hidden=true;$('notice').hidden=true; }
function notice(message){$('notice').hidden=false;$('notice').textContent=message;}
async function handleError(e){if(!e.stale){error(e);return;}++previewSerial;selected=null;prediction=null;planState=null;planMoves=[];analysisKey='';planLoading=false;if($('replyDialog').open)$('replyDialog').close();const fresh=await read([]);view=await assignmentView(fresh);replaceLivePlaces(view);focus=[...view.prefix];render();notice('The game changed in another tab. This is the updated position. Select a relay again to review a fresh preview; no pending move was committed.');}
// Shapes repeat across claims, emblem groups and routes; color is never the only cue.
// Emblems name the adapter's objective IDs. Membership is always read from
// objectives/networks supplied by the original engine, never recreated here.
const EMBLEMS=[
  ['Sun','<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'],
  ['Moon','<path d="M19 16A9 9 0 0 1 8 3a9 9 0 1 0 11 13Z"/>'],
  ['Flame','<path d="M13 2c2 6-3 7-1 11 2-1 3-3 3-5 7 8 3 14-3 14S2 15 7 9c0 4 2 4 2 4-1-5 4-7 4-11Z"/>'],
  ['Leaf','<path d="M20 3C8 2 2 9 5 16c7 4 15-2 15-13ZM4 21 16 8M9 16v-5m0 5h5"/>'],
  ['Wave','<path d="M2 8c4-6 6 6 10 0s6 6 10 0M2 15c4-6 6 6 10 0s6 6 10 0"/>'],
  ['Mountain','<path d="m2 20 10-17 10 17ZM8 10l4 3 4-3"/>'],
  ['Feather','<path d="M4 20 17 7M8 16C1 3 20 0 21 3c2 7-4 17-13 13Zm4-4V6m0 6h6"/>'],
  ['Bolt','<path d="m14 2-10 12h7l-1 8 10-12h-7Z"/>']
];
let activeEmblem=null;
function emblem(id,withName=false){const item=EMBLEMS[id];return item?`<span class="emblem" title="${item[0]}" role="img" aria-label="${item[0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${item[1]}</svg>${withName?`<span>${item[0]}</span>`:''}</span>`:'';}
function relayEmblems(data,index){return data.objectives.filter(o=>o.sites.includes(index));}
function traitsHtml(data,index){return `<span class="relayEmblems">${relayEmblems(data,index).map(o=>`<span class="trait ${activeEmblem===o.id?'matching':''}">${emblem(o.id)}</span>`).join('')}</span>`;}
function renderEmblemPicker(){
  $('emblemPicker').innerHTML=`<div class="emblemHeading"><strong>Match one emblem</strong><small>Claim all three to win</small></div><div class="emblemFilters">${view.objectives.map(o=>`<button data-emblem="${o.id}" aria-label="Show ${EMBLEMS[o.id][0]} relays" aria-pressed="${activeEmblem===o.id}">${emblem(o.id,true)}</button>`).join('')}</div>`;
  const group=view.objectives.find(o=>o.id===activeEmblem);
  $('emblemMatch').hidden=!group;
  $('emblemMatch').innerHTML=group?`${emblem(group.id,true)}<span>These three share this emblem. Other legal choices remain available.</span><button data-clear-emblem>Clear highlight</button>`:'';
  for(const slot of view.slots){const button=$('sites').querySelector(`[data-site="${slot.index}"]`),matches=!group||group.sites.includes(slot.index);button.classList.toggle('emblemMatch',!!group&&matches);button.classList.toggle('emblemDim',!matches);button.setAttribute('aria-label',button.getAttribute('aria-label')+', emblems: '+relayEmblems(view,slot.index).map(o=>EMBLEMS[o.id][0]).join(', '));}
  // Keep keyboard and visual order together when inspecting a group.
  if(group){const buttons=[...$('sites').children];for(const matches of [true,false])for(const button of buttons)if(button.classList.contains('emblemMatch')===matches)$('sites').append(button);}
}
function token(owner, label='', candidate=false) {
  const state=owner===1?'blue':owner===-1?'red':owner===null?'draw':'open';
  return `<span class="token ${state} ${candidate?'candidate':''}" aria-hidden="true">${label}</span>`;
}
function meter(mark,count){return `<span class="meter ${color(mark)}" role="img" aria-label="${who(mark)} ${count} of 3">${[0,1,2].map(i=>`<i class="${i<count?'filled':''}"></i>`).join('')}</span>`;}
function routeFlow(mark,index,from,to,candidate=false){
  return `<div class="routeFlow ${color(mark)}"><div class="routeClaim">${token(mark,code(index),candidate)}<span><small>${candidate?'Proposed claim':'Claimed'}</small><strong>${names[index]}</strong><small>${placeCaption(from)}</small></span></div><div class="routeArrow" aria-hidden="true">↓</div><div class="routeTarget">${token(-mark)}<span><small>${who(-mark)} next</small><strong>${placeCaption(to)}</strong><small>${placeLayer(to)} · ${same(from,to)?'Same location':placeFor(from)?.name===placeFor(to)?.name?'Different place with the same name':to.length<9?'Choose within this area':'Different location'}</small></span></div></div>`;
}
function pip(i,owner,label=names[i],candidate=false) { return `<span class="memberBadge"><span data-code="${code(i)}" title="${label} · ${owner===0?'open':who(owner)}${candidate?' · proposed claim':''}" class="pip ${owner?color(owner):owner===null?'draw':''} ${candidate?'candidate':''}"><span>${code(i)}</span></span><small class="memberName">${label||names[i]}</small></span>`; }
function setRow(set, label='', slots=view.slots, candidate=-1) {
  const owners = slots.map(s=>s.owner),mark=set.azure_open&&set.azure?1:set.crimson_open&&set.crimson?-1:0;
  const count=mark===1?set.azure:mark===-1?set.crimson:0;
  return `<div class="setrow ${mark?color(mark):'neutral'} ${count===2?'nearComplete':''}"><span class="setLabel" title="${label}">${emblem(set.id,true)}</span><div class="setChain">${set.sites.map(i=>pip(i,owners[i],slots[i].place?.name||names[i],i===candidate)).join('<i class="connector"></i>')}</div>${mark?meter(mark,count):'<small>Emblem group</small>'}${count===2?'<b class="oneAway" title="One more claim completes this emblem group">+1</b>':count===3?'<b class="oneAway" title="Complete emblem group">✓</b>':''}</div>`;
}
function progressRows(data,emblemId=activeEmblem){
  // Display ordering only. Membership and counts come from the shared adapter.
  const relevant=[...data.objectives].sort((a,b)=>Math.max(b.azure_open?b.azure:0,b.crimson_open?b.crimson:0)-Math.max(a.azure_open?a.azure:0,a.crimson_open?a.crimson:0));
  const inspected=relevant.find(s=>s.id===emblemId);
  if(inspected)return setRow(inspected,'Selected emblem',data.slots);
  const blue=relevant.find(s=>s.azure_open&&s.azure>0),red=relevant.find(s=>s.crimson_open&&s.crimson>0);
  return blue||red?(blue?setRow(blue,'Blue progress',data.slots):'')+(red?setRow(red,'Red progress',data.slots):''):`<p class="emptyLocation">${data.leaf===false?'No child locations won here yet.':'No claims in this location yet.'}</p>`;
}
// Describe the original preview's destination; do not infer a different board
// when a finished destination releases a larger area.
function destinationStatus(preview) {
  const next=preview.next_view;
  if(preview.destination.length!==9 || !same(next.prefix,preview.destination))return '';
  const blue=next.slots.filter(s=>s.owner===1).length;
  const red=next.slots.filter(s=>s.owner===-1).length;
  if(!blue&&!red)return '<p class="destinationStatus">No relays claimed here yet.</p>';
  return `<div class="destinationStatus"><div class="destinationClaims"><small>Claims there</small><span>${token(1)} ${blue}</span><span>${token(-1)} ${red}</span></div>${progressRows(next)}</div>`;
}
function renderFieldProgress() {
  $('sets').innerHTML=`<small class="progressLabel">${activeEmblem!==null?EMBLEMS[activeEmblem][0]+' group here':'Progress here'}</small>${progressRows(view)}`;
}
function candidateProgressHtml() {
  // The adapter's recorded after-cells and network counts are the preview.
  // Only the display order is chosen here; no ownership is committed.
  const effect=prediction.effect,slots=view.slots.map((s,i)=>({...s,owner:effect.after[i]}));
  const networks=effect.networks.filter(n=>n.open).sort((a,b)=>b.after-a.after);
  const rows=networks.slice(0,2).map(n=>setRow({id:n.id,sites:n.sites,azure:effect.mark===1?n.after:0,crimson:effect.mark===-1?n.after:0,azure_open:effect.mark===1,crimson_open:effect.mark===-1},'After claim',slots,selected)).join('');
  return `<div class="fieldPreview"><strong>If you claim ${names[selected]}</strong><small>Gold outline = preview</small>${rows||'<p>This relay advances no open emblem groups.</p>'}${networks.length>2?`<small>${networks.length-2} other open ${networks.length===3?'emblem group is':'emblem groups are'} available below.</small>`:''}</div>`;
}
function isPlayable() {return view.leaf && view.slots.some(s=>s.legal) && !view.computer_turn && view.outcome===null;}
function render() {
  names=view.slots.map(s=>s.name);
  const exploring = inspecting();
  $('world').textContent=exploring&&view.outcome===null?'Your move':'World';
  $('world').title=exploring&&view.outcome===null?'Return to the current assignment':'World activity';
  $('world').disabled=busy;
  const humanName = view.mode==='human-human' ? `${who(view.turn)}'s turn` : 'Your turn';
  $('turnNumber').textContent=`${view.outcome===null?'Move '+(view.ply+1):'Game over'} · ${view.mode==='human-human'?'Two players':'You: blue / Computer: red'}`;
  $('turnTitle').textContent=view.outcome!==null ? (view.outcome===0?'World drawn':`${who(view.outcome)} wins the world`) : view.computer_turn ? 'Opponent is choosing…' : exploring ? 'Inspecting a location' : humanName;
  const legal = view.slots.filter(s=>s.legal).length;
  $('assignment').textContent=view.outcome!==null ? 'The game has ended. You can inspect the world or start a new game.' : view.computer_turn ? 'Your move is committed. The computer is choosing one legal reply.' : exploring ? 'Exploring costs no moves. Return to your assignment to play.' : choosingLocation()?'The destination was finished. Choose an open child location, then select one relay.':view.forced.length===9 ? `The last move sent you here. Choose ${legal ? 'one available relay' : 'your next location'}.` : view.ply===0 ? 'Choose a relay here, or choose another starting location.' : 'The destination is open. Choose a relay here or explore another permitted location.';
  $('pinCurrent').textContent=pinnedPaths.some(p=>same(p,focus))?'★ Unpin location':'☆ Pin location';
  $('undo').textContent=view.undo_plies===2?'Undo my move and computer reply':view.undo_plies===1?'Undo last move':'Undo last turn';
  $('undo').title=view.undo_plies?`Restores the previous decision by undoing ${view.undo_plies} committed ${view.undo_plies===1?'move':'moves'}.`:'';
  $('return').hidden=!exploring || view.outcome!==null;
  const visited=Object.values(view.activity_totals).some(count=>count>0);
  $('level').textContent=view.place?`${view.place.layer} · ${visited?'Previously played':'No moves yet'}`:`Level ${10-focus.length} of 10`;
  $('locationDepth').textContent=`Level ${10-focus.length} of 10 · ${view.leaf?'Nine relays':'Nine child locations'} · Reference ${view.place?.reference||''}`;
  $('location').innerHTML=`${placeMarker(view.place)} ${view.place.name} <span class="placeRef">#${view.place.reference}</span>`;
  $('address').innerHTML=address(focus);
  document.querySelector('.goalicon').innerHTML=view.result===1||view.result===-1?token(view.result,'⚑'):view.closed?'⊘':'◈';
  $('goalTitle').textContent=view.result!==null ? `${who(view.result)} ${view.result===0?'location':'controls this location'}` : view.leaf ? 'Claim three with the same emblem' : 'Win three children with the same emblem';
  $('goalText').textContent=view.leaf ? 'Claim all three relays sharing an emblem to win this location.' : 'Win all three children sharing an emblem to claim this location.';
  if(view.closed){if(view.result===null)$('goalTitle').textContent='This branch is closed';$('goalText').textContent='A finished location closes all play within it. Empty relays here cannot be claimed.';}
  $('sites').innerHTML=view.slots.map(s=>`<button class="site ${s.owner?color(s.owner):s.owner===null?'disabled':''} ${selected===s.index?'selected':''} ${s.last?'last':''}" data-site="${s.index}" aria-label="${names[s.index]}, ${s.owner===0?(s.legal?'available':'outside current assignment'):s.owner===null?'drawn':who(s.owner)+' controlled'}" aria-pressed="${selected===s.index}" ${view.leaf && (!s.legal || busy)?'disabled':''}>${token(s.owner,code(s.index),selected===s.index)}<span class="relayIdentity"><strong>${names[s.index]}</strong>${traitsHtml(view,s.index)}</span><span class="state" title="${s.owner===0?(s.legal?'Available':'Outside assignment'):s.owner===null?'Drawn':who(s.owner)+' controlled'}" aria-hidden="true">${s.owner===0?(s.legal?'＋':'—'):s.owner===null?'×':'✓'}</span></button>`).join('');
  $('sites').querySelectorAll('button').forEach(button=>{const hint=document.createElement('span');hint.className='destinationHint';if(isPlayable()&&!busy&&view.slots[Number(button.dataset.site)].legal)hint.textContent='Checking destination…';button.insertBefore(hint,button.querySelector('.state'));});
  if(view.closed)for(const s of view.slots.filter(s=>s.owner===0)){const button=$('sites').querySelector(`[data-site="${s.index}"]`);button.setAttribute('aria-label',`${names[s.index]}, closed`);button.querySelector('.state').textContent='×';button.querySelector('.state').title='Closed';}
  if(!view.leaf)for(const s of view.slots){const button=$('sites').querySelector(`[data-site="${s.index}"]`);const tally=document.createElement('span');tally.className='regionActivity';tally.innerHTML=!view.closed&&s.owner===0&&'blue_progress' in s?`<small>emblem group progress</small>${meter(1,s.blue_progress)}${meter(-1,s.red_progress)}`:`<span class="blueText">Blue ${s.blue_orders}</span><span class="redText">Red ${s.red_orders}</span><small>moves inside</small>`;button.insertBefore(tally,button.querySelector('.state'));button.querySelector('strong').innerHTML=`${placeMarker(s.place)} ${s.place?.name||names[s.index]}`;const status=s.owner===0?(s.legal?'within assignment':view.closed?'closed':'inspection only'):s.owner===null?'drawn':who(s.owner)+' controlled';button.setAttribute('aria-label',`${s.place?`${s.place.name} ${s.place.reference}`:names[s.index]}, open to inspect, ${status}`);button.querySelector('.state').textContent='↗';button.querySelector('.state').title='Open to inspect · '+status;}
  renderEmblemPicker();
  renderFieldProgress();
  $('setList').innerHTML=view.objectives.map(s=>setRow(s)).join('');
  $('undo').disabled=busy || !view.can_undo;
  $('saveStatus').textContent=view.warning || `${view.save_enabled===false?'Unsaved session':'Saved'} · ${view.ply} ${view.ply===1?'move':'moves'} played`;
  $('savePolicy').textContent=view.save_enabled===false?'This session is not saved automatically. Export it to keep progress before starting a new game.':view.warning?'Automatic saving has reported a problem. Export the game to keep progress.':'The current game is saved automatically. A new game replaces this save; export it first to keep it.';
  $('controllerHelp').textContent=view.mode==='human-human'?'Two people alternate one move each as Blue and Red. Blue starts.':'You claim one relay per turn as Blue. The computer follows as Red.';
  renderDecision(); renderOpponent();
  if(focus.length===0&&view.outcome===null){const section=document.createElement('section');section.id='fronts';section.className='watchList';section.innerHTML='<h3>Emblem groups to watch</h3><p>Loading known locations…</p>';$('decision').append(section);loadFronts();}
  const latest=[...view.history].reverse().find(h=>h.event.mark===(view.mode==='human-human'?-view.turn:-1))?.event;
  $('lastMoveBar').hidden=!latest;
  if(latest){const own=ownEvent();$('lastMoveBar').style.borderColor=`var(--${color(latest.mark)})`;$('lastMoveBar').innerHTML=`<div>${own?.gains.length?`<p class="${color(own.mark)}Text">${who(own.mark)}’s move finished ${own.gains.length} ${own.gains.length===1?'location':'locations'}. <button id="reviewOwnResult">Inspect your result</button></p>`:''}<div class="lastMoveFlow">${token(latest.mark,code(latest.path.at(-1)))}<span><strong>${names[latest.path.at(-1)]}</strong><small>${placeCaption(latest.path.slice(0,-1))}</small></span><b class="flowHorizontal" aria-hidden="true">→</b>${token(-latest.mark)}<span><strong>${placeCaption(latest.destination)}</strong><small>${who(-latest.mark)} next</small></span>${latest.gains.length?`<b class="captureBadge" title="Locations finished">⚑ ${latest.gains.length}</b>`:''}</div></div><button id="reviewOpponentQuick">Review move</button>`;}
  loadChoiceHints();loadParentGoal();renderLearning();renderProgressStrip();loadFronts();loadPinned();
}
const parentGoalKey=()=>`${view.revision}:${view.ply}:${focus.join(',')}`;
function renderParentGoal(){
  const element=$('parentGoal');
  if(parentKey!==parentGoalKey()||!parentData)return;
  const blue=parentData.slots.filter(s=>s.owner===1).length,red=parentData.slots.filter(s=>s.owner===-1).length;
  element.hidden=false;
  element.innerHTML=`<details ${view.result!==null?'open':''}><summary>${view.result===null?'How this location contributes to the world':'Parent result'}</summary><p>${view.result===null?`Winning ${view.place.name} claims it within <b>${parentData.place.name}</b>, its parent location.`:view.result===0?`${view.place.name} is drawn. Its entry in <b>${parentData.place.name}</b> closes without an owner.`:`${who(view.result)}’s win here claims ${view.place.name} within <b>${parentData.place.name}</b>.`}</p>${blue||red?`<p>Children already won there: <span class="blueText">Blue ${blue}</span> · <span class="redText">Red ${red}</span>.</p>`:''}<button id="inspectParentGoal">Inspect parent ${view.result===null?'goal':'result'}</button></details>`;
}
async function loadParentGoal(){
  const element=$('parentGoal');element.hidden=true;
  if(!focus.length||(view.closed&&view.result===null)||view.outcome!==null)return;
  const key=parentGoalKey();
  if(parentKey===key){renderParentGoal();return;}if(parentPending===key)return;
  parentPending=key;
  try{const parent=await read(focus.slice(0,-1));if(key!==parentGoalKey())return;if(parent.revision!==view.revision||parent.ply!==view.ply)return;parentData=parent;parentKey=key;renderParentGoal();}catch(_){/* Optional context must not interrupt the current legal move. */}finally{if(parentPending===key)parentPending='';}
}
const watchKey=()=>`${view.revision}:${view.ply}`;
function renderFronts(){
  renderProgressStrip();
  const element=$('fronts');if(!element||frontKey!==watchKey())return;
  const records=frontData.fronts;
  element.innerHTML=`<h3>Emblem groups to watch</h3><p>Emblem groups closest to completion. Routing determines which locations you can play.</p>${records.length?records.map((f,i)=>`<button data-front="${i}"><strong>${placeMarker(f.place)} ${f.place?.name||placeLabel(f.path)}</strong><span>${meter(1,f.blue)}${meter(-1,f.red)}</span><small>${f.available?'Available this turn':'Inspect only'}</small></button>`).join(''):'<p>Your claims and the opponent’s claims will appear here as the game develops.</p>'}${frontData.close_count>records.length?`<p>Showing ${records.length} of ${frontData.close_count} locations with near-complete emblem groups.</p>`:''}`;
}
async function loadFronts(){
  const key=watchKey();if(frontKey===key){renderFronts();return;}if(frontPending===key)return;
  frontPending=key;
  try{const data=await request('/api/fronts');if(key!==watchKey())return;if(data.revision!==view.revision||data.ply!==view.ply)throw Error('The game changed. Return to your move, then reopen World.');frontData=data;frontKey=key;renderFronts();}catch(e){if($('fronts'))$('fronts').textContent=e.message;}finally{if(frontPending===key)frontPending='';}
}
function renderLearning(){
  $('learningStep').hidden=!!learning.off||view.outcome!==null||!!prediction;
  $('toggleGuidance').textContent=learning.off?'Show guidance':'Hide guidance';
  if(learning.off||prediction)return;
  const hint=prediction&&hintKey===choiceKey()?choiceHints.find(h=>h.index===selected):null;
  const near=prediction?.effect.networks.find(n=>n.open&&n.after===2),blocked=prediction?blockedNetworks(prediction.effect):[];
  const stage=!learning.selected?'Select a relay to preview it':!learning.committed?'Check the destination, then commit one move':!learning.emblem?'Select an emblem to see its three members':hint?.opponent_capture?'This destination permits an opponent capture':prediction?.gains.length?'This claim finishes a location':blocked.length?'This claim blocks an opponent emblem':near?'This claim leaves one relay to complete '+EMBLEMS[near.id][0]:'Claims stay in their locations. Routing determines when you return.';
  const markup=`<span class="learningSymbol" aria-hidden="true">${!learning.selected?'＋':!learning.committed?'↳':'◈'}</span><span><strong>${stage}</strong><small>${!learning.selected?'Previewing and exploring spend no moves.':!learning.committed?'Your claim stays here. The other player chooses a relay at the destination.':hint?.opponent_capture?'Review the verified capturing reply before deciding.':'See a short recorded example of returns, blocks and captures.'}</small></span><button data-example class="learningExample">See a worked example</button><button id="dismissLearning" aria-label="Hide guidance">×</button>`;
  if(learningMarkup!==markup){$('learningStep').innerHTML=markup;learningMarkup=markup;}
}
function destinationKind(h){
  if(h.outcome!==null)return 'Game ends';
  if(h.destination.length<9)return 'Finished destination · choose within area';
  if(same(h.destination,focus))return 'Same location';
  if(h.opponent_capture)return 'Opponent can capture';
  if(h.destination_place?.name===view.place?.name)return 'Different place with the same name';
  return h.prior_orders>0||h.blue||h.red?'Previously played · claims remain':'No moves yet';
}
function targetLabel(path){const exact=pinnedPaths.find(p=>same(p,path));if(exact)return '★ Pinned target';return pinnedPaths.some(p=>path.length<p.length&&same(p.slice(0,path.length),path))?'★ Pinned target within this area':'';}
async function loadPinned(){
  const key=watchKey()+':'+JSON.stringify(pinnedPaths);if(pinKey===key||pinPending===key)return;
  pinPending=key;
  try{const data=await Promise.all(pinnedPaths.map(p=>read(p)));if(key!==watchKey()+':'+JSON.stringify(pinnedPaths))return;pinnedRecords=data.map(d=>({path:d.prefix,place:d.place,blue:Math.max(0,...d.objectives.filter(o=>o.azure_open).map(o=>o.azure)),red:Math.max(0,...d.objectives.filter(o=>o.crimson_open).map(o=>o.crimson)),orders:Object.values(d.activity_totals).reduce((total,count)=>total+count,0),blue_claims:d.slots.filter(s=>s.owner===1).length,red_claims:d.slots.filter(s=>s.owner===-1).length,available:!d.computer_turn&&d.slots.some(s=>s.legal),finished:d.result!==null}));pinKey=key;renderProgressStrip();}catch(_){/* Pinned context is optional; legal play remains usable. */}finally{if(pinPending===key)pinPending='';}
}
function togglePin(path){const found=pinnedPaths.findIndex(p=>same(p,path));if(found>=0)pinnedPaths.splice(found,1);else{if(pinnedPaths.length===3){notice('Three locations are pinned. Unpin one before adding another.');return;}pinnedPaths.push([...path]);}localWrite('relay-pins',pinnedPaths);pinKey='';render();}
function renderProgressStrip(){
  const element=$('progressStrip');
  if(frontKey!==watchKey()||!frontData){element.innerHTML='<small>Locations to watch · loading…</small>';return;}
  const records=[...pinnedRecords,...frontData.fronts.filter(r=>!pinnedPaths.some(p=>same(p,r.path)))].slice(0,3);
  element.innerHTML=`<div class="stripHeading"><strong>Locations to watch</strong><small>Pins and developing groups · Inspect freely</small></div><div class="rememberedCards">${records.length?records.map(r=>`<article class="rememberedCard ${same(r.path,focus)?'current':''}"><button data-inspect-path="${r.path.join(',')}"><strong>${placeMarker(r.place)} ${targetLabel(r.path)?'★ ':''}${placeLabel(r.path)}</strong><small>${r.finished?'Finished':r.available?'Playable this turn':'Inspect only'}${r.orders>0?' · Previously played':' · No moves yet'}</small><span class="rememberedClaims">${token(1)} ${r.blue_claims??'–'} ${token(-1)} ${r.red_claims??'–'} <small>relays owned</small></span><span class="rememberedProgress">${meter(1,r.blue)}${meter(-1,r.red)}<small>closest open emblem groups</small></span></button>${targetLabel(r.path)?`<button class="unpin" data-pin-path="${r.path.join(',')}">Unpin</button>`:''}</article>`).join(''):'<p>Claims will stay here as play moves between locations. <button data-example>See a four-move example</button></p>'}</div>`;
}
const choiceKey=()=>`${view.revision}:${focus.join(',')}`;
function applyChoiceHints() {
  if(hintKey!==choiceKey())return;
  for(const h of choiceHints){const el=$('sites').querySelector(`[data-site="${h.index}"] .destinationHint`);if(!el)continue;const gains=h.captures||[];const target=same(h.destination,focus)?'Here · '+placeLabel(h.destination):placeLabel(h.destination);const description=h.outcome!==null?(h.outcome===0?'World drawn':`${who(h.outcome)} wins`):gains.length?`${gains.length} locations finish`:h.opponent_capture?`${who(-view.turn)} can capture at ${target}`:target;
    el.innerHTML=`<span class="hintArrow" aria-hidden="true">↳</span>${placeMarker(placeFor(h.destination))}<span>${target}<small class="destinationKind">${destinationKind(h)}${targetLabel(h.destination)?' · '+targetLabel(h.destination):''}</small></span>${h.opponent_capture?'<b class="riskBadge" title="Opponent has a legal capturing reply">⚠</b>':''}${gains.length?`<b class="captureBadge" title="${description}">⚑ ${gains.length}</b>`:''}${h.destination.length===9&&(h.blue||h.red)?`<span class="claimCounts" aria-label="After this move: Blue ${h.blue}, Red ${h.red}">${token(1)}${h.blue} ${token(-1)}${h.red}</span>`:''}`;el.title=description;el.classList.toggle('danger',h.opponent_capture);el.classList.toggle('capture',gains.some(g=>g.owner===view.turn));}
  showDecisionRisk();renderLearning();
}
function showDecisionRisk(){
  $('decisionRisk')?.remove();
  if(!prediction||hintKey!==choiceKey()||!$('commit'))return;
  const hint=choiceHints.find(h=>h.index===selected);
  if(!hint?.opponent_capture)return;
  const proof=hint.capture_reply,mark=-view.turn;
  const target=prediction.next_view;
  const network=proof?.effect.networks.find(n=>n.open&&n.after===3);
  const risk=document.createElement('section');risk.id='decisionRisk';risk.className='captureWarning';
  risk.innerHTML=`<strong>⚠ ${who(mark)} can capture ${placeLabel(prediction.destination)}</strong>${network?setRow({id:network.id,sites:network.sites,azure:mark===1?2:0,crimson:mark===-1?2:0,azure_open:mark===1,crimson_open:mark===-1},'Threat',target.slots):''}<p>${proof?`${names[proof.index]} completes the ${network?EMBLEMS[network.id][0]+' emblem':'location'}.`:'A legal capturing reply exists.'} This is a possible reply, not a prediction.</p><button id="inspectCaptureReply">Show the capturing reply</button>`;
  $('decision').insertBefore(risk,$('commit'));
}
async function loadChoiceHints() {
  if(!isPlayable()||busy)return;
  const key=choiceKey();if(hintKey===key){applyChoiceHints();return;}if(hintPending===key)return;
  hintPending=key;
  try {const result=await act('choices',{prefix:focus});if(key===choiceKey()){hintKey=key;choiceHints=result.choices;applyChoiceHints();}}catch(e){if(key===choiceKey()&&!busy)await handleError(e);}finally{if(hintPending===key)hintPending='';}
}
function renderDecision() {
  if (view.outcome!==null) {$('decision').innerHTML='<h2>Game complete</h2><p>Inspect the world and its locations, or start another game.</p><button id="endNew">Start another game</button>';return;}
  if (view.computer_turn) {$('decision').innerHTML='<span class="eyebrow">One move each</span><h2>Opponent’s turn</h2><p>The computer follows the same available moves and routing rules. Its move will appear below.</p>';return;}
  if (view.closed) {$('decision').innerHTML='<span class="eyebrow">Finished location</span><h2>This branch is closed</h2><p>This location or one of its parents has finished. You can inspect its relays, but cannot play here again.</p><button id="backToMove">Return to your move</button>';return;}
  if (choosingLocation()) {$('decision').innerHTML=`<span class="eyebrow">${who(view.turn)}’s turn</span><h2>Choose a location</h2><p>Open an unfinished child location, then choose a relay. Opening a location and previewing spend no moves.</p><p>Counts show earlier moves inside each child. Your turn ends only when you commit one relay.</p>${focus.length<8&&view.local_focus.length?'<button id="quickLocation">Open first available relay location</button>':''}${!same(focus,assignmentFocus(view))?'<button id="backToMove">Choose from the full released area</button>':''}`;return;}
  if (!isPlayable()) {$('decision').innerHTML=`<span class="eyebrow">Exploration</span><h2>${view.leaf?'Outside your assignment':'Activity in this location'}</h2><p>${view.leaf?'You can inspect this location, but cannot play here this turn.':'Select a location to see its children. Counts show the moves played inside; ownership changes when an emblem group is won.'}</p>${!view.leaf?`<div class="activityTotals"><strong class="blueText">Blue ${view.activity_totals.blue}</strong><strong class="redText">Red ${view.activity_totals.red}</strong><span>moves inside this location</span></div><p>Locations won across the world: <span class="blueText">Blue ${view.captured['1']}</span> · <span class="redText">Red ${view.captured['-1']}</span>.</p>${view.latest_capture?`<div class="latestCapture"><strong>Latest finished location</strong><p>${view.latest_capture.gains.map(resultSentence).join(' ')}</p><button id="inspectLatestCapture">Inspect result</button></div>`:''}`:''}<button id="backToMove">Return to your move</button>`;return;}
  if (selected===null) {
    const own=ownEvent();
    if(own){$('decision').innerHTML=`<span class="eyebrow">Your decision</span><h2>Choose a relay</h2><p>Select a relay to preview its emblems and destination. Nothing is played until you commit.</p><div class="previousMove"><strong>Previous ${who(own.mark).toLowerCase()} move</strong><p>${names[own.path.at(-1)]} claimed at ${placeLabel(own.path.slice(0,-1))}.</p>${pastImpact(own,true)}${own.gains.length?gainsHtml(own.gains):'<p>Your claims stay here when play moves elsewhere.</p>'}<button id="reviewOwn">Inspect your previous move</button></div>`;return;}
    $('decision').innerHTML=`<span class="eyebrow">Your decision</span><h2>Choose a relay</h2><div class="choiceGuide"><span>＋<small>Select relay</small></span><b>→</b><span>↳<small>Check destination</small></span><b>→</b><span>✓<small>Commit</small></span></div><p>Select a relay to see its effects before you spend your move.</p>`;
    return;
  }
  if (!prediction) {$('decision').innerHTML=`<span class="eyebrow">Preview · no move spent</span><h2>${names[selected]}</h2><p>Checking the exact effects…</p>`;return;}
  const gains=prediction.gains;
  const eligible=prediction.next_view.slots.filter(s=>s.legal).map(s=>s.index+1);
  const blocked=blockedNetworks(prediction.effect);
  const own=prediction.effect.networks.filter(s=>s.open).sort((a,b)=>b.after-a.after);
  const gainsHTML=gainsHtml(gains);
  $('decision').innerHTML=`<span class="eyebrow">Preview · no move spent</span><h2>Claim ${names[selected]}</h2>${contextAdvice()}<p><strong class="${color(view.turn)}Text">${who(view.turn)}</strong> claims this relay.${gains.length?'': ' This location remains contested.'}</p>${blocked.length?`<p class="historynote">Blocks ${blocked.length} of ${who(-view.turn)}’s active emblem groups here.</p>`:''}${candidateProgressHtml()}${own.length>2?`<details class="otherSets"><summary>Other emblem groups this claim builds</summary><p>${own.slice(2).map(s=>`${EMBLEMS[s.id][0]} (${s.after}/3)`).join(', ')}.</p></details>`:''}${gainsHTML}${prediction.outcome!==null?`<p class="result">This ends the game: ${prediction.outcome===0?'world drawn':who(prediction.outcome)+' wins the world'}.</p>`:`<div class="routebox">${routeFlow(view.turn,selected,focus,prediction.destination,true)}${routingLesson(prediction.effect)}${targetLabel(prediction.destination)?`<p class="targetReached">${targetLabel(prediction.destination)}</p>`:''}${destinationStatus(prediction)}<small>${prediction.destination.length===9?'The opponent chooses one available relay there.':'The old destination is finished, so the opponent chooses within this larger area.'}</small><button id="inspectReplies">Explore possible replies</button><details><summary>Route details</summary>${placeTag(prediction.destination)}${address(prediction.destination,true,'Destination')}</details></div>`}<button id="commit" class="primary">Commit ${names[selected]} · one move</button><p class="empty">Select another relay to compare.</p>`;
  showDecisionRisk();
}
// Event membership and before/after cells come from the engine adapter.
// This describes lost opportunities, without calculating wins in the UI.
function blockedNetworks(event) {
  return event.networks.filter(n=>n.sites.some(i=>event.before[i]===-event.mark)&&n.sites.every(i=>event.before[i]!==null&&event.before[i]!==event.mark));
}
function pastImpact(event,showAdvance=false) {
  const blocked=blockedNetworks(event),threats=event.networks.filter(n=>n.open&&n.after===2);
  const slots=event.after.map(owner=>({owner}));
  const advanced=showAdvance?event.networks.filter(n=>n.open&&n.after<2).slice(0,2):[];
  return `${advanced.length?`<small class="progressLabel">Emblem groups advanced by this move</small>${advanced.map(n=>setRow({id:n.id,sites:n.sites,azure:event.mark===1?n.after:0,crimson:event.mark===-1?n.after:0,azure_open:event.mark===1,crimson_open:event.mark===-1},'',slots)).join('')}`:''}${blocked.length?`<div class="impactBlocked"><strong>⊘ ${blocked.length} ${who(-event.mark)} ${blocked.length===1?'emblem group blocked':'emblem groups blocked'}</strong>${blocked.slice(0,2).map(n=>setRow({id:n.id,sites:n.sites,azure:0,crimson:0,azure_open:false,crimson_open:false},'',slots)).join('')}</div>`:''}${threats.map(n=>setRow({id:n.id,sites:n.sites,azure:event.mark===1?n.after:0,crimson:event.mark===-1?n.after:0,azure_open:event.mark===1,crimson_open:event.mark===-1},'',slots)).join('')}`;
}
function renderOpponent() {
  const event=[...view.history].reverse().find(h=>h.event.mark===(view.mode==='human-human'?-view.turn:-1))?.event;
  if (!event) {$('opponent').innerHTML='<span class="eyebrow">Opponent activity</span><h3>No opponent move yet</h3><p>Their relay, destination and captures will remain here after they play.</p>';return;}
  $('opponent').style.borderTopColor=`var(--${color(event.mark)})`;
  $('opponent').innerHTML=`<span class="eyebrow">Last ${who(event.mark).toLowerCase()} move</span>${routeFlow(event.mark,event.path.at(-1),event.path.slice(0,-1),event.destination)}${pastImpact(event,true)}${event.gains.length?gainsHtml(event.gains):'<p>That location remains contested.</p>'}<button id="reviewOpponent">Inspect their move</button>${event.gains.some(g=>g.path.length)?'<button id="parentImpact">View parent impact</button>':''}<details class="recent"><summary>Recent moves</summary>${[...view.history].reverse().map((h,i)=>`<button data-history="${view.history.length-1-i}"><span class="${color(h.event.mark)}Text">${who(h.event.mark)} · ${names[h.event.path.at(-1)]}</span><small>${placeLabel(h.event.path.slice(0,-1))}${h.event.gains.length?' · '+h.event.gains.length+' results':''}</small></button>`).join('')}</details>`;
}
function showTurnContext(){document.querySelector('.turnbar').scrollIntoView({behavior:'auto',block:'start'});}
async function visit(path) {
  if (busy) return;
  clearError(); ++previewSerial; selected=null;prediction=null;
  try {view=await read(path); focus=[...path];render();showTurnContext();}catch(e){await handleError(e);}
}
async function choose(index) {
  if (busy) return;
  if (!view.leaf) return visit([...focus,index]);
  if (!view.slots[index].legal) return;
  learning.selected=true;saveLearning();selected=index; prediction=null; const serial=++previewSerial; render();
  try {const result=await act('preview',{path:[...focus,index]});if(serial===previewSerial){prediction=result;renderDecision();renderLearning();if(matchMedia('(max-width:800px)').matches){$('decision').scrollIntoView({behavior:'auto',block:'start'});const change=document.createElement('button');change.id='changeRelay';change.textContent='Choose a different relay';$('decision').append(change);}$('commit')?.focus({preventScroll:true});}}catch(e){await handleError(e);}
}
async function mutation(action,extra={}) {
  if (busy) return;
  busy=true;clearError();++previewSerial;
  try {
    view=await assignmentView(await act(action,extra));
    if(action==='play'){learning.committed=true;saveLearning();}
    activeEmblem=null;planState=null;planMoves=[];analysisKey='';
    // Undo may remove a first visit. Do not retain its number in cached labels.
    if(['new','import','undo'].includes(action))replaceLivePlaces(view);
    if(action==='new'||action==='import'){pinnedPaths=[];pinnedRecords=[];localWrite('relay-pins',null);} focus=[...view.prefix];selected=null;prediction=null;render();
    if (view.computer_turn) {view=await assignmentView(await act('ai'));focus=[...view.prefix];render();}
  } catch(e) {await handleError(e);if(!e.stale)try{view=await read(focus);}catch(_){} }
  finally {busy=false;render();showTurnContext();}
}
async function navLoad(path) {
  try {navView=await read(path);navPath=[...path];renderNav();}catch(e){await handleError(e);}
}
function renderNav() {
  // Reuse the adapter's ancestry rather than asking players to decode letters.
  $('navPath').innerHTML=navView.ancestry.map((a,n)=>`<button data-depth="${n}" ${n===navPath.length?'aria-current="location"':''}>${n?`<small>${a.layer}</small>`:``}<strong>${placeMarker(a.place)} ${a.place.name}</strong></button>`).join('');
  $('navChoices').innerHTML=navView.leaf?'':navView.slots.map(s=>`<button data-branch="${s.index}">${placeMarker(s.place)} ${s.place?.name||names[s.index]}<small>Explore inside · ${s.owner===0?(s.legal?'Within assignment':'Inspection only'):s.owner===null?'Drawn':who(s.owner)+' controlled'}</small></button>`).join('');
  $('navUp').disabled=!navPath.length;
  $('navOpen').textContent='Open '+navView.place.name;
}
async function openReplies() {
  if (!prediction || busy) return;
  const key=view.revision+':'+prediction.path.join(',');
  if(analysisKey===key&&planState){$('replyDialog').showModal();renderPlan();renderReplyChoices();return;}
  analysisKey=key;planMoves=[prediction.path];planState=null;replyHintCache.clear();
  $('replyTitle').textContent=`After you claim ${names[selected]}`;
  $('replyIntro').textContent='Loading the hypothetical position…';
  $('replyChoices').innerHTML='';$('planTimeline').innerHTML='';$('replyAddress').innerHTML='';$('replySets').innerHTML='';
  $('replyUp').disabled=true;$('replyReturn').hidden=true;$('planBack').disabled=true;$('replyEffect').textContent='';
  $('replyDialog').showModal();
  await loadPlan(prediction.destination.length<9?prediction.destination:undefined);
}
async function loadPlan(inspect) {
  const serial=++previewSerial;
  planLoading=true;disablePlanControls();$('replyEffect').textContent='Checking this hypothetical position…';
  try {const result=await act('plan',{moves:planMoves,...(inspect===undefined?{}:{inspect})});if(serial!==previewSerial)return;planState=result;replyView=result.view;planLoading=false;renderPlan();renderReplyChoices();$('replyEffect').innerHTML=planMoves.length>1?plannedEffectHtml(result.effects.at(-1)):'<p>Choose a hypothetical move to continue this line. The live game stays unchanged.</p>';}catch(e){if(e.stale)await handleError(e);else $('replyEffect').textContent=e.message;}finally{if(serial===previewSerial){planLoading=false;if(planState){renderPlan();renderReplyChoices();}}}
}
function disablePlanControls(){for(const button of $('replyDialog').querySelectorAll('#replyChoices button,#replyUp,#replyReturn,#planBack'))button.disabled=true;}
function renderPlan() {
  const effects=planState.effects;
  $('replyTitle').textContent=planState.outcome!==null?'This continuation ends the game':planMoves.length>=10?'Ten-move analysis limit':planMoves.length===1?`After you claim ${names[selected]}`:`Explore ${who(planState.turn)}’s next turn`;
  $('planBack').disabled=planMoves.length<=1;
  const rows=effects.map((effect,i)=>`<div class="planstep"><strong class="${color(effect.mark)}Text">${i+1}. ${who(effect.mark)} · ${names[effect.path.at(-1)]}</strong><small>${i===0?'Your candidate move':'Hypothetical choice'}</small><p>At ${placeCaption(effect.path.slice(0,-1))}.</p>${effect.outcome!==null?'<p>Game ends here.</p>':`<p>${who(-effect.mark)} would play at <b>${placeCaption(effect.destination)}</b>.</p><details><summary>Routing address</summary>${address(effect.destination,false,'Next assignment',effects.slice(0,i+1).every(e=>e.destination.length===9)?8-i:-1)}</details>`}</div>`);
  $('planTimeline').innerHTML=`<p>${effects.length} of 10 hypothetical moves · live game unchanged</p><div class="planchips">${effects.map((e,i)=>`<span data-code="${code(e.path.at(-1))}" class="pip ${color(e.mark)}" role="img" aria-label="${i+1}. ${who(e.mark)} claims ${names[e.path.at(-1)]}" title="${i+1}. ${who(e.mark)} claims ${names[e.path.at(-1)]}"><span>${code(e.path.at(-1))}</span></span>`).join('')}</div><details><summary>See how the assignment changes</summary><p>Each step shows a possible choice and its exact next assignment. In the optional routing addresses, gold tracks your original relay. Finished destinations can release a larger area.</p>${rows.join('')}</details>`;
}
function renderReplyChoices() {
  const next=replyView;
  const limit=planMoves.length>=10 || planState.outcome!==null;
  $('replyIntro').textContent=limit?(planState.outcome!==null?'This hypothetical game has ended. Remove a planned move to explore a different choice.':'Ten moves are shown. Inspect this position or remove a planned move to explore a different choice.'):next.closed?'A finished location closes this branch. You can inspect it, but no move can be played here.':!next.slots.some(s=>s.legal) ? 'Outside the planned assignment. You can inspect this location, but cannot choose a move here.' : next.leaf ? `${who(planState.turn)} could choose an available relay here. Choose one to continue this hypothetical line.` : `${who(planState.turn)} could choose within an unfinished location. Open one below to inspect its relays.`;
  $('replyAddress').innerHTML=placeTag(next.prefix);
  $('replySets').innerHTML=`${targetLabel(planState.destination)?`<p class="targetReached">${targetLabel(planState.destination)} · this hypothetical line reaches it</p>`:''}${progressRows(next)}`;
  $('replyUp').disabled=next.prefix.length===0;
  $('replyReturn').hidden=same(next.prefix,planState.destination);$('replyReturn').disabled=false;
  $('replyChoices').innerHTML=next.slots.map(s=>`<button data-reply="${s.index}" ${next.leaf&&(!s.legal||limit)?'disabled':''}>${pip(s.index,s.owner,s.place?.name||names[s.index])} ${s.place?.name||names[s.index]}${traitsHtml(next,s.index)}<small>${s.owner===0?(s.legal?(next.leaf?'Available':'Open location'):'Inspection only'):s.owner===null?'Drawn':who(s.owner)+' controlled'}</small>${next.leaf&&s.legal&&!limit?'<span class="replyHint">Checking destination…</span>':''}</button>`).join('');
  loadReplyHints();
}
const replyHintKey=()=>`${view.revision}:${JSON.stringify(planMoves)}:${replyView.prefix.join(',')}`;
function applyReplyHints(key){
  if(!planState||key!==replyHintKey())return;
  for(const hint of replyHintCache.get(key)||[]){
    const element=$('replyChoices').querySelector(`[data-reply="${hint.index}"] .replyHint`);if(!element)continue;
    const r=hint.result,effect=r.effects.at(-1),destination=placeFor(effect.destination);
    const blue=Math.max(0,...r.view.objectives.filter(s=>s.azure_open).map(s=>s.azure));
    const red=Math.max(0,...r.view.objectives.filter(s=>s.crimson_open).map(s=>s.crimson));
    element.innerHTML=r.outcome!==null?`<b>${r.outcome===0?'World draw':who(r.outcome)+' wins the world'}</b>`:`<span class="replyRoute">↳ ${token(r.turn)} ${placeMarker(destination)}${destination?.name||placeLabel(effect.destination)}</span><span class="replyMeters">${effect.destination.length<9?'Choose area':blue||red?`${meter(1,blue)}${meter(-1,red)}`:'No claims there'}</span>${effect.gains.length?`<b>${effect.gains.length} ${effect.gains.length===1?'location finishes':'locations finish'}</b>`:''}`;
  }
}
async function loadReplyHints(){
  if(!planState||!replyView.leaf||planState.outcome!==null||planMoves.length>=10)return;
  const key=replyHintKey();if(replyHintCache.has(key)){applyReplyHints(key);return;}if(replyHintPending.has(key))return;
  replyHintPending.add(key);
  const revision=view.revision,moves=planMoves.map(p=>[...p]),prefix=[...replyView.prefix];
  const slots=replyView.slots.filter(s=>s.legal);
  try{
    // Every comparison is the existing reversible plan API. This does not
    // rank choices, select an AI move, or simulate rules in presentation code.
    const hints=await Promise.all(slots.map(async s=>({index:s.index,result:await request('/api/action',{action:'plan',revision,moves:[...moves,[...prefix,s.index]]})})));
    replyHintCache.set(key,hints);if(replyHintCache.size>32)replyHintCache.delete(replyHintCache.keys().next().value);applyReplyHints(key);
  }catch(_){if(planState&&key===replyHintKey())for(const hint of $('replyChoices').querySelectorAll('.replyHint'))hint.textContent='Select to inspect destination';}finally{replyHintPending.delete(key);}
}
async function inspectReplyLocation(path) {
  if(planLoading)return;
  return loadPlan(path);
}
async function exploreReply(index) {
  if(planLoading)return;
  if(!replyView.leaf)return inspectReplyLocation([...replyView.prefix,index]);
  if(planMoves.length>=10||planState.outcome!==null)return;
  const serial=++previewSerial;
  planLoading=true;disablePlanControls();
  $('replyEffect').textContent='Checking this possible move…';
  try {
    const moves=[...planMoves,[...replyView.prefix,index]];
    const result=await act('plan',{moves});
    if(serial!==previewSerial)return;
    planMoves=moves;planState=result;replyView=result.view;
    const r=result.effects.at(-1);
    $('replyEffect').innerHTML=plannedEffectHtml(r);
  }catch(e){if(e.stale)await handleError(e);else $('replyEffect').textContent=e.message;}finally{if(serial===previewSerial){planLoading=false;renderPlan();renderReplyChoices();$('replyTitle').focus({preventScroll:true});$('replyIntro').scrollIntoView({behavior:'auto',block:'start'});}}
}
function clearReplacement(){replacement=null;$('replacePanel').hidden=true;$('gameActions').hidden=false;}
function requestReplacement(action,extra){
  if(!view.ply){$('gameDialog').close();mutation(action,extra);return;}
  replacement={action,extra};$('gameActions').hidden=true;$('replacePanel').hidden=false;
  $('replaceText').textContent=action==='import'?'Importing this save replaces the current saved game.':'Starting a new game replaces the current saved game.';
  $('confirmReplace').focus();
}
$('gameDialog').addEventListener('close',clearReplacement);
document.addEventListener('click',async e=>{
 const close=e.target.closest('[data-close]');if(close) $(close.dataset.close).close();
 const emblemButton=e.target.closest('[data-emblem]');if(emblemButton){const id=Number(emblemButton.dataset.emblem);activeEmblem=activeEmblem===id?null:id;learning.emblem=true;saveLearning();render();$('emblemPicker').querySelector(`[data-emblem="${id}"]`)?.focus({preventScroll:true});return;}
 if(e.target.closest('[data-clear-emblem]')){activeEmblem=null;render();return;}
 const site=e.target.closest('[data-site]');if(site) choose(Number(site.dataset.site));
 const exampleMode=e.target.closest('[data-example-kind]');if(exampleMode&&['opening','capture'].includes(exampleMode.dataset.exampleKind)){exampleKind=exampleMode.dataset.exampleKind;loadExample(0);return;}
 if(e.target.closest('[data-example]')){openExample();return;}
 const inspect=e.target.closest('[data-inspect-path]');if(inspect)visit(inspect.dataset.inspectPath?inspect.dataset.inspectPath.split(',').map(Number):[]);
 const pin=e.target.closest('[data-pin-path]');if(pin)togglePin(pin.dataset.pinPath?pin.dataset.pinPath.split(',').map(Number):[]);
 const remembered=e.target.closest('[data-remembered]');if(remembered&&frontData)visit(frontData.fronts[Number(remembered.dataset.remembered)].path);
 const branch=e.target.closest('[data-branch]');if(branch) navLoad([...navPath,Number(branch.dataset.branch)]);
 const depth=e.target.closest('[data-depth]');if(depth) navLoad(navPath.slice(0,Number(depth.dataset.depth)));
 const reply=e.target.closest('[data-reply]');if(reply) exploreReply(Number(reply.dataset.reply));
 const history=e.target.closest('[data-history]');if(history)visit(view.history[Number(history.dataset.history)].event.path.slice(0,-1));
 const front=e.target.closest('[data-front]');if(front&&frontData)visit(frontData.fronts[Number(front.dataset.front)].path);
 const id=e.target.closest('[id]')?.id;
 if(e.target.closest('[data-hide-guidance]'))setGuidance(false);
 if(e.target.closest('[data-show-guidance]'))setGuidance(true);
 if(id==='pinCurrent')togglePin(focus);
 if(id==='welcomeNew'){$('welcomeDialog').close();$('gameDialog').showModal();requestReplacement('new',{mode:'human-x'});}
 if(id==='exampleNext')loadExample(Math.min(exampleLast,exampleStep+1));
 if(id==='exampleBack')loadExample(Math.max(0,exampleStep-1));
 if(id==='inspectCaptureReply'){const hint=choiceHints.find(h=>h.index===selected);if(hint?.capture_reply){analysisKey=view.revision+':'+prediction.path.join(',');planMoves=[prediction.path,hint.capture_reply.effect.path];planState=null;replyHintCache.clear();$('replyDialog').showModal();await loadPlan();}else await openReplies();}
 if(id==='commit' && prediction) mutation('play',{path:prediction.path});
 if(id==='return'||id==='backToMove') visit(assignmentFocus(view));
 if(id==='quickLocation'&&view.local_focus.length)visit(view.local_focus);
 if(id==='reviewOpponent'||id==='reviewOpponentQuick') {const event=[...view.history].reverse().find(h=>h.event.mark===(view.mode==='human-human'?-view.turn:-1))?.event;if(event)visit(event.path.slice(0,-1));}
 if(id==='reviewOwn'||id==='reviewOwnResult'){const event=ownEvent();if(event)visit(event.gains.length?event.gains[0].path:event.path.slice(0,-1));}
 if(id==='parentImpact'){const event=[...view.history].reverse().find(h=>h.event.mark===(view.mode==='human-human'?-view.turn:-1))?.event;const gain=event?.gains.find(g=>g.path.length);if(gain)visit(gain.path.slice(0,-1));}
 if(id==='changeRelay'){$('sites').scrollIntoView({behavior:'auto',block:'start'});$('sites').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
 if(id==='inspectParentGoal')visit(focus.slice(0,-1));
 if(id==='inspectReplies')openReplies();
 if(id==='replyUp' && replyView)inspectReplyLocation(replyView.prefix.slice(0,-1));
 if(id==='replyReturn'&&planState)inspectReplyLocation(planState.destination);

 if(id==='planBack'&&planMoves.length>1){planMoves=planMoves.slice(0,-1);loadPlan();}
 if(id==='toggleGuidance')setGuidance(!!learning.off);
 if(id==='dismissLearning')setGuidance(false);
 if(id==='help') $('helpDialog').showModal();
 if(id==='world')visit(view.outcome===null&&inspecting()?assignmentFocus(view):[]);
 if(id==='inspectLatestCapture'&&view.latest_capture)visit(view.latest_capture.gains[0].path);
 if(id==='menu'||id==='endNew') $('gameDialog').showModal();
 if(id==='navigate'){$('navDialog').showModal();navLoad(focus);}
 if(id==='navUp')navLoad(navPath.slice(0,-1));
 if(id==='navOpen'){$('navDialog').close();visit(navPath);}
 if(id==='undo')mutation('undo');
 if(id==='newAI'||id==='newHuman')requestReplacement('new',{mode:id==='newAI'?'human-x':'human-human'});
 if(id==='cancelReplace')clearReplacement();
 if(id==='confirmReplace'&&replacement){const next=replacement;clearReplacement();$('gameDialog').close();mutation(next.action,next.extra);}
 if(id==='export'){try{const save=await request('/api/export');const url=URL.createObjectURL(new Blob([JSON.stringify(save)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='relay-save.json';a.click();URL.revokeObjectURL(url);}catch(e){error(e);}}
});
$('import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const save=JSON.parse(await file.text());requestReplacement('import',{save});}catch(e){$('gameDialog').close();error(new Error('Could not read this save. Choose a valid game save file.'));}finally{e.target.value='';}});
function setGuidance(visible){learning.off=!visible;saveLearning();render();}
function contextAdvice(){
  if(!prediction)return '';
  if(learning.off)return '<button class="restoreGuidance" data-show-guidance>Show guidance</button>';
  const effect=prediction.effect,hint=hintKey===choiceKey()?choiceHints.find(h=>h.index===selected):null;
  const blocked=blockedNetworks(effect),near=effect.networks.find(n=>n.open&&n.after===2);
  const missing=near?.sites.find(i=>effect.after[i]===0);
  const advice=hint?.opponent_capture?'This route offers a capturing reply. Compare another destination or inspect that reply before committing.':prediction.gains.length?'This claim finishes a location. Its parent entry changes as shown below.':blocked.length?`Taking ${names[selected]} blocks ${who(-view.turn)}’s ${EMBLEMS[blocked[0].id][0]} group here.`:near?`${EMBLEMS[near.id][0]} becomes two of three. ${names[missing]} remains open here; routing must permit a return before you can claim it.`:`Your claim stays here. ${same(effect.destination,focus)?'The other player will choose a relay in this same location.':'The other player chooses at the shown destination; both players shape later returns.'}`;
  return `<div class="contextAdvice"><span aria-hidden="true">↳</span><p>${advice}</p><button data-hide-guidance aria-label="Hide guidance">×</button></div>`;
}
function plannedEffectHtml(effect){return `<p class="historynote">Hypothetical: ${who(effect.mark)} claims ${names[effect.path.at(-1)]} at ${placeCaption(effect.path.slice(0,-1))}.</p>${gainsHtml(effect.gains)}${effect.outcome!==null?`<p>This ends the hypothetical game: ${effect.outcome===0?'world drawn':who(effect.outcome)+' wins the world'}.</p>`:''}`;}
function routingLesson(effect){
  const source=effect.path.slice(0,-1),relay=effect.path.at(-1);
  const note=effect.destination.length<9?'The destination is finished, so play opens within its nearest unfinished parent.':same(source,effect.destination)?'This choice sends the other player back here.':'The route shifts one entry. Your chosen relay joins its end.';
  return `<div class="routingLesson"><strong>Why this destination?</strong><p>${note}</p><div class="routeConcept"><span>Earlier route<small>shifts one entry</small></span><b aria-hidden="true">→</b><span class="appendedConcept">${names[relay]}<small>joins the end</small></span></div><details><summary>Show the exact nine-entry route</summary><small>Current route · first entry leaves</small><div class="routeTape before">${source.map((i,n)=>`<span class="${n===0?'leaving':''}" title="${names[i]}">${code(i)}</span>`).join('')}</div><div class="tapeArrow" aria-hidden="true">↓ shift left + append ${code(relay)}</div><small>Shifted route</small><div class="routeTape after">${source.slice(1).map(i=>`<span title="${names[i]}">${code(i)}</span>`).join('')}<span class="appended" title="${names[relay]}">${code(relay)}</span></div><p>Both players’ choices change this route on later turns. The destination preview includes any release to a larger area.</p></details></div>`;
}
async function openExample(){
  for(const id of ['helpDialog','welcomeDialog'])if($(id).open)$(id).close();
  if(!$('exampleDialog').open)$('exampleDialog').showModal();
  await loadExample(exampleStep);
}
async function loadExample(step){
  const serial=++exampleSerial;
  $('exampleBack').disabled=true;$('exampleNext').disabled=true;
  try{
    for(const button of document.querySelectorAll('[data-example-kind]'))button.setAttribute('aria-pressed',String(button.dataset.exampleKind===exampleKind));
    const data=await request('/api/example?kind='+exampleKind+'&step='+step);if(serial!==exampleSerial)return;renderingExample=true;exampleStep=step;exampleLast=data.total_steps;
    const effect=data.effect,local=data.view;
    const captureTitles=['Claims stay where they were made','A claim chooses the next location','A complete emblem captures a location','A later return can complete your own emblem','A claim can block the other player'];
    const openingTitles=['Start with an empty L10 game','First claim: Aster','Red replies and sends play elsewhere','Both players shape the route','A first claim in Green Ford','Red sends Blue back to Green Ford','Returning advances Sun to two of three'];
    const titles=exampleKind==='opening'?openingTitles:captureTitles;
    const openingNotes=['No relays are prefilled. These checkpoints replay a real opening through the original rules.','Blue chose Aster, keeping Red at the same location. Blue must now wait for Red’s choice.','Red chose Ember and blocked a Blue emblem. The Blue claim stays here as play moves elsewhere.','These are the actual intervening choices, not guaranteed future replies. Repeated choices gradually formed a repeating route.','Blue claims Aster in Green Ford. Sun is now one of three here, but the next turn is elsewhere.','This Red choice returns Blue to Green Ford, where the earlier Aster claim remains.','Blue claims Beacon beside the earlier Aster. Sun is now two of three; another future return is needed for Cinder, and Red could still block it.'];
    $('exampleTitle').textContent=`${step+1} / ${exampleLast+1} · ${titles[step]}`;
    $('exampleIntro').textContent=`Position after ${data.recorded_ply} recorded legal moves. ${exampleKind==='opening'?'This example starts empty; live opponent replies may differ.':'These positions include earlier legal moves.'} Your live game is unchanged.`;
    const body=effect?`${routeFlow(effect.mark,effect.path.at(-1),effect.path.slice(0,-1),effect.destination)}${pastImpact(effect,true)}${gainsHtml(effect.gains)}`:`${placeTag(local.prefix)}<p>${exampleKind==='opening'?'Start by previewing a relay. Nothing here is claimed until a recorded move is shown.':'Earlier moves left claims in several locations. The next four recorded moves show how a route reconnects them.'}</p>`;
    const sequence=data.sequence.length>1?`<details><summary>${data.sequence.length} intervening recorded moves</summary>${data.sequence.map(e=>`<p class="${color(e.mark)}Text">${who(e.mark)} · ${names[e.path.at(-1)]} at ${placeLabel(e.path.slice(0,-1))} → ${placeLabel(e.destination)}</p>`).join('')}</details>`:'';
    $('exampleContent').innerHTML=`${exampleKind==='opening'?`<p class="openingNote">${openingNotes[step]}</p>`:''}${sequence}${body}${step===0&&exampleKind==='capture'?data.context_views.map(c=>`<h3>${placeMarker(c.place)} ${c.place.name} <span class="placeRef">#${c.place.reference}</span></h3>${progressRows(c,null)}`).join(''):`<h3>${placeMarker(local.place)} ${local.place.name} <span class="placeRef">#${local.place.reference}</span></h3>${progressRows(local,null)}${effect&&!effect.gains.length?`<h3>Next: ${data.next_view.place.name}</h3>${progressRows(data.next_view,null)}`:''}`}${effect?.gains.length&&data.parent_view?`<div class="exampleParent"><strong>One child claimed in ${data.parent_view.place.name}</strong><p>Winning this location claims its entry in its parent. Other children still need their own wins.</p>${progressRows(data.parent_view,null)}</div>`:''}${exampleKind==='capture'&&step===4?'<p>The same ownership rule repeats through ten levels. Winning the World ends the match. In live play, the other player chooses its own replies.</p>':''}${exampleKind==='opening'&&step===exampleLast?'<button data-example-kind="capture">See a capture and its parent</button>':''}<small>No live moves spent. Your save, candidate and analysis line are unchanged.</small>`;
    $('exampleBack').disabled=step===0;$('exampleNext').disabled=step===exampleLast;
  }catch(e){$('exampleContent').textContent=e.message;}finally{renderingExample=false;}
}
// A tab may become stale while another tab is playing. Refresh only the view;
// never replay an old candidate or silently commit it against a new revision.
document.addEventListener('visibilitychange',async()=>{
  if(document.hidden||busy||!view)return;
  try{const fresh=await read([]);if(fresh.revision!==view.revision)await handleError(Object.assign(Error('The game changed'),{stale:true}));}catch(e){error(e);}
});
async function start(){try{const initial=await read([]);view=initial;focus=assignmentFocus(initial);await visit(focus);if(view.computer_turn)await mutation('ai');if(view.ply>0&&!learning.welcomed){learning.welcomed=true;saveLearning();$('welcomeKind').textContent=view.save_enabled===false?'Existing game':'Saved game';$('welcomeContinue').textContent=view.save_enabled===false?'Continue current game':'Continue saved game';$('welcomeSummary').textContent=`${view.ply} moves played. Your saved claims remain in their locations. Continue at ${placeLabel(focus)}, or choose a new game.`;$('welcomeDialog').showModal();}}catch(e){error(e);}}
start();
