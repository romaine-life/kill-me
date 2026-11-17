# kill-me

Read `CLAUDE.md` for the project architecture and domain notes.

## Container Build Verification

Agent pods are not expected to have Docker. Do not report missing local Docker
as a blocker. Run available repo checks first (`ci-check` runs the suites' local
checks), then use PR CI as the container build gate: the web-app suite builds the image
and runs its `--self-test` on a PR. Only a merge to main publishes an image.
