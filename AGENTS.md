# kill-me

Read `CLAUDE.md` for the project architecture and domain notes.

## Container Build Verification

Agent pods are not expected to have Docker. Do not report missing local Docker
as a blocker. Run available repo checks first, then use PR CI as the normal
container build gate: `.github/workflows/docker-build-check.yaml` builds the
app image. Same-repo PRs and manual dispatches publish the canonical
content-fingerprint tag (`romainecr.azurecr.io/kill-me:app-<sha256>`); fork PRs
stay build-only with `push: false`. Release/deploy workflows publish or reuse
that same fingerprint tag and bump `k8s/values.yaml` to it.
