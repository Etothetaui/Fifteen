// Rendering and transport only; Python supplies legal moves and board results.
const board = document.querySelector('#board');
const modes = document.querySelector('#modes');
const levels = document.querySelector('#levels');
const statusText = document.querySelector('#status');
const substatus = document.querySelector('#substatus');
const newGame = document.querySelector('#new-game');
const retry = document.querySelector('#retry');
let selectedLevel;
const playerToggles = [...modes.querySelectorAll('[role="switch"]')];
let worker, state, ready = false, busy = true, generation = 0, sequence = 0, timer;
// Translate the two presentation controls into the existing Python mode names.
function selectedMode() {
  const [x, o] = playerToggles.map(toggle => toggle.getAttribute('aria-checked') === 'true');
  return x ? (o ? 'computer-computer' : 'human-o') : (o ? 'human-x' : 'human-human');
}
function renderLevelSelection() {
  levels.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.value) === selectedLevel));
  });
}
function send(payload) {
  busy = true;
  board.querySelectorAll('button').forEach(cell => cell.disabled = true);
  worker.postMessage({id: ++sequence, generation, payload});
}
function restart() {
  if (!ready) return;
  const count = selectedLevel;
  if (!Number.isSafeInteger(count)) return;
  clearTimeout(timer); generation++;
  // Old replies cannot redraw a board or schedule moves after a restart.
  statusText.textContent = 'Starting a new game…';
  send({action: 'new', mode: selectedMode(), levels: count});
}
function pathText(path) { return path.map(i => i + 1).join(' / '); }
function renderNode(node, root = false) {
  const element = root ? board : document.createElement(node.kind === 'board' ? 'div' : 'button');
  if (node.kind === 'cell') {
    element.className = `cell ${node.mark.toLowerCase()}${node.winning ? ' winning' : ''}${node.last ? ' last' : ''}`;
    const number = document.createElement('span'); number.className = 'number';
    number.textContent = node.path.at(-1) + 1; number.setAttribute('aria-hidden', 'true');
    const mark = document.createElement('span'); mark.className = 'mark';
    mark.textContent = node.mark; mark.setAttribute('aria-hidden', 'true');
    element.append(number, mark);
    element.disabled = busy || state.computer_turn || !node.allowed;
    element.setAttribute('aria-label', `Position ${pathText(node.path)}, ${node.mark || 'empty'}${node.winning ? ', winning line' : ''}`);
    element.addEventListener('click', () => send({action:'play', square: state.levels === 1 ? node.path[0] : node.path}));
  } else {
    element.className = root ? 'board' : `subboard${node.allowed ? ' available' : ''}${node.winning ? ' winning' : ''}`;
    element.classList.toggle('nested', node.levels > 1);
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', node.path.length ? `Board ${pathText(node.path)}` : 'Tic-tac-toe board');
    element.replaceChildren(...node.children.map(child => renderNode(child)));
    if (node.result !== null && !root) {
      const result = document.createElement('span'); result.className = 'board-result';
      result.textContent = node.result === 1 ? 'X' : node.result === -1 ? 'O' : 'Draw';
      result.setAttribute('aria-label', node.result ? `${result.textContent} wins board ${pathText(node.path)}` : `Board ${pathText(node.path)} drawn`);
      element.append(result);
    }
  }
  return element;
}
function renderBoard() {
  // All exposed levels use the same recursive renderer and Python permissions.
  renderNode(state.tree, true);
  document.querySelector('.play-area').dataset.levels = state.levels;
  document.querySelector('#board-title').textContent = `Level ${state.levels}`;
}
function render() {
  statusText.textContent = state.status;
  substatus.textContent = state.over ? 'Game over.' : state.computer_turn ? '' : state.instruction;
  document.querySelector('#version').textContent = `v${state.version}`;
  document.querySelector('#move-count').textContent = `MOVE ${String(state.history.length).padStart(2,'0')} / ${state.capacity.padStart(2,'0')}`;
  renderBoard();
  document.querySelector('#history').textContent = state.history.length ? state.history.map(m => `${m.mark} → ${Array.isArray(m.square) ? m.square.join(' / ') : m.square}`).join('  ·  ') : 'No moves yet.';
  clearTimeout(timer);
  if (state.computer_turn) {
    const current = generation;
    timer = setTimeout(() => { if (current === generation && !busy) send({action:'computer'}); }, 650);
  }
}
function fail(error) {
  console.error(error); ready = false; busy = true; clearTimeout(timer);
  modes.disabled = true; levels.disabled = true; newGame.disabled = true;
  board.querySelectorAll('button').forEach(c => c.disabled = true);
  statusText.textContent = 'The game couldn’t load.';
  substatus.textContent = 'Check your internet connection and try again.';
  retry.hidden = false;
}
function boot() {
  if (worker) worker.terminate();
  clearTimeout(timer); generation++; ready = false; busy = true;
  modes.disabled = true; levels.disabled = true; newGame.disabled = true;
  retry.hidden = true; statusText.textContent = 'Loading…';
  substatus.textContent = 'Downloading the Python runtime.';
  worker = new Worker('python-worker.js');
  worker.onerror = event => fail(event.message);
  worker.onmessage = ({data}) => {
    if (data.fatal) return fail(data.error);
    if (data.ready) {
      // Python owns both the default depth and the available UI choices.
      if (!data.levels.includes(selectedLevel)) selectedLevel = data.defaultLevels;
      levels.querySelectorAll('button').forEach(button => button.remove());
      levels.querySelector('.level-options').append(...data.levels.map(value => {
        const button = document.createElement('button'); button.type = 'button';
        button.value = value; button.textContent = value;
        button.setAttribute('aria-label', `Level ${value}`);
        button.addEventListener('click', () => {
          if (selectedLevel === value) return;
          selectedLevel = value; renderLevelSelection(); restart();
        });
        return button;
      }));
      renderLevelSelection();
      ready = true; modes.disabled = false; levels.disabled = false; newGame.disabled = false; restart(); return;
    }
    if (data.generation !== generation) return;
    if (data.error) {
      busy = false;
      if (state) { render(); substatus.textContent = data.error; }
      else fail(data.error);
      return;
    }
    state = data.state; busy = false; render();
  };
}
playerToggles.forEach(toggle => toggle.addEventListener('click', () => {
  const computer = toggle.getAttribute('aria-checked') !== 'true';
  toggle.setAttribute('aria-checked', String(computer));
  toggle.querySelector('.toggle-name').textContent = computer ? 'Computer' : 'Human';
  restart();
}));
newGame.addEventListener('click', restart);
retry.addEventListener('click', boot);
boot();
