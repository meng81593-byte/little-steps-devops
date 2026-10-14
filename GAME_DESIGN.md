# Little Steps: game rules and research basis

The reference is Lemke and Bisping, *Galois Energy Games: To Solve All Kinds of Quantitative Reachability Problems*, CONCUR 2025, article 29, DOI 10.4230/LIPIcs.CONCUR.2025.29.

## Mapping the paper to this game

- Positions and transitions: the authored graph nodes and path edges (paper section 2.1).
- Player positions: choose one affordable successor. Defender positions: the woodland squirrel chooses an exit. The runtime uses a restricted policy that prefers the largest immediate time cost, then stamina cost. Budget analysis conservatively covers every legal defender exit, including longer-term consequences (Lemma 11).
- Energy: remaining time and stamina, ordered component by component. Additive costs, additive refills and resource caps preserve monotonicity; the resource deduction function is unchanged.
- Objective: collect a bone, then reach home. The analysis duplicates the graph into without-bone and with-bone layers. Home in the with-bone layer is an absorbing goal, corresponding to the reachability construction in Remark 8.
- Failure: a resource becomes negative. Zero remains an allowed budget, matching the existing deduction behavior. The opening card now states this accurately.
- Budgets: keep the entire nondominated Pareto front. Player choices take the union of possible predecessor budgets; defender choices take componentwise maxima across all exits and prune dominated combinations (Algorithm 1). Displayed budgets always describe one real resource pair, never separately chosen minima from incompatible routes. Refills are inverted in reverse update order and respect the authored caps. Incomplete analysis is not presented as an exact budget.

## Difficulty progression

1. Tutorial: one short movement lesson, a bone detour and the woodland defender introduction. Only this trail is initially selectable.
2. Level 1: an easy direct bone route and an optional longer refill route. Their time/stamina tradeoff teaches that fastest and least tiring need not be the same route. Neither requires repeated farming to win.
3. Level 2: upper bone route versus a longer lower refill route, with wider branching and modest exploration slack. Drifting fog is an exploration extension: the paper assumes perfect information, so fog itself is not claimed to be part of its proven model.
4. Level 3: a chase puzzle with a second exit at the bone clearing. Verified route: 1,2,4,7,6,5,0,7,8,9. Cat pursuit uses the existing trail-following policy. The paper-style expanded graph treats the cat as an unrestricted adversary and is therefore a stronger conservative model; its result is not displayed as the exact optimum of this deterministic chase.

## Progress and visual language

Completion is stored separately from cosmetic rewards. Every previous trail must be completed before a later one can start, including the tutorial. A victory writes completion before showing the result card. Existing cosmetic ownership is preserved, but cosmetics are not evidence of completed trails.

Ivory corner brackets and a bobbing arrow mark affordable successors. Wooden paper badges show signed resource changes; positive changes use muted green. A leafy squirrel symbol replaces the red hazard. The journal HUD, introductory card, dialogue cards and completion card share paper-gray and coffee-brown colors.

Coat changes replace only the two fur palette colors on all four sprite frames. Black outlines, facial features, blue collar and transparency are preserved. Preview and gameplay use the same generated palette textures and animations.

## Checks

Run `node scripts/check-game.cjs` for Pareto-front, defender, cap, reachability, pursuit and progression checks. Run `node node_modules/typescript/bin/tsc --noEmit --skipLibCheck` for game source type checking; skipping dependency declarations avoids the existing eslint type-package conflict.

## UI refinement

The resource HUD is a compact 300 by 62 journal corner with a thin wood edge. Map effects use 20-pixel-high, single-line badges instead of framed panels. Badge placement avoids character-sized stops; overlapping badges temporarily hide during movement. Tooltips sit beside stops and also hide if they overlap the puppy. Tutorial dialogue uses a smaller card at the opposite screen edge when needed. Unexplored terrain uses muted gray-green shading with irregular slow wisps; explored corridors remain clear. These are visual changes and preserve resource updates and level rules.

Visual references: Stardew Valley official media (https://www.stardewvalley.net/media/) for compact peripheral HUD hierarchy, and Wargroove (https://wargroove.com/) / its fog-of-war codex (https://www.wargroovewiki.com/Fog_of_War) for explored/unexplored map separation. This is an interpretation for Little Steps, not a reproduction of their assets or mechanics.

## Single-use encounters and animated wardrobe

Each woodland defender encounter now triggers once per run on every level. Its symbol fades away, the accompanying squirrel departs, and returning to the stop restores player choice. This is a gameplay rule with encounter memory, not a general requirement imposed by the CONCUR paper. The existing budget solver, which continues to allow repeated defender choices, is a conservative guarantee rather than the exact Pareto frontier of this one-shot variant. Resource deduction is unchanged.

The old blue coat ID is retained for saved-game compatibility, but now represents natural cream fur. Accessories and clothing are composited into all four puppy frames. The shared textures automatically follow animation frames, mirroring, movement, scale and victory bounce in gameplay, wardrobe and reward previews. Garments use the original fur silhouette for sleeves and torso, preserving outlines, face, legs and tail. The red unaffordable-route circle is replaced with a small muted trail lock.
