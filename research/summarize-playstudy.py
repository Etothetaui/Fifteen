"""Read both complete diaries and index evidence; never execute game moves."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
themes = {
    'routing/access': r'route|routing|access|destination|forced',
    'ancestor/cascade': r'ancestor|parent|cascade|higher.level',
    'comparison/return': r'compar|return|revisit|back.and.forth',
    'visibility/scale': r'zoom|overview|disappear|collapsed|unreadable',
    'identity/correction': r'correction|misread|mistak|identity|confus',
}
results = {}
for game in ('x', 'o'):
    diary = (ROOT / f'level4-playstudy-{game}-readable-log.md').read_text(encoding='utf-8')
    sections = re.split(r'(?=^### Ply \d+:)', diary, flags=re.M)[1:]
    sections[-1] = sections[-1].split('## Original miscellaneous observations')[0]
    data = json.loads((ROOT / f'level4-playstudy-{game}-browser-journal.json').read_text(encoding='utf-8'))
    events = data['events']
    visits = [e for e in events if e.get('event') in ('inspection', 'overview-inspection', 'zoom-transition')]
    notes = json.loads((ROOT / f'level4-playstudy-{game}-retrospective-computer-notes.json').read_text(encoding='utf-8'))
    methods = Counter(e.get('method', 'drag at retained scale' if 'drags' in e else e.get('event')) for e in visits)
    widths = Counter(round(e.get('boardWidth', e.get('observation', {}).get('board', {}).get('width', 0)) or 0) for e in visits)
    closures = Counter(len(n['closures']) for n in notes)
    results[game] = {
        'diary_sections_read': len(sections),
        'methods': dict(methods),
        'common_absolute_board_widths': widths.most_common(6),
        'recorded_drags': sum(e.get('drags', e.get('correctiveDrags', 0)) or 0 for e in visits),
        'computer_moves_by_number_of_closed_boards': dict(closures),
        'computer_immediate_blocks': sum(any('blocks an existing' in s for s in n['verified_effects']) for n in notes),
        'themes': {name: sum(bool(re.search(pattern, section, re.I)) for section in sections) for name, pattern in themes.items()},
    }
    selected = (1, 3, 9, 475, 1436, 1455, 1470, 1472, 1474, 1476, 1477, 1478) if game == 'x' else (476, 1044, 1108, 1134, 1148, 1323, 1474, 1542, 1544, 1586, 1602, 1609, 1611, 1613, 1615, 1616)
    excerpts = [s for s in sections if int(re.match(r'### Ply (\d+)', s).group(1)) in selected]
    (ROOT / f'level4-playstudy-{game}-analysis-excerpts.md').write_text('\n'.join(excerpts), encoding='utf-8')
(ROOT / 'level4-playstudy-evidence-index.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps(results, indent=2))
