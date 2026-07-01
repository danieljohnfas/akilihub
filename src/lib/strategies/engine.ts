export interface Strategy<TInput, TOutput> {
  name: string;
  execute: (input: TInput) => Promise<TOutput>;
}

export class StrategyEngine<TInput, TOutput> {
  private strategies: Strategy<TInput, TOutput>[];

  constructor(strategies: Strategy<TInput, TOutput>[]) {
    if (strategies.length === 0) {
      throw new Error("StrategyEngine requires at least one strategy.");
    }
    this.strategies = strategies;
  }

  /**
   * Executes strategies in sequential order until one succeeds.
   * Throws an error if all strategies fail.
   */
  async executeWithFallback(input: TInput): Promise<{ result: TOutput; strategyUsed: string }> {
    const errors: Error[] = [];

    for (const strategy of this.strategies) {
      try {
        console.log(`[StrategyEngine] Attempting strategy: ${strategy.name}`);
        const result = await strategy.execute(input);
        console.log(`[StrategyEngine] Strategy ${strategy.name} succeeded.`);
        return { result, strategyUsed: strategy.name };
      } catch (error) {
        console.warn(`[StrategyEngine] Strategy ${strategy.name} failed:`, error);
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    throw new Error(`All strategies failed. Errors: \n${errors.map(e => e.message).join('\n')}`);
  }
}
