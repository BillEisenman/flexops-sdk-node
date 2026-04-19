# Changelog

All notable changes to the FlexOps Node.js/TypeScript SDK are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- README: added a curl quickstart section so developers can verify the FlexOps API before committing to the SDK.
- Retargeted repository URL references to `github.com/BillEisenman/flexops-sdk-node` (organization migration from `FlexOps/`).

## [1.0.0] - 2026-03-08

### Added
- Initial public release.
- High-level shipping operations: rate shopping, label creation, tracking, batch labels, cancel.
- Full TypeScript type definitions, ESM and CommonJS support, zero external runtime dependencies.
- Direct carrier access for USPS, UPS, FedEx, and DHL (214 VisionSuite endpoints proxied).
- JWT and API key authentication.
- Webhook signature verification (HMAC-SHA256).
- Automatic retry with exponential backoff.
- 20 resource services covering auth, workspaces, shipping, carriers, webhooks, wallet, insurance, returns, api keys, analytics, orders, inventory, pickups, scan forms, rules, offsets, HS codes, recurring shipments, email templates, and reports.
