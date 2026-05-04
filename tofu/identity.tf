# ============================================================================
# Workload identity for kill-me
# ============================================================================
# Replaces kill-me's prior reuse of infra-shared-identity (which holds
# Cosmos Data Contributor at *account* scope, KV Secrets User vault-wide,
# Storage Blob Data Contributor at subscription scope — every shared-
# identity app could read every other app's data plane). This identity
# is scoped to kill-me's actual surface only:
#
#   - Cosmos DB Data Contributor on dbs/WorkoutTrackerDB
#   - Key Vault Secrets User on the one secret config.js reads
#     (api-jwt-signing-secret) — narrow, not vault-wide
#   - App Configuration Data Reader at the store level — necessary
#     because config.js calls listConfigurationSettings() to enumerate
#     `*/microsoft_oauth_client_id` keys and there's no per-key RBAC
#
# Pattern mirrors tank-operator/infra/{api_proxy,credential_refresher}.tf
# and glimmung/tofu/identity.tf.
# ============================================================================

data "azurerm_resource_group" "infra" {
  name = local.infra.resource_group_name
}

resource "azurerm_user_assigned_identity" "kill_me" {
  name                = "kill-me-identity"
  resource_group_name = data.azurerm_resource_group.infra.name
  location            = data.azurerm_resource_group.infra.location
}

# Cosmos data plane scope path: `<account>/dbs/<name>`, NOT the ARM
# resource ID format `<account>/sqlDatabases/<name>` that
# `azurerm_cosmosdb_sql_database.workout.id` returns. The Cosmos service
# rejects the ARM form with "Expected path segment [dbs] at position [0]
# but found [sqlDatabases]."
resource "azurerm_cosmosdb_sql_role_assignment" "kill_me_cosmos" {
  resource_group_name = local.infra.resource_group_name
  account_name        = data.azurerm_cosmosdb_account.infra.name
  role_definition_id  = "${data.azurerm_cosmosdb_account.infra.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_user_assigned_identity.kill_me.principal_id
  scope               = "${data.azurerm_cosmosdb_account.infra.id}/dbs/${azurerm_cosmosdb_sql_database.workout.name}"
}

# KV: narrowed to the single secret config.js reads. If the backend later
# reads another secret, add a sibling role assignment here rather than
# widening to vault scope.
resource "azurerm_role_assignment" "kill_me_kv_jwt_secret" {
  scope                = "${data.azurerm_key_vault.main.id}/secrets/api-jwt-signing-secret"
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.kill_me.principal_id
}

# App Config: store-level Data Reader. Narrowing isn't possible because
# config.js enumerates keys via listConfigurationSettings() to discover
# every `*/microsoft_oauth_client_id` registration — App Configuration
# RBAC doesn't have a "read keys matching prefix" primitive.
resource "azurerm_role_assignment" "kill_me_appconfig" {
  scope                = data.azurerm_app_configuration.infra.id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = azurerm_user_assigned_identity.kill_me.principal_id
}

resource "azurerm_federated_identity_credential" "kill_me" {
  name                = "aks-kill-me"
  resource_group_name = local.infra.resource_group_name
  parent_id           = azurerm_user_assigned_identity.kill_me.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = var.cluster_oidc_issuer_url
  subject             = "system:serviceaccount:kill-me:infra-shared"
}

output "kill_me_identity_client_id" {
  value       = azurerm_user_assigned_identity.kill_me.client_id
  description = "client_id of kill-me-identity. Pin into k8s/serviceaccount.yaml's azure.workload.identity/client-id annotation."
}
