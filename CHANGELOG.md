# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.2] - 2026-09-26

### Fixed

- `analyzeSourceCodeAcquisition()` no longer reports the main project licence twice in a section; sections now combine the main-licence check with third-party findings only.

## [0.1.1] - 2026-09-26

### Fixed

- Added a `default` export condition so CommonJS consumers (and tools such as `tsx` running CJS) can load the package via native `require(esm)`.

## [0.1.0] - 2026-09-26

### Added

- Knowledge base of 21 licences with structured facts and authoritative sources: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, LGPL-2.1, LGPL-3.0, GPL-2.0, GPL-3.0, AGPL-3.0, EPL-2.0, CDDL-1.0, Unlicense, CC0-1.0, BUSL-1.1, SSPL-1.0, Elastic-2.0, Proprietary, Unknown, Custom.
- `checkCompatibility()`: directional rule engine with 12 scenarios, 9 result dimensions and rule-ID diagnostics.
- Pair exceptions for Apache-2.0/GPL-2.0, GPL version 2/3, GPL-3.0/AGPL-3.0, LGPL to GPL, MPL-2.0 secondary licences, EPL-2.0 and CDDL-1.0.
- `analyzeProject()`: multi-licence analysis with per-section risk levels.
- `analyzeSourceCodeAcquisition()`: acquisition risk report and seller questions.
- Parsers for `package.json`, `package-lock.json` (v2/v3), `composer.json`, `composer.lock` and `yarn.lock` (v1), plus an SPDX expression parser and declared-licence resolver.
