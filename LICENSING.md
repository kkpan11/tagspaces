# Licensing

This document is the canonical description of how TagSpaces is licensed. It
explains the dual-license model, the boundary between the open-source core and
the proprietary Pro components, and why the packaged applications (which combine
both) may be distributed by TagSpaces GmbH.

## Summary

- The **open-source core** of TagSpaces is licensed under the **GNU Affero
  General Public License, version 3 (AGPL-3.0)** — see [LICENSE.txt](LICENSE.txt).
- TagSpaces GmbH is the **copyright holder** of the core and offers it under a
  **dual license**: AGPL-3.0 **or** a separate **commercial license** for
  vendors, resellers, and anyone who cannot accept the AGPL's obligations.
- The **TagSpaces Pro** components are **proprietary** (not AGPL) and are
  governed by the Pro **End User License Agreement (EULA)**.
- Third-party open-source dependencies keep their own licenses; their full texts
  are bundled and disclosed (see [Third-party software](#third-party-software)).

## Component boundary

| Component | Location | License |
| --- | --- | --- |
| TagSpaces core (app, renderer, main, shared libs) | this repository, except `tagspacespro/` | **AGPL-3.0** (© TagSpaces GmbH) |
| TagSpaces Pro module | `tagspacespro/` → published as `@tagspacespro/tagspacespro` | **Proprietary** — © TagSpaces GmbH, all rights reserved; governed by `tagspacespro/EULA.txt` |
| Third-party dependencies & bundled extensions | `node_modules/`, `@tagspaces/extensions` | Their respective upstream licenses (see below) |

Every source file carries a header identifying its license: AGPL-3.0 for core
files, "all rights reserved" for Pro files. The header is authoritative for the
individual file.

## Dual license (the core)

Because TagSpaces GmbH holds the copyright to the core, it may license that same
code under more than one set of terms:

1. **AGPL-3.0** — for open-source use. You may use, study, modify, and
   redistribute the core under the terms of [LICENSE.txt](LICENSE.txt),
   including the AGPL's source-availability and network-use (§13) obligations.
2. **Commercial license** — for organizations that want to use, embed, or
   redistribute TagSpaces without the AGPL's copyleft obligations. Contact
   TagSpaces GmbH for terms.

Contributions are accepted under a Contributor License Agreement that preserves
this dual-licensing ability — see [Contributions](#contributions).

## Proprietary Pro components

The code under `tagspacespro/` (distributed as `@tagspacespro/tagspacespro`) is
**not** covered by the AGPL. It is proprietary to TagSpaces GmbH, its source is
not published, and end-user rights to it are granted solely under the Pro EULA
(`tagspacespro/EULA.txt`). Pro features are unlocked via license key or in-app
purchase.

## Combined distributions (why the packaged apps are lawful)

The packaged **Lite** builds contain only the AGPL core. The packaged **Pro**
builds (desktop, and mobile where Pro is unlocked via in-app purchase) contain
**both** the AGPL core and the proprietary Pro module in a single binary.

A *third party* combining AGPL-licensed code with proprietary code and
distributing the result would generally have to release the whole combined work
under the AGPL. That restriction does not bind the **copyright holder**:
TagSpaces GmbH owns the core and therefore may combine it with its own
proprietary Pro module and distribute the result, licensing the core under its
commercial terms and the Pro module under the EULA. This is the standard
"open-core / dual-license" model and is the basis on which the Pro builds and
the App Store / Play Store distributions are shipped.

## Source availability (AGPL compliance)

The corresponding source for the AGPL core is this public repository:
<https://github.com/tagspaces/tagspaces>. The application also links to it
in-app (About → Source Code) and displays the applicable license text in-app
(About → License: the AGPL for Lite, the EULA for Pro).

## Third-party software

TagSpaces bundles third-party open-source packages, each under its own license.
The complete, generated list of those packages and their full license texts is
in [`src/renderer/third-party.txt`](src/renderer/third-party.txt) (regenerated
with the `generate-license-file` tool) and is shown in-app under
**About → Software Acknowledgements**. There is no separate notices file; that
generated file is the authoritative third-party disclosure.

## Trademarks

The names "TagSpaces", the TagSpaces logo, and related marks are trademarks of
TagSpaces GmbH. The open-source license covers the **code**, not the marks:
forks and redistributions may use the code under the AGPL but must not use the
TagSpaces name or logo in a way that implies endorsement or that could cause
confusion, except as permitted by applicable trademark law.

## Contributions

Contributions are accepted under the Contributor License Agreement published at
<https://www.tagspaces.org/contribute/>. Signing it grants TagSpaces GmbH the
right to distribute your contribution under **both** the AGPL and the commercial
license, which is what keeps the dual-license model intact. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.
