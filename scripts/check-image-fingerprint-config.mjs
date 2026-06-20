#!/usr/bin/env node

import fs from "node:fs";

const dockerBuildCheck = fs.readFileSync(".github/workflows/docker-build-check.yaml", "utf8");
const buildAndDeploy = fs.readFileSync(".github/workflows/build-and-deploy.yaml", "utf8");
const values = fs.readFileSync("k8s/values.yaml", "utf8");

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: expected to find ${JSON.stringify(needle)}`);
  }
}

function assertNotIncludes(text, needle, label) {
  if (text.includes(needle)) {
    throw new Error(`${label}: unexpected SHA-tagging surface ${JSON.stringify(needle)}`);
  }
}

assertIncludes(dockerBuildCheck, "scripts/image-fingerprint.sh", "docker-build-check");
assertIncludes(dockerBuildCheck, "steps.fingerprint.outputs.proof_tag", "docker-build-check");
assertIncludes(dockerBuildCheck, "romainecr.azurecr.io/kill-me:${{ steps.fingerprint.outputs.proof_tag }}", "docker-build-check");
assertIncludes(dockerBuildCheck, "sha-${{ steps.source.outputs.sha }}", "docker-build-check");
assertNotIncludes(dockerBuildCheck, "ci-pr-", "docker-build-check");
assertNotIncludes(dockerBuildCheck, "ci-ref-", "docker-build-check");
assertIncludes(dockerBuildCheck, "az acr import --name romainecr", "docker-build-check");
assertNotIncludes(dockerBuildCheck, "IMAGE_TAG:", "docker-build-check");
assertNotIncludes(dockerBuildCheck, "romainecr.azurecr.io/kill-me:${{ env.IMAGE_TAG }}", "docker-build-check");

assertIncludes(buildAndDeploy, "scripts/image-fingerprint.sh", "build-and-deploy");
assertIncludes(buildAndDeploy, "ALIAS_TAG=app-${fingerprint}", "build-and-deploy");
assertIncludes(buildAndDeploy, "romainecr.azurecr.io/kill-me:${{ env.ALIAS_TAG }}", "build-and-deploy");
assertIncludes(buildAndDeploy, "ci-ref-${ref_hash}-run-${GITHUB_RUN_ID}-attempt-${GITHUB_RUN_ATTEMPT}", "build-and-deploy");
assertIncludes(buildAndDeploy, "az acr import --name romainecr", "build-and-deploy");
assertNotIncludes(buildAndDeploy, 'TAG="${GITHUB_SHA::7}"', "build-and-deploy");
assertNotIncludes(buildAndDeploy, '--build-arg BUILD_NUMBER="${TAG}"', "build-and-deploy");
assertNotIncludes(buildAndDeploy, "tag: \\\"${{ env.TAG }}\\\"", "build-and-deploy");

assertIncludes(values, "content fingerprint", "k8s values");
if (!/^  tag: "app-[a-f0-9]{64}"$/m.test(values)) {
  throw new Error("k8s values: image.tag must be pinned to app-<64 hex content fingerprint>");
}

console.log("image fingerprint workflow config OK");
