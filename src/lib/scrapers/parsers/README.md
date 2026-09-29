# Legacy parsers (no longer used)

The `parser_*.js` files in this directory were LLM-generated **JavaScript** that the scraper used
to execute in `node:vm`. That was remote-code-execution-by-prompt-injection, so it has been
removed: parsers are now declarative CSS-selector specs cached in the `scraper_parsers` table
(see `../parser-spec.ts` and `../dom-cluster.ts`).

Nothing reads this directory any more. The files can be deleted:

    git rm -r src/lib/scrapers/parsers
