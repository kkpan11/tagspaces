# Contributing to TagSpaces

Thanks for your interest in improving TagSpaces! Contributions of all kinds are
welcome — bug fixes, features, tests, docs, and translations.

## Contributor License Agreement (required)

Before your first pull request can be merged, you must review and sign the
**Contributor License Agreement (CLA)**:

➡️ <https://www.tagspaces.org/content/tagspaces-cla-v2.pdf>

### Why the CLA matters

TagSpaces is **dual-licensed**: the open-source core is offered under the
AGPL-3.0 **and** under a separate commercial license (see
[LICENSING.md](LICENSING.md)). For that model to hold, TagSpaces GmbH must be
able to license _all_ of the code — including your contribution — under **both**
sets of terms.

By signing the CLA you grant TagSpaces GmbH the right to distribute your
contribution under both the AGPL and the commercial license, while you retain
copyright to your work. Without a signed CLA we cannot merge a contribution,
because it would break the project's ability to offer the commercial license.

## Development setup

```bash
npm install
npm run dev          # run the Electron app in development
npm run test         # tests
```

See [CLAUDE.md](CLAUDE.md) and the project documentation for the architecture,
the `tagspaces-common` monorepo, and platform-specific (web / Electron /
Capacitor) notes.

## Pull request guidelines

- Keep changes focused; one logical change per PR.
- Match the surrounding code style; the project is formatted with Prettier, so
  ensure your changes are Prettier-clean before submitting.
- Add or update tests where it makes sense (unit tests and/or Playwright e2e).
- Do not add new source files without the standard license header (AGPL-3.0 for
  core files).
- Reference any related issue in the PR description.

## Reporting bugs and requesting features

- Bugs: <https://github.com/tagspaces/tagspaces/issues>
- Feature requests: <https://tagspaces.discourse.group/c/feature-requests/6>

## Translations

Help translate TagSpaces on Transifex:
<https://explore.transifex.com/tagspaces/tagspaces/>

## License of contributions

Unless covered by other terms in the signed CLA, contributions to the core are
made under the [AGPL-3.0](LICENSE.txt) and, per the CLA, may also be distributed
by TagSpaces GmbH under its commercial license. See [LICENSING.md](LICENSING.md)
for the full licensing model.
