# Human interpretation and limitations for the two Level 4 playthroughs

Research date: 2026-10-08. Scope: evidence for interpreting the requested play logs. This note makes no implementation, game-rule, or AI change. It supplements [the earlier whole-board-awareness report](recursive-board-awareness-research.md), rather than repeating its interface survey.

## What the playthroughs can establish

An agent operating the actual viewer can record actual moves, camera operations, visible omissions, returns to locations, and decisions made with the available picture. It can also offer research-informed hypotheses about a person's workload. It cannot observe human eye movements, measure a human's working-memory capacity, or turn its own model/tool delays into human decision time. Two games can expose concrete failure cases and suggest designs; they cannot establish population-level usability or that one UI is optimal.

The requested explanations and brainstorming are deliberately more demanding than ordinary play. Fox, Ericsson, and Best's meta-analysis covered 94 studies and approximately 3,500 participants. Simple think-aloud did not significantly affect accuracy, while directed descriptions/explanations changed performance; all reporting methods tended to increase completion time. This matters even for a future human test: an exhaustive move diary is not an unmodified measure of ordinary play speed. [Authors' abstract, Psychological Bulletin 2011](https://pubmed.ncbi.nlm.nih.gov/21090887/).

## Repeated inspection is part of reasoning, not automatically wasted navigation

Plumlee and Ware compared serial zoom with multiple windows for multiscale pattern matching. Errors were higher with zooming; eye tracking in a follow-up showed more back-and-forth visits when participants could look between simultaneous views. Their explanation involves limited visual working memory. It supports recording revisits rather than assuming a player should remember a region after inspecting it once. The experiment involved visual patterns, not recursive strategy, so it does not establish a fixed number of views or a universal memory limit here. [Original research abstract, author's institution](https://scholars.unh.edu/ccom/1080/).

Task-specific interpretation: inspecting a candidate, its containing board, an opponent destination, and a possible return region requires different questions. An overview can answer location and broad ownership without exposing a tactical arrangement. The smallest board can answer immediate threats without exposing whether winning it helps an ancestor. A productive revisit can verify a relation; an unproductive revisit can merely relocate a forgotten place. The logs should distinguish these cases.

There is no defensible universal rule such as “a human needs five seconds per region” in the reviewed evidence. Expertise, density, novelty, rule knowledge, and the question being asked all change inspection demands. Record the actual available interval and activity, leaving unmeasured human durations unknown.

## Interpreting the computer without inventing an internal story

Record three separate levels of explanation:

1. **Observed effect:** the played coordinate, immediate threat/block/win, resolved boards, and next legal region. These are checkable facts from the authoritative state.
2. **Mechanism supported by source:** what the regular AI evaluates, searches, and uses for selection. General source behavior does not prove the decisive score or search path for this individual move unless such evidence is actually available.
3. **Plausible interpretation:** one or more reasons a human might choose the same move, and whether a human observer might interpret it as a trap, positional investment, forced reply, routine block, or mistake. These remain hypotheses.

The exact inspected search nodes, tied alternatives, and intended multi-turn plan should remain unknown when the available record does not expose them. A human-readable strategic explanation is not automatically the implementation's causal explanation. Conversely, a move chosen by a simple heuristic can still have a real strategic effect worth explaining.

Knowing the opponent is automated changes interpretation: a surprising move may reflect evaluation weights, deterministic ordering, limited search, or a tie rather than a concealed deep plan. Interpreting the same move as a human's can reasonably raise hypotheses about attention, experience, uncertainty, bait, and forgotten routing; none follows conclusively from the coordinate alone. This distinction does not require assuming humans are irrational or machines are perfect.

## Hindsight and attribution risks

Roese and Vohs describe hindsight bias as reconstructing past expectations after the outcome is known, including overconfidence and narrowing to one causal explanation. Their review identifies considering alternative causal accounts as a possible corrective. For the play diary, candidate expectations should precede the reply, with later revisions preserved rather than silently rewriting an earlier prediction. A successful route afterward does not demonstrate it was foreseeable beforehand. [Authors' review abstract, APS 2012](https://www.psychologicalscience.org/journals/perspectives/1745691612454303/).

Epley and colleagues distinguish observable behavior from attributing unobservable humanlike mental states. They also distinguish acting *as if* an agent has human traits from explicitly believing it does. Their studies examined anthropomorphism of pets and apparently unpredictable dogs, not game opponents. The useful methodological distinction here is that “this move blocks my line” describes an effect, while “the computer is trying to frighten me” attributes a mental state. A labeled as-if-human interpretation is useful brainstorming, but should not become evidence of actual intent. [Author-hosted original paper, Social Cognition 2008](https://static1.squarespace.com/static/51e3f4ede4b053e5f0062efd/t/51f7e184e4b0f58fade40024/1375199620013/when-we-need-a-human.pdf).

Automation bias research concerns relying on automated advice rather than checking other evidence. A NASA study also reports pilots remembering expected cues that were not present. This is a useful warning if a player assumes a computer move must be correct or if we reconstruct a missing visual cue afterward. The source studied cockpit decision aids, not competing game AI; this playthrough cannot diagnose automation bias in a player. [Original NASA research record](https://ntrs.nasa.gov/citations/20020043179).

## Suggested interpretation fields for each move

- Record actual actor, coordinate, pre/post state, forced prefix, closures, and next legal region.
- Record the ordered regions actually inspected, their displayed scale, and the question asked of each. Label source-code/state inspection separately from anything read visually in the viewer.
- Record candidate and expected consequences before committing; record the actual reply and revised interpretation afterward.
- Record real interval measurements with explicit endpoints. Separate navigation, waiting for display/AI, logging/tool overhead, and an unallocated remainder where possible. Do not claim unmeasured gaze duration.
- Tag each revisit: comparison, tactical verification, ancestor verification, routing verification, recovery of lost place, or interface recovery.
- For each computer move, separate verified effect, general verified AI mechanism, plausible strategic explanation, alternative explanation, and confidence.
- Record ideas when they occur and the move that prompted them. Brainstorming ideas need not be filtered early, but final priorities should distinguish observed recurring problems from speculative remedies.

## What to look for when analyzing the two completed games

Group observations by missing information, navigation effort, loss of context, difficulty comparing, uncertainty about routing, and reaction to the opponent. Keep current renderer failures separate from strategic complexity inherent in the game.

Prioritize a recurring failure with a directly recorded example over an attractive feature lacking supporting observations. Preserve useful exceptions: repeated inspection might be easy in a sparse position but difficult when resolved boards widen choices. A representation helping ownership recognition might still obscure a tactical pattern. Different depths of inspection should be retained as distinct requirements.

Potential next human validation, not an approved implementation: replay selected dense/nonlocal positions with actual players; collect task answers and camera actions; use a short concurrent report plus later explanation; compare silent timing when speed matters. The two agent games are an exploratory input to that process, not a substitute for it.
