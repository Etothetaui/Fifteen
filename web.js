// Browser-only rendering and transport. ui.py owns the complete game state.
const board = document.querySelector('#board');
const modes = document.querySelector('#modes');
const statusText = document.querySelector('#status');
const substatus = document.querySelector('#substatus');
const newGame = document.querySelector('#new-game');
const retry = document.querySelector('#retry');
let worker, state, ready = false, busy = true, generation = 0, sequence = 0, timer;
const cells = Array.from({length: 9}, (_, square) => {
  const cell = document.createElement('button');
  cell.className = 'cell'; cell.disabled = true;
  cell.setAttribute('aria-label', `Position ${square + 1}, empty`);
  cell.innerHTML = `<span class="number" aria-hidden="true">${square + 1}</span><span class="mark" aria-hidden="true"></span>`;
  cell.addEventListener('click', () => {
    if (ready && !busy && state && !state.over && !state.computer_turn && !state.board[square]) send({action: 'play', square});
  });
  board.append(cell); return cell;
});
function selectedMode() { return document.querySelector('input[name="mode"]:checked').value; }
function send(payload) {
  busy = true;
  cells.forEach(cell => cell.disabled = true);
  worker.postMessage({id: ++sequence, generation, payload});
}
function restart() {
  if (!ready) return;
  clearTimeout(timer); generation++;
  // Old replies cannot redraw a board or schedule moves after a restart.
  statusText.textContent = 'Starting a fresh game…';
  send({action: 'new', mode: selectedMode()});
}
function render() {
  statusText.textContent = state.status;
  substatus.textContent = state.over ? 'Another round? The board is yours.' : state.computer_turn ? 'Finding the strongest move.' : 'Choose an empty square. X always starts.';
  document.querySelector('#version').textContent = `v${state.version}`;
  document.querySelector('#move-count').textContent = `MOVE ${String(state.history.length).padStart(2,'0')} / 09`;
  for (const mark of ['X','O']) {
    const player = document.querySelector(`#player-${mark.toLowerCase()}`);
    player.querySelector('span').textContent = state.players[mark];
    player.classList.toggle('active', !state.over && state.turn === mark);
  }
  cells.forEach((cell, i) => {
    cell.querySelector('.mark').textContent = state.board[i];
    cell.className = `cell ${state.board[i].toLowerCase()}${state.winning.includes(i) ? ' winning' : ''}${state.last_move === i ? ' last' : ''}`;
    cell.disabled = busy || state.over || state.computer_turn || !!state.board[i];
    cell.setAttribute('aria-label', `Position ${i+1}, ${state.board[i] || 'empty'}${state.winning.includes(i) ? ', winning line' : ''}`);
  });
  document.querySelector('#history').textContent = state.history.length ? state.history.map(m => `${m.mark} → ${m.square}`).join('  ·  ') : 'The story starts with an empty square.';
  clearTimeout(timer);
  if (state.computer_turn) {
    const current = generation;
    timer = setTimeout(() => { if (current === generation && !busy) send({action:'computer'}); }, 650);
  }
}
function fail(error) {
  console.error(error); ready = false; busy = true; clearTimeout(timer);
  modes.disabled = true; newGame.disabled = true; cells.forEach(c => c.disabled = true);
  statusText.textContent = 'The game couldn’t load.';
  substatus.textContent = 'Check your internet connection and try again.';
  retry.hidden = false;
}
function boot() {
  if (worker) worker.terminate();
  clearTimeout(timer); generation++; ready = false; busy = true;
  retry.hidden = true; statusText.textContent = 'Getting the board ready…';
  substatus.textContent = 'The first visit may take a moment.';
  worker = new Worker('python-worker.js');
  worker.onerror = event => fail(event.message);
  worker.onmessage = ({data}) => {
    if (data.fatal) return fail(data.error);
    if (data.ready) { ready = true; modes.disabled = false; newGame.disabled = false; restart(); return; }
    if (data.generation !== generation) return;
    if (data.error) return fail(data.error);
    state = data.state; busy = false; render();
  };
}
modes.addEventListener('change', restart);
newGame.addEventListener('click', restart);
retry.addEventListener('click', boot);
boot();
