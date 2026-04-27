# Node.js App → AWS EKS via Jenkins + Terraform

End-to-end CI/CD pipeline that builds nodejs-app (Node.js 20 (Express)), runs the full DevSecOps gate (SAST + SCA + image scanning), pushes to AWS ECR, and deploys to AWS EKS via Helm. The EKS cluster + supporting infra is provisioned by Terraform in the same repo.

---

## What this repo gives you

```
├── src/                     ← nodejs-app application source
├── node-js-helm-chart/          ← Helm chart for the app
├── kubernetes/              ← raw k8s manifests (alternative to Helm)
├── Terraform/               ← AWS EKS + VPC + IAM + ECR provisioning
├── Dockerfile               ← multi-stage container build
├── Jenkinsfile              ← 14-stage pipeline (see below)
└── script.groovy            ← Jenkinsfile step bodies (modular)
```

---

## CI/CD pipeline (`Jenkinsfile` + `script.groovy`)

| Stage | Tool | Purpose |
|---|---|---|
| 1. Checkout | git | pull source |
| 2. OWASP FS Scan | OWASP Dependency-Check | SCA on dependencies |
| 3. SonarQube Analysis | SonarQube | SAST + quality gate |
| 4. Trivy FS Scan | Trivy | filesystem CVE + secret scan |
| 5. Code Compile | npm (
pm ci && npm run build) | compile sources |
| 6. Build Application | npm (
pm ci && npm run build) | produce artefact |
| 7. Docker Image | docker build | container image |
| 8. Trivy Image Scan | Trivy | image CVE scan |
| 9. Grype Image Scan | Grype | second image scanner |
| 10. Syft Image Scan | Syft | SBOM (CycloneDX) |
| 11. Docker Scout Scan | Docker Scout | layer + base-image analysis |
| 12. ECR login + push | aws ecr | push tagged image |
| 13. Helm deploy | helm upgrade --install | deploy to EKS |
| 14. Cleanup | docker logout, deleteDir | tidy agent workspace |

Failures at any scan stage fail the build before deployment.

---

## Prerequisites

1. AWS Administrator credential available on the Jenkins agent (`~/.aws/credentials` or instance profile).
2. EC2 key pair name set in `Terraform/terraform.tfvars`.
3. ECR repository named `nodejs-image` in account `873330726955` / region `us-east-1` (or update env block in `Jenkinsfile`).
4. Jenkins master + agent reachable. The Jenkins/agent infra can be provisioned by [`jenkins-k8s-with-terraform-gcp`](https://github.com/prabhat-roy/jenkins-k8s-with-terraform-gcp) (GCP) or stood up manually.
5. Tools on the Jenkins agent: `docker`, `kubectl`, `helm`, `aws` v2, `trivy`, `grype`, `syft`, `mvn`/`npm`/`pip` as appropriate.

---

## One-time setup

```bash
# 1. Provision the EKS cluster + ECR + IAM
cd Terraform
terraform init
terraform apply -auto-approve

# 2. Hook kubectl + Helm to the cluster
aws eks update-kubeconfig --region us-east-1 --name <cluster-name>
helm version
```

---

## Run the pipeline

Create a Jenkins pipeline job that points to this repo's `Jenkinsfile`. Trigger the build — every stage runs in order.

After success: app is live at the LoadBalancer hostname printed by `kubectl get svc -n <namespace>`.

---

## Tear down

```bash
helm uninstall nodejs-app -n <namespace>
cd Terraform && terraform destroy -auto-approve
```