# Little Steps Home

**Little Steps Home** is a cozy adventure game where a lost puppy must return home.
The player must manage limited resources while navigating through different paths.
Each choice affects the available resources and determines whether the puppy can reach home.

## Setup

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Run linter: `npm run lint`

## Current skeleton

- Webpack + TypeScript + Phaser 3 setup
- One simple level in `src/little-steps-client/levels/level-data.ts`
- `MainScene` draws nodes/edges and moves a puppy token on `SPACE`
- `HudScene` displays current node and goal state
