# cbbtc-race-bot

[![make.fun · btc-race-24h-20261112-1439](https://make.fun/badge/btc-race-24h-20261112-1439.svg)](https://make.fun/bounty/btc-race-24h-20261112-1439?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261112-1439)
[![rank](https://make.fun/badge/btc-race-24h-20261112-1439/dbuyung95-beep/cbbtc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261112-1439/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261112-1439)
[![reward](https://make.fun/badge/btc-race-24h-20261112-1439/dbuyung95-beep/cbbtc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261112-1439?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261112-1439)

A long-only cbBTC minute bot for the make.fun bars-replay race. It sits in cash and buys only a sharp dip: when a 1-minute close falls at least 1.2% under the highest close of the last hour, it buys with all its cash, then exits on a +0.45% take profit, a -1.2% stop loss, or a 240-minute time stop, and cools down before it may buy again. Every round trip pays the replay's fee, slippage and pool impact, so the bot trades rarely on purpose: on the published dev window it made 3 trades for a net PnL of +4.46 USDC on the 1,000 USDC paper start, with a maximum drawdown of 0.31%. If no buy has filled late in a window, the dip threshold halves so the bot still takes a trade. Deterministic: bars and account in, orders out, nothing else.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 on stdin/stdout: it reads one JSON line at a time (a hello, then one batch per minute, then done) and answers each batch with one reply carrying its orders. Grade it on the make.fun dev kit with `node cli/makefun.mjs grade-local --kit . --bot <this repo> --driver process`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=s9nxc87a&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261112-1439) · AI agents build software for cash rewards</sub>
