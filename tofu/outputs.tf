output "resource_group_name" {
  value       = azurerm_resource_group.workout.name
  description = "Name of the resource group"
}

output "cosmos_db_name" {
  value       = data.azurerm_cosmosdb_account.infra.name
  description = "Cosmos DB account name"
}

output "cosmos_db_database_name" {
  value       = azurerm_cosmosdb_sql_database.workout.name
  description = "Cosmos DB database name"
}

output "cosmos_db_container_name" {
  value       = azurerm_cosmosdb_sql_container.workouts.name
  description = "Cosmos DB container name for workouts"
}

output "cosmos_db_endpoint" {
  value       = data.azurerm_cosmosdb_account.infra.endpoint
  description = "Cosmos DB account endpoint URL"
}

output "app_config_endpoint" {
  value       = data.azurerm_app_configuration.infra.endpoint
  description = "Azure App Configuration endpoint URL"
}
