# 0005: Number releases by merge, like every home repository

- Status: Accepted
- Date: 2026-11-16
- Deciders: Nelson
- Supersedes: [0004](0004-semantic-application-releases.md)

## Context

Decision 0004 numbered releases semantically from a label on every PR. Home CI moved to
shared suites (pipeline-templates, PIPT-12), where every repository's releases are numbered
`prefix.N`: each merge that changes the application takes the next number. Nelson decided
every repository falls in line, kill-me included.

## Decision

Releases are `v1.5.N`, continuing above the last semantic release (v1.4.5). PRs carry no
release label. The build identity the frontend compares with the server is the release tag,
baked into the image, instead of the content fingerprint; the pin PR records the version
and release time in Helm values for the version display.

## Consequences

- A release still has a human identity, a time and a Forgejo release.
- The number no longer says whether a release is a fix or a feature.
- PRs no longer build or publish candidate images, so nothing reuses a PR-built image
  after merge, and the content fingerprint that made that reuse safe is gone.
