# References to shared infrastructure provisioned by infra-bootstrap.
# Only resource names are stored here — full IDs and endpoints are resolved
# via data source lookups at plan time.

locals {
  infra = {
    resource_group_name = "infra"
    dns_zone_name       = "romaine.life"
  }
}

data "azurerm_cosmosdb_account" "infra" {
  name                = "infra-cosmos-serverless"
  resource_group_name = local.infra.resource_group_name
}

data "azurerm_app_configuration" "infra" {
  name                = "infra-appconfig"
  resource_group_name = local.infra.resource_group_name
}

# AKS cluster OIDC issuer URL comes from infra-bootstrap's state output.
# Can't read it directly from `data "azurerm_kubernetes_cluster"` here:
# the cluster lives in a dedicated subscription and our CI principal only
# has access to the app subscription — the data source 404s. The tfstate
# blob, on the other hand, is in this subscription's storage account and
# is already in our principal's reach. Pattern matches glimmung/tofu/remote-state.tf.
data "terraform_remote_state" "infra_bootstrap" {
  backend = "azurerm"

  config = {
    resource_group_name  = "infra"
    storage_account_name = "nelsontofu"
    container_name       = "tfstate"
    key                  = "infra-bootstrap.tfstate"
    use_oidc             = true
  }
}

locals {
  aks_oidc_issuer_url = data.terraform_remote_state.infra_bootstrap.outputs.aks_oidc_issuer_url
}
