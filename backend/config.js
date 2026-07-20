// Loads runtime config from Azure App Configuration at startup. Workload
// identity (the pod's ServiceAccount is federated to kill-me-identity in
// tofu/identity.tf) supplies the credential.
//
// No more Key Vault read here — auth.romaine.life owns sessions, so this
// backend doesn't sign anything and doesn't need a per-app signing secret.
import { AppConfigurationClient } from '@azure/app-configuration';
import { DefaultAzureCredential } from '@azure/identity';

export async function fetchConfig() {
  // Local dev: a directly-provided Cosmos endpoint skips the App Config lookup
  // (which needs App Config Data Reader). Combine with `az login` for Cosmos.
  if (process.env.COSMOS_DB_ENDPOINT) {
    return { cosmosDbEndpoint: process.env.COSMOS_DB_ENDPOINT };
  }

  const appConfigEndpoint = process.env.AZURE_APP_CONFIG_ENDPOINT;
  if (!appConfigEndpoint) throw new Error('AZURE_APP_CONFIG_ENDPOINT unset');

  const credential = new DefaultAzureCredential();
  const appConfig = new AppConfigurationClient(appConfigEndpoint, credential);

  const cosmosEndpoint = await appConfig.getConfigurationSetting({ key: 'cosmos_db_endpoint' });

  return {
    cosmosDbEndpoint: cosmosEndpoint.value,
  };
}
