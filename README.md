<!-- Copy this file to README.md in your bot repository and fill in every
     [bracketed] field. The badge URLs must name your repository. -->

# cbBTC drop-rebound bot

[![Competition](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmake.fun%2Fapi%2Fcompetitions%2Fbtc-race-24h-20261112-1439%2Fbadge&query=%24.label&label=Competition)](https://make.fun/bounty/btc-race-24h-20261112-1439)
[![Dev gate](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmake.fun%2Fapi%2Fcompetitions%2Fbtc-race-24h-20261112-1439%2Fbadge&query=%24.dev_gate&label=Dev%20gate)](https://make.fun/bounty/btc-race-24h-20261112-1439)
[![Dev net PnL](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmake.fun%2Fapi%2Fcompetitions%2Fbtc-race-24h-20261112-1439%2Fbadge&query=%24.dev_net_pnl&label=Dev%20net%20PnL)](https://make.fun/bounty/btc-race-24h-20261112-1439)
[![Entrant](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmake.fun%2Fapi%2Fcompetitions%2Fbtc-race-24h-20261112-1439%2Fbadge&query=%24.entrant&label=Entrant)](https://make.fun/bounty/btc-race-24h-20261112-1439)

**Competition:** [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261112-1439) (`btc-race-24h-20261112-1439`) on [make.fun](https://make.fun)
**Bot:** a drop-rebound harvester for Coinbase Wrapped BTC (cbBTC) on 1-minute bars
**Final dev net PnL:** +8.221354 USDC (kit grade-local, process driver; 7 trades, win rate 0.5, max drawdown 0.84%; +5.010044 USDC with every fee doubled)

## Strategy

Long-only, one asset (CBBTC), all-in/all-out, judged bar by bar on closes:

- **Entry (flush buy):** flat, and the latest close has fallen at least
  0.58% below the highest close of the last 12 bars — a sharp local
  washout. Buy with all cash; the order fills at the next bar's open.
- **Take profit:** +0.60% over the position's cost.
- **Stop loss:** −0.40% under cost.
- **Breakeven arm:** once a close values the position +0.30% over cost,
  the stop moves up to cost, so a bounce that fades exits flat.
- **Time stop:** 600 batches. **Cooldown:** 15 batches after an exit.
- Every order caps slippage at 100 bps past the deciding close.

The dev window fell −2.3% end to end but chopped through a dozen
tradable bounces; this bot harvests them one at a time with tight exits
instead of riding a single leg, so it does not need the window to trend
up to earn — dips recovering is enough. Parameters were picked from an
offline sweep of the dev window and verified with the kit's own
grade-local harness (the sweep plateau is wide: neighbouring parameter
sets grade within a few tenths of the chosen one).

Deterministic by construction: decisions read only the hello/batch/
fills messages (the terms hello, batch, orders and bar are the whole
world); no clock, no randomness, no network, no files.

## Layout

- `main.ts` — the bot (Node 22, TypeScript erasable syntax only).
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim, copied
  byte-for-byte.
- `LICENSE` — MIT.

## Run it

Through the competition kit's local grader:

```sh
node cli/makefun.mjs grade-local --kit . --bot <this repo> --driver process
```

## How it was built

Built with an AI coding agent in a single session inside the
competition window; the session transcripts ship with the submission.
Version one was a slow dip-ride (60-bar lookback, +0.45%/−1.2% exits)
that graded +4.46 USDC on the dev window and was submitted first. The
dev leaderboard then showed the money in this window was in repeated
bounce capture, so the strategy was rebuilt around a 12-bar
drop-rebound entry with tight take-profit/stop-loss and a breakeven
arm, swept offline and re-verified with grade-local at +8.22 USDC
before this final submission replaced the first one.

## Referral

Building on make.fun too? [Sign up with my referral link](https://make.fun/r/s9nxc87a) — code `s9nxc87a`.

## License

MIT — see `LICENSE`.
