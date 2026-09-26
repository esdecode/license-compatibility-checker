# Contributing

Thanks for helping improve `@esdecode/license-checker`.

## Ground rules

- **Cite a source for every legal fact.** Licence facts and compatibility results must come from the official licence text, SPDX, the Open Source Initiative, the FSF/GNU Project, or the licence steward (Apache, Mozilla, Eclipse, the vendor of a source-available licence). Blog posts and summaries are not sufficient on their own.
- **Do not invent rules.** If an outcome depends on facts the engine cannot see, return `WARNING` or `REVIEW` rather than a confident answer.
- **Never make a test pass by turning uncertainty into an optimistic result.** `UNKNOWN` stays `UNKNOWN`.
- **No UI or framework code.** The package must stay independent of React, Next.js, databases and HTTP.
- **Wording:** prefer "generally", "may require", "depending on how the component is combined". Never "guaranteed", "100% legal" or "definitely safe".

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run verify:exports
```

## Pull requests

1. Open an issue first for new licences or changed compatibility conclusions, with links to the sources.
2. Add or update tests: rule-level tests in `tests/compatibility/rules.test.ts` and scenario tests in `tests/compatibility/important-cases.test.ts`.
3. Update `CHANGELOG.md` under "Unreleased".
4. Changing a compatibility conclusion is a behaviour change; describe it clearly in the PR.

See the README sections "Adding a licence" and "Adding a rule" for the mechanics.
