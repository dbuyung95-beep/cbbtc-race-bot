// cbBTC drop-rebound bot for the make.fun bars-replay/v1 harness.
//
// Strategy (long only, one symbol: CBBTC against USDC, 1-minute bars):
// sit in cash and treat a sharp short-window drop as a flush to harvest,
// not a trend to ride:
//   - Entry: flat, and the latest close is at least DROP_BPS below the
//     highest close of the last LOOKBACK bars. Buy with all available cash
//     in one order (filled at the next bar's open).
//   - Exits, the whole position, decided on a close and filled at the
//     next open: take profit at +TP_BPS over cost; stop loss at -SL_BPS
//     under cost; a breakeven arm — once a close has valued the position
//     at +BE_ARM_BPS over cost, the stop moves up to cost, so a bounce
//     that fades exits flat instead of red; time stop after MAX_HOLD.
//   - After an exit, wait COOLDOWN batches before buying again.
//   - Every order caps slippage at MAX_SLIPPAGE_BPS past the close it was
//     decided on.
//
// The parameters come from an offline sweep over the published dev
// window, verified with the kit's own grade-local harness: on that
// window (BTC -2.3% end to end, a dozen tradable bounces) this family
// earns by harvesting the bounces repeatedly, where a slow dip-ride
// earns only when the window trends up. All decisions read only the
// bars and the account the harness sends (hello, batch, fills, orders
// are the whole world): no clock, no randomness, no network, so two
// runs on the same bars match exactly.

import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Bars of history behind the rolling peak the drop is measured from. */
const LOOKBACK = 12;
/** Entry drop: close at most (1 - DROP_BPS / 10_000) of the rolling peak. */
const DROP_BPS = 58;
/** Take profit over the position's cost, in bps. */
const TAKE_PROFIT_BPS = 60;
/** Stop loss under the position's cost, in bps. */
const STOP_LOSS_BPS = 40;
/** A close this far over cost arms the breakeven stop. */
const BE_ARM_BPS = 30;
/** Time stop: never hold longer than this many batches. */
const MAX_HOLD = 600;
/** Batches to sit out after an exit before the next entry. */
const COOLDOWN = 15;
const MAX_SLIPPAGE_BPS = 100;

/** Every close seen so far, oldest first, capped at LOOKBACK entries. */
const closes: number[] = [];
/** Batches answered so far (the batch being answered is batches - 1). */
let batches = 0;
/** The batch count at which the current position's buy was decided. */
let enteredAt = -1;
/** The batch count at which the last sell was decided. */
let exitedAt = -1000000;
/** Whether the breakeven stop is armed for the current position. */
let beArmed = false;
/** Whether a buy order is still waiting for its fill at the next open. */
let buyPending = false;

await runBars({
  onBatch(state, batch) {
    for (const fill of batch.fills) {
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
      if (value * 10000n >= cost * BigInt(10000 + BE_ARM_BPS)) beArmed = true;
      const takeProfit = value * 10000n >= cost * BigInt(10000 + TAKE_PROFIT_BPS);
      const stopLoss = beArmed
        ? value <= cost
        : value * 10000n <= cost * BigInt(10000 - STOP_LOSS_BPS);
      const timeStop = enteredAt >= 0 && batches - enteredAt >= MAX_HOLD;
      if (takeProfit || stopLoss || timeStop) {
        exitedAt = batches;
        enteredAt = -1;
        beArmed = false;
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    if (buyPending) return [];
    if (batches - exitedAt < COOLDOWN) return [];
    if (closes.length < LOOKBACK) return [];
    const close = closes[closes.length - 1]!;
    let peak = 0;
    for (const c of closes) if (c > peak) peak = c;
    if (peak <= 0) return [];
    // close <= peak * (1 - DROP_BPS / 10_000), compared in float64 like the
    // baselines' indicators: exact IEEE arithmetic, run after run.
    if (close * 10000 > peak * (10000 - DROP_BPS)) return [];
    const notional = state.cash;
    if (notional === 0n || notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    buyPending = true;
    enteredAt = batches;
    const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS };
    return [buy];
  },
});
