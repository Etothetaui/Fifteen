# Requirements: accessible presentation of the original L10 game

## Product objective

Create a fun, understandable strategy-game presentation of the original
10-level recursive magic-square game. Players must be able to make informed
decisions, follow their opponent and understand how both players affect future
play on an ordinary screen.

The underlying game must remain mechanically exact. Theme, terminology, layout
and navigation may be replaced completely. No particular previous interface,
including the name "Relay", is a requirement.

## Mandatory mechanical requirements

M1. Use exactly ten recursive levels, with the original starting position.
Do not pre-complete lower levels to shorten the game.

M2. `fifteen.py` is the authoritative implementation of legal moves, occupied
positions, turn alternation, forced routing, release to the nearest unfinished
parent, ownership, wins, draws, closures, propagation and the ultimate result.
Preserve its behavior, including edge cases.

M3. Each committed player move must correspond to exactly one legal original
leaf move. Players alternate according to the original rules. An automatic
opponent response is a separate opponent move and must be shown as such.

M4. Presentation must preserve every legal choice and prohibit every illegal
choice. It must not filter away legal choices to simplify the game.

M5. Navigation, inspection, selection and hypothetical previews are not game
moves. They must not change the live position, turn or future legal choices.

M6. Do not add action points, multiple moves per turn, combat, resources,
automatic descendant completion, alternative scoring or substitute win rules.
A strategy theme is permitted only when its actions map exactly to the
original game.

## Mandatory player-facing requirements

U1. Players must not need to know magic squares, sums or tic-tac-toe. Explain
the actual decisions and objectives using clear, consistent visual language
and plain functional labels. Keep the mathematical implementation hidden.

U2. At each turn, clearly show whose turn it is, where play is allowed, what
the player can choose, the immediate objective and how it contributes to the
ultimate objective. Explain why relevant unavailable choices are unavailable.

U3. Before commitment, show what a selected move would claim, block or complete,
any immediate effects at higher levels, and where the opponent would be allowed
to play next. Explain routing and release when they affect that consequence.
Separate guaranteed effects from possible opponent replies; do not present a
prediction as a certainty.

U4. After the opponent moves, make its location and action easy to find. Show
what changed, any closures or ownership changes at higher levels, and why the
player now has the displayed choices. The player must be able to inspect the
affected locations without losing their current assignment.

U5. Make the recursive hierarchy usable through all ten levels on an ordinary
screen. Normal turns must not require repeatedly traversing ten levels or
reading a giant nested board. Show relevant detail progressively, retain clear
location context and provide a direct return to the current legal play area.

U6. Make relevant past activity and developing objectives findable so that
players can connect earlier decisions to later consequences. Give locations
consistent identities; distinguish ownership from activity or partial progress.

U7. Provide clear instructions, a playable computer opponent, persistent saved
games and a complete victory/draw flow. Preserve existing supported save,
restore and undo behavior.

U8. The result must support understandable, meaningful and enjoyable play.
Changing labels or making the screen attractive is insufficient if players
still cannot follow the game. Usability and enjoyment require playtesting.

## Implementation constraints

I1. Maintain one authoritative implementation of each game rule. UI, previews
and AI must reuse the original engine through imports and composition. Do not
implement a second rules engine in presentation code.

I2. Keep presentation separate from domain logic. Reuse existing navigation,
state management and AI behavior where applicable. Changing AI algorithms or
other unrelated behavior requires separate authorization.

I3. Keep state sparse and rendered views bounded so ten-level play remains
responsive without materializing the entire recursive tree.

I4. Preserve existing saves, original interfaces and unrelated user work.

## Acceptance criteria

A1. Replay identical legal move sequences through the original engine and the
new interface adapter. Legal options, active player, routing, ownership,
closures, draws, propagation and final result must match after every move.

A2. Demonstrate that one committed action makes one original move. Any higher
level results must follow solely from that move through the original rules.

A3. Verify that inspection and previews leave live state unchanged, including
after an invalid preview or error. Verify saved-state restoration and undo.

A4. Cover deep routing, occupied and closed destinations, nearest unfinished
parent release, local draws, multi-level propagation and a root-level ending.
Distinguish prepared test positions from games played from the starting state.

A5. Playtest through the visible interface on normal and narrow screens.
A player should be able to explain, using the interface:

- What they are trying to achieve and what they can do now.
- What their selected move will change and where it sends the opponent.
- What the opponent just did and how it changes their own next turn.
- How local progress affects the larger game.
- How to inspect another location and return to play.

A6. Assess actual play from the unmodified starting position, including the
sparse opening and later revisits. Record confusion, repetitive navigation and
whether choices feel meaningful. Automated tests establish fidelity, not fun;
do not declare the product successful solely because those tests pass.

## Open design choices

Theme, visual metaphor, layout, terminology and methods of explaining future
consequences remain open. A turn-based strategy presentation is acceptable;
an RTS presentation is not mandatory. These choices must satisfy the mechanics
and usability requirements above.

If playtesting reveals a conflict between enjoyment and the exact original
rules, report it explicitly. Do not silently change the game to resolve it.
