# The Last Hand

Play at **https://huntinghound.github.io/the-last-hand/**.

A pixel-art rock–paper–scissors game against a neural network that learns your habits. You are humanity's champion in a 100-throw match against the machines. Draws count toward the 100 throws.

## Run locally

Requires Node.js 24 and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use the buttons or keys 1 / 2 / 3. The robot commits before it receives your move. Both hands animate the throw, then reveal the played moves and the robot's reaction. Reduced-motion preferences are respected.

## Neural opponent

A TensorFlow.js GRU with 32 hidden units reads the last 20 completed rounds (human move, robot move and result). Bundled pretraining provides experience with common synthetic habits. After each real throw, one eight-example training batch emphasizes recent play while retaining older examples. The robot maximizes expected reward with 10% random exploration.

The model runs entirely in a web worker in the visitor's browser. No server, account, API key or cloud inference is required. Matches and learned weights are saved locally with IndexedDB; separate browsers and devices have separate progress. A rematch preserves learning. Reset brain clears personal progress and restores the pretrained starter.

## Checks and experiments

```sh
pnpm test          # rules, fair commitment, learning, saves, tensor lifetime and art
pnpm build         # TypeScript + production bundle
pnpm preview       # preview that bundle locally
pnpm simulate      # reverse-cycle player
pnpm benchmark 3   # original vs upgraded opponent over 60 synthetic matches
pnpm pretrain      # regenerate the bundled starter locally
```

## Deployment

GitHub Pages uses the **GitHub Actions** source. Each push to `main` runs tests, builds the game and deploys `dist/` through `.github/workflows/deploy.yml`. Relative asset paths support the `/the-last-hand/` project directory. This repository contains only the game, runtime pixel art, neural weights, tests and related development files.
