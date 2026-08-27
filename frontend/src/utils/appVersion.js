/* global __APP_BUILD_ID__ */

export const CLIENT_BUILD_ID = typeof __APP_BUILD_ID__ === 'undefined'
  ? 'dev'
  : __APP_BUILD_ID__;

export function displayVersion(version) {
  if (!version || version.includes('-dev')) return 'Development build';
  return `Running v${version}`;
}

export function isUpdateAvailable(serverBuildId, clientBuildId = CLIENT_BUILD_ID) {
  if (!serverBuildId || serverBuildId === 'dev' || clientBuildId === 'dev') return false;
  return serverBuildId !== clientBuildId;
}

export function formatDeploymentTime(value, locale, timeZone) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
