const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const clean = (value) => typeof value === 'string' ? value.trim() : '';

export function getVersionInfo(env = process.env) {
  const configuredVersion = clean(env.APP_VERSION);
  const version = SEMVER.test(configuredVersion) ? configuredVersion : '0.0.0-dev';
  const buildId = clean(env.APP_BUILD_ID) || 'dev';
  const configuredDate = clean(env.APP_DEPLOYED_AT);
  const deployedAt = configuredDate && !Number.isNaN(Date.parse(configuredDate))
    ? new Date(configuredDate).toISOString()
    : null;

  return { version, deployedAt, buildId };
}
