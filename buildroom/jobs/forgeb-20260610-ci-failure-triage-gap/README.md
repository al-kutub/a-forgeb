# Failure Lens — `forgeb-20260610-ci-failure-triage-gap`

Buildroom job metadata for PR-scoped CI triage with stage-aware log distillation.

Canonical Hermes source lives under `.hermes/buildroom/jobs/forgeb-20260610-ci-failure-triage-gap/` in the operator data plane. This directory mirrors the job contract into the product repo for validation and implementation.

## Allowed paths

- `packages/shared/types/ci-triage.ts`
- `packages/shared/fixtures/ci-triage/`
- `server/services/ci-triage/`
- `server/routes/failure-lens/`
- `ui/components/failure-lens/`

## Verification

```bash
pnpm -r typecheck
pnpm test --filter ci-triage
```
