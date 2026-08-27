#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const BUMPS = new Set(['major', 'minor', 'patch', 'none']);

export function nextAppVersion(current, bump) {
  const match = SEMVER.exec(current || '');
  if (!match) throw new Error(`Current version must be stable SemVer (received ${JSON.stringify(current)})`);
  if (!BUMPS.has(bump)) throw new Error(`Bump must be major, minor, patch, or none (received ${JSON.stringify(bump)})`);

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else if (bump === 'patch') {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    console.log(nextAppVersion(process.argv[2], process.argv[3]));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
