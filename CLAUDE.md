# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@flexops/sdk` is the **official hand-crafted Node/TypeScript SDK** for the FlexOps Platform. It targets the FlexOps **Gateway BFF**. Published to npm as `@flexops/sdk`; current version `1.0.2`.

> **Gateway-targeted, not VSCS-targeted.** All hand-crafted SDKs in this family (.NET, Node, Python, Go, PHP, Ruby) hit Gateway. The Java SDK is the lone exception — it was auto-generated against VisionSuiteCoreServices and is archived as of 2026-03-08.

## Build & Run Commands

```powershell
npm install                     # Install dependencies
npm run preprocess              # Preprocess specs (scripts/preprocess-specs.mjs)
npm run build                   # Build to dist/ (ESM + CJS + types)
npm run test                    # Vitest
npm run typecheck               # tsc --noEmit
```

## Architecture

```text
Customer Node/TS app  →  @flexops/sdk (this repo)  →  Gateway BFF (gateway.flexops.io)
                                                       ↓
                                                       VSCS / Integrations / etc.
```

## Key Directories

| Path | Purpose |
|---|---|
| `src/` | TypeScript source — client, models, errors |
| `specs/` | OpenAPI spec snapshots used for type generation/validation |
| `scripts/preprocess-specs.mjs` | Spec preprocessing before build |
| `tests/` | Vitest specs |
| `dist/` | Build output (ESM + CJS + d.ts) — gitignored |

## Conventions

- **TypeScript strict** mode; ESM-first with CJS bridge in `dist/`.
- Models are typed; the SDK exposes both a low-level client (escape hatch) and a typed surface.
- Errors come back as typed exception classes carrying Gateway's error envelope — don't throw plain `Error`.

## Publish

GitHub Actions handles npm publish via **OIDC trusted publishing** (no long-lived `NPM_TOKEN`). Bump `version` in `package.json`, tag, push — the workflow does the rest.

## Related Repositories

| Repository | Purpose |
|---|---|
| **This repo** | `@flexops/sdk` on npm |
| FlexOps Gateway | The HTTP API this SDK calls — `BillEisenman/FlexOpsGateway` |
| `@flexops/elements` | Sibling React widgets package — `BillEisenman/flexops-sdk-elements` |
| `@flexops/cli` | Sibling terminal CLI — `BillEisenman/flexops-cli` |
| Sibling SDKs | `FlexOps.Sdk` (.NET), `flexops` (Python/Ruby), `flexops/sdk` (PHP), `flexops-sdk-go` (Go) |
| FlexOps Developer Docs | Hosts the SDK page — `BillEisenman/FlexOpsDeveloperDocs` |
