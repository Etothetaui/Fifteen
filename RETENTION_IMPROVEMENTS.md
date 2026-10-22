# Relay learning and retention worklist

## Objective and constraints

Help a new player recognize meaningful choices earlier, retain a sense of
progress between locations, and recover from mistakes. Preserve the exact
original L10 magic-square rules, one original move per turn, legal routing,
ownership, closure, draws, cascades, AI behavior, and save compatibility.
Presentation must consume the shared adapter; it must not invent game rules.

The baseline blind player completed 20 turns / 40 total moves. Turn 1: basic
controls understood. Turn 5: emblem objective understood, but progress felt
dispersed over empty locations. Turn 10: first intentional route reconnect.
Turn 15: recognized a threat but could not arrange a return. Turn 20: used the
preview and reply explorer to avoid allowing an opponent capture. No location
was completed. Repeated names, letter-only group members, hidden routing
instructions, unexplained risk warnings, and the distant hierarchy caused
confusion. These are qualitative AI playtest observations, not human retention
measurements. Human timing remains unknown.

## Review process

- Implement a coherent, noticeable batch, then freeze it for blind playtests.
- Give three fresh agents only their isolated page URL and a neutral play task.
  Do not disclose the implementation, desired findings, retention goal, rules,
  prior feedback, or this document. They use the browser themselves.
- Record actual turns, observed decisions, confusion, willingness to continue,
  and screenshots. No parent-operated substitute for blind play.
- Accept an item only after implementation verification and positive concrete
  evidence from at least two independent testers, with no unresolved material
  regression in its affected flow. A tester need not use the word "like";
  demonstrate that the change helped them understand or act.
- Revise failed items and add actionable newly discovered problems below.
- Remove accepted items from Pending, preserving their implementation and test
  evidence in RETENTION_TEST_LOG.md. Do not silently weaken acceptance criteria.

## Pending

None. All 22 numbered items have been implemented and accepted under the review
process above. Implementation, blind-test evidence and remaining limitations
are preserved in RETENTION_TEST_LOG.md.

## Human validation follow-up

Future human sessions should measure time to explaining a move's consequence,
recognizing the opponent's last effect, comparing two legal choices, and making
an informed strategic choice. Record abandonment points and reasons. Finishing
turns alone is insufficient; no retention percentage is assumed from AI tests.
