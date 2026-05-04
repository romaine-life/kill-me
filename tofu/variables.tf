variable "location" {
  description = "Azure region where the resource group will be created"
  type        = string
  default     = "westus2"
}

variable "cluster_oidc_issuer_url" {
  description = "OIDC issuer URL for the active AKS cluster used for workload identity federation"
  type        = string
  default     = "https://westus2.oic.prod-aks.azure.com/2236b5e4-81d2-4d82-bde5-17b1037999ea/dca02d36-5485-474f-acfb-b2d897a982e1/"
}
