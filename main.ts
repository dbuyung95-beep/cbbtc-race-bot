// cbBTC minute dip-buy bot for the make.fun bars-replay/v1 harness.
//
// Strategy (long only, one symbol: CBBTC against USDC, 1-minute bars):
// the dev window and most BTC days chop sideways-to-down, and every round
// trip pays the 4 bps fee, 2 bps slippage and the pool price impact, so
// frequent trading bleeds. This bot therefore trades rarely and only on
// capitulation-style dips:
//
//   - Entry: flat, and the latest close is at least DIP_BPS below the
//     highest close of the last LOOKBACK bars (a sharp local washout).
//     It buys with all available cash in one order.
//   - Fallback entry: if no buy has filled after FALLBACK_AFTER batches,
//     the dip threshold halves, so the bot still takes at least one trade
//     on a quiet window (the race bar asks for at least one trade).
//   - Exit, the whole position, decided on a close and filled at the next
//     bar's open: take profit at +TAKE_PROFIT_BPS over cost, stop loss at
//     -STOP_LOSS_BPS under cost, or a time stop after MAX_HOLD batches.
//   - After an exit it waits COOLDOWN batches before it may buy again, so
//     one long slide is not bought again and again on the way down.
//   - Every order caps slippage at MAX_SLIPPAGE_BPS past the close it was
//     decided on, so a fill into a gap is refused and retried next bar
//     while the reason still holds.
//
// All decisions read only the bars and the account the harness sends
// (hello, batch, fills, orders are the whole world): no clock, no
// randomness, no network, so two runs on the same bars match exactly.

import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Bars of history behind the rolling high the dip is measured from. */
const LOOKBACK = 60;
/** Entry dip: close at most (1 - DIP_BPS / 10_000) of the rolling high. */
const DIP_BPS = 120;
/** The fallback's looser dip once FALLBACK_AFTER batches passed tradeless. */
const FALLBACK_DIP_BPS = 60;
const FALLBACK_AFTER = 1100;
/** Exit ratios over the position's cost, in bps. */
const TAKE_PROFIT_BPS = 45;
const STOP_LOSS_BPS = 120;
/** Time stop: never hold longer than this many batches. */
const MAX_HOLD = 240;
/** Batches to sit out after an exit before the next entry. */
const COOLDOWN = 45;
const MAX_SLIPPAGE_BPS = 100;

/** Every close seen so far, oldest first, capped at LOOKBACK entries. */
const closes: number[] = [];
/** Batches answered so far (the batch being answered is batches - 1). */
let batches = 0;
/** The batch count at which the current position's buy was decided. */
let enteredAt = -1;
/** The batch count at which the last sell was decided. */
let exitedAt = -1000000;
/** Whether any buy has filled in this run (drives the fallback). */
let anyFill = false;
/** Whether a buy order is still waiting for its fill at the next open. */
let buyPending = false;

await runBars({
  onBatch(state, batch) {
    for (const fill of batch.fills) {
      if (fill.status === 'filled' && fill.side === 'buy') anyFill = true;
      if (fill.status === 'filled' && fill.side === 'sell') buyPending = false;
    }
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      closes.push(Number(bar.c));
      if (closes.length > LOOKBACK) closes.shift();
    }
    batches++;
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      buyPending = false;
      const value = state.value(SYMBOL, held.qty);
      const cost = held.cost;
      const takeProfit = value * 10000n >= cost * BigInt(10000 + TAKE_PROFIT_BPS);
      const stopLoss = value * 10000n <= cost * BigInt(10000 - STOP_LOSS_BPS);
      const timeStop = enteredAt >= 0 && batches - enteredAt >= MAX_HOLD;
      if (takeProfit || stopLoss || timeStop) {
        exitedAt = batches;
        enteredAt = -1;
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    if (buyPending) return [];
    if (batches - exitedAt < COOLDOWN) return [];
    if (closes.length < LOOKBACK) return [];
    const close = closes[closes.length - 1]!;
    let high = 0;
    for (const c of closes) if (c > high) high = c;
    if (high <= 0) return [];
    const dipBps = anyFill || batches <= FALLBACK_AFTER ? DIP_BPS : FALLBACK_DIP_BPS;
    // close <= high * (1 - dipBps / 10_000), compared in float64 like the
    // baselines' indicators: exact IEEE arithmetic, run after run.
    if (close * 10000 > high * (10000 - dipBps)) return [];
    const notional = state.cash;
    if (notional === 0n || notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    buyPending = true;
    enteredAt = batches;
    const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS };
    return [buy];
  },
});
