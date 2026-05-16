variable "location" {
  description = "Azure region where the resource group will be created"
  type        = string
  default     = "westus2"
}

# Pinned to the AKS cluster's current OIDC issuer URL. The cluster lives in
# a dedicated subscription (606a1ca1, "romaine-life"); this tofu stack runs
# in another (aee0cbd2, "Azure subscription 1"), so we can't read the live
# value via `data "azurerm_kubernetes_cluster"` without cross-subscription
# Reader on the CI principal — which we don't have today. Bump this value
# whenever infra-bootstrap rebuilds the cluster.
variable "cluster_oidc_issuer_url" {
  description = "OIDC issuer URL for the active AKS cluster used for workload identity federation"
  type        = string
  default     = "https://westus2.oic.prod-aks.azure.com/2236b5e4-81d2-4d82-bde5-17b1037999ea/5aced6d5-4299-421b-84a9-6638aebbf4f0/"
}
