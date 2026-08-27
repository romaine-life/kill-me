# 0004: Give deployed application builds semantic release identity

- Status: Accepted
- Date: 2026-08-27
- Deciders: Nelson

## Context

The application displayed a full Git commit SHA inside the signed-in account menu.
That value identified a build for developers, but did not tell a person which
release was running, when it was deployed, or whether an already-open tab was stale.
It was also coupled to authentication even though deployment identity is public,
application-wide state.

The SHA was not fully trustworthy as a release identity. Pull-request CI publishes
the canonical content-fingerprint image, and the main deployment deliberately reuses
that exact image when the merged source has the same fingerprint. The embedded SHA
could therefore name the PR commit rather than the equivalent merge commit.

Three unrelated SemVer-shaped values already existed in package and Helm metadata,
but none was bumped, tagged, released, deployed, or displayed. They did not form an
application-version system.

## Decision

- Use immutable Git tags named `vMAJOR.MINOR.PATCH` as the source of truth for
  application releases.
- Require exactly one semantic-release label on every PR: `release:major`,
  `release:minor`, `release:patch`, or `release:none`.
- Establish `v1.0.0` as the first truthful baseline when the versioned release
  workflow first reaches `main`; do not invent retrospective releases.
- Have the main deployment workflow calculate the next version, create its tag and
  GitHub release, and store the deployed version and timestamp beside the immutable
  image tag in Helm values.
- Pass the content-fingerprint image tag—not a Git SHA—into the frontend as its
  build identity. This remains stable when a PR-built image is reused after merge.
- Expose the running version, deployment time, and build identity from a public,
  non-cached `/api/version` endpoint.
- Show the semantic version and deployment time in the shared sidebar for all users.
  If the loaded frontend build differs from the running server image, replace that
  status with a reload action.
- Keep package versions and Helm chart versions explicitly separate from the
  application release number.

## Version policy

- **Major**: an incompatible data/workflow change or fundamental product redesign.
- **Minor**: a new user-visible capability.
- **Patch**: a bug fix, compatibility fix, or user-facing polish.
- **None**: documentation or infrastructure-only work that does not change the
  application release.

## Consequences

- A deployed release now has a human identity, timestamp, release history, and notes.
- Release intent is reviewed on the PR rather than inferred from commit text.
- Existing browser tabs can reliably detect that a new image is serving traffic.
- PR image reuse remains intact because semantic version is runtime deployment
  metadata and client freshness uses the immutable content fingerprint.
- A missing or ambiguous release label fails CI and the deployment workflow rather
  than silently publishing an incorrectly versioned release.

## Alternatives considered

### Continue displaying a shortened Git SHA

Rejected because shortening a machine identifier does not make it a meaningful
release number and PR image reuse makes its relationship to `main` confusing.

### Manually edit a `VERSION` file in every PR

Rejected because concurrent PRs collide and a forgotten edit silently creates an
unversioned deployment. A reviewed bump label plus merge-time calculation is both
explicit and automatable.

### Treat npm or Helm package versions as the application version

Rejected because the two private npm packages and the Helm chart have different
packaging lifecycles. The deployed application is the single frontend/backend image,
so its release identity belongs to that deployment rather than any one package.
