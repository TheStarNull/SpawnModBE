/**
 * The `TradeTable` class — generates a villager trade table.
 *
 * Trade tables are un-versioned, un-namespaced objects with a required top-level
 * `"tiers"` array. Each tier unlocks based on the trader's cumulative experience
 * and may contain either `trades` (all shown) or `groups` (random selection).
 * Each trade is a `wants` → `gives` transaction with optional limits, experience
 * rewards and item functions.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/loot/trade-tables
 *
 * @example
 * ```ts
 * const minister = new TradeTable({
 *   tiers: [
 *     {
 *       groups: [
 *         {
 *           numToSelect: 1,
 *           trades: [
 *             {
 *               wants: [
 *                 { item: 'wiki:blessing_glyph', quantity: { min: 2, max: 4 }, priceMultiplier: 0.5 },
 *                 { item: 'minecraft:book' },
 *               ],
 *               gives: [
 *                 {
 *                   item: 'minecraft:enchanted_book',
 *                   functions: [{ function: 'enchant_book_for_trading', base_cost: 4 }],
 *                 },
 *               ],
 *               maxUses: 7,
 *               traderExp: 3,
 *             },
 *           ],
 *         },
 *       ],
 *     },
 *     {
 *       totalExpRequired: 28,
 *       trades: [
 *         { wants: [{ choice: [{ item: 'wiki:sacred_stones', quantity: 4 }] }], gives: [{ item: 'wiki:aeleon_jewels' }] },
 *       ],
 *     },
 *   ],
 * });
 * bp.addTradeTable(minister, 'trading/wiki/minister');
 * ```
 */

/** A quantity: integer or `{ min, max }` range. */
export type TradeQuantity = number | { min: number; max: number };

/** An item function applied to a wanted/given item (shared with loot tables). */
export interface TradeFunction {
  function: string;
  [key: string]: unknown;
}

/** The price-multiplier option on a wanted item. */
export interface TradePrice {
  /** Adjusts the base quantity due to demand / curing / hero-of-the-village. */
  priceMultiplier?: number;
}

/** A single trade item (`wants` or `gives` entry). */
export interface TradeItem extends TradePrice {
  /** The item identifier (may include data suffix: `'minecraft:log:2'`). */
  item: string;
  /** The count wanted/given. Defaults to 1. */
  quantity?: TradeQuantity;
  /** Item functions to apply (e.g. enchant_with_levels). */
  functions?: TradeFunction[];
}

/** A choice: one item picked uniformly for each trader instance. */
export interface TradeChoice {
  choice: TradeItem[];
}

/** A single entry in `wants`/`gives` — an item or a choice. */
export type TradeEntry = TradeItem | TradeChoice;

/** A single trade transaction. */
export interface Trade {
  /** 1-2 wanted entries. */
  wants: TradeEntry[];
  /** Exactly 1 given entry. */
  gives: TradeEntry[];
  /** Trade uses before resupply. 0=shown but unusable; negative=infinite. Defaults to 7. */
  maxUses?: number;
  /** Disable the player's experience orb reward. Defaults to `true`. */
  rewardExp?: boolean;
  /** Experience the trader gains per trade (drives tier unlocking). Defaults to 1. */
  traderExp?: number;
}

/** A trade group (random selection within a tier). */
export interface TradeGroup {
  /** How many trades to pick for the tier. `0` = all (default). */
  numToSelect?: number;
  /** The trades to select from (duplicates increase likelihood). */
  trades: Trade[];
}

/** A trade tier (unlockable set of trades). */
export interface TradeTier {
  /** Trades to show for this tier. Ignored if `groups` is also given. */
  trades?: Trade[];
  /** Trade groups (random selection). */
  groups?: TradeGroup[];
  /** Trader XP required to unlock this tier. Negative freezes; `<0` at tier 0 unlocks all. */
  totalExpRequired?: number;
}

/** Configuration accepted by {@link TradeTable}. */
export interface TradeTableConfig {
  /** The tiers of the trade table. */
  tiers: TradeTier[];
}

export class TradeTable {
  readonly config: TradeTableConfig;

  constructor(config: TradeTableConfig) {
    if (!config || !config.tiers || config.tiers.length === 0) {
      throw new Error('TradeTable requires at least one tier.');
    }
    this.config = { tiers: config.tiers.map((t) => ({ ...t })) };
  }

  /** Builds the complete trade-table JSON. */
  buildJson(): object {
    return { tiers: this.config.tiers.map((tier) => this.buildTier(tier)) };
  }

  /** Builds a single tier, keeping the wiki's snake_case output. */
  private buildTier(tier: TradeTier): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (tier.totalExpRequired !== undefined) {
      out.total_exp_required = tier.totalExpRequired;
    }
    if (tier.trades && tier.trades.length > 0) {
      out.trades = tier.trades.map((t) => this.buildTrade(t));
    }
    if (tier.groups && tier.groups.length > 0) {
      out.groups = tier.groups.map((g) => ({
        ...(g.numToSelect !== undefined ? { num_to_select: g.numToSelect } : {}),
        trades: g.trades.map((t) => this.buildTrade(t)),
      }));
    }
    return out;
  }

  /** Builds a single trade transaction. */
  private buildTrade(trade: Trade): Record<string, unknown> {
    const out: Record<string, unknown> = {
      wants: trade.wants.map((w) => this.buildEntry(w)),
      gives: trade.gives.map((g) => this.buildEntry(g)),
    };
    if (trade.maxUses !== undefined) out.max_uses = trade.maxUses;
    if (trade.rewardExp !== undefined) out.reward_exp = trade.rewardExp;
    if (trade.traderExp !== undefined) out.trader_exp = trade.traderExp;
    return out;
  }

  /** Builds a wanted/given entry (item or choice). */
  private buildEntry(entry: TradeEntry): Record<string, unknown> {
    if ('choice' in entry) {
      return { choice: entry.choice.map((i) => this.buildItem(i)) };
    }
    return this.buildItem(entry);
  }

  /** Builds a single item definition. */
  private buildItem(item: TradeItem): Record<string, unknown> {
    const out: Record<string, unknown> = { item: item.item };
    if (item.quantity !== undefined) out.quantity = item.quantity;
    if (item.priceMultiplier !== undefined) out.price_multiplier = item.priceMultiplier;
    if (item.functions && item.functions.length > 0) out.functions = item.functions;
    return out;
  }
}

/** Helper: builds an `enchant_with_levels` trade function. */
export function enchantWithLevels(
  levels: number | { min: number; max: number },
  treasure = false
): TradeFunction {
  return { function: 'enchant_with_levels', treasure, levels };
}

/** Helper: builds an `enchant_book_for_trading` trade function. */
export function enchantBookForTrading(options?: {
  baseCost?: number;
  baseRandomCost?: number;
  perLevelCost?: number;
  perLevelRandomCost?: number;
}): TradeFunction {
  return {
    function: 'enchant_book_for_trading',
    ...(options?.baseCost !== undefined ? { base_cost: options.baseCost } : {}),
    ...(options?.baseRandomCost !== undefined ? { base_random_cost: options.baseRandomCost } : {}),
    ...(options?.perLevelCost !== undefined ? { per_level_cost: options.perLevelCost } : {}),
    ...(options?.perLevelRandomCost !== undefined
      ? { per_level_random_cost: options.perLevelRandomCost }
      : {}),
  };
}