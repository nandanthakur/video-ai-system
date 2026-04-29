# Kubernetes Installation Guide (Ubuntu Server with GPU)

This guide covers setting up a Kubernetes cluster on Ubuntu with NVIDIA GPU support for AI inference workloads.

## Prerequisites

- Ubuntu 22.04 LTS Server (minimum 3 nodes)
- NVIDIA GPU (RTX 3090/4090, A100, or T4)
- Minimum 16 cores, 64GB RAM, 1TB SSD per node
- Network connectivity between nodes

---

## 1. Prepare All Nodes

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 1.2 Disable Swap
```bash
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab
```

### 1.3 Install GPU Driver
```bash
sudo apt install -y nvidia-driver-535 nvidia-utils-535
sudo reboot

# Verify driver
nvidia-smi
```

### 1.4 Install Container Toolkit
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -fsSL https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt update
sudo apt install -y nvidia-container-toolkit

# Configure Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 1.5 Install Kubernetes Packages
```bash
sudo apt install -y apt-transport-https ca-certificates curl

# Add Kubernetes repo
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-archive-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | \
    sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

---

## 2. Initialize Master Node

```bash
# On master node only
sudo kubeadm init --pod-network-cidr=192.168.0.0/16 --service-cidr=10.96.0.0/12

# Setup kubeconfig
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

---

## 3. Install GPU Operator

### 3.1 Install NVIDIA Device Plugin
```bash
# Deploy NVIDIA Device Plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/master/nvidia-device-plugin.yml

# Verify
kubectl get pods -n kube-system | grep nvidia
```

### 3.2 Install NVIDIA GPU Operator (Alternative)
```bash
# Add Helm repo
helm repo add nvidia-device-plugin \
  https://nvidia.github.io/gpu-device-plugin

# Create namespace
kubectl create namespace gpu-operator

# Install via Helm
helm install nvidia-device-plugin nvidia-device-plugin/gpu-device-plugin \
  --namespace gpu-operator \
  --set arch=ampere
```

---

## 4. Join Worker Nodes

```bash
# On master, get join command
kubeadm token create --print-join-command

# On each worker node, run:
# (use the output from above)
sudo kubeadm join <master-ip>:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

---

## 5. Install Container Network (CNI)

```bash
# Install Calico
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml

# Verify
kubectl get pods -n calico-system
```

---

## 6. Deploy Video AI System

### 6.1 Create Namespace
```bash
kubectl create namespace video-ai
```

### 6.2 Create Secrets
```bash
kubectl create secret generic postgres-credentials \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  -n video-ai

kubectl create secret generic minio-credentials \
  --from-literal=MINIO_ACCESS_KEY=minioadmin \
  --from-literal=MINIO_SECRET_KEY=minioadmin \
  -n video-ai

kubectl create secret generic milestone-credentials \
  --from-literal=MILESTONE_PASSWORD=your-password \
  -n video-ai
```

### 6.3 Apply Deployments
```bash
# Primary API
kubectl apply -f kubernetes/overlays/prod/primary-api.yml

# VMS Bridge
kubectl apply -f kubernetes/overlays/prod/vms-bridge.yml

# Web App
kubectl apply -f kubernetes/overlays/prod/web-app.yml

# Temporal Worker with GPU
kubectl apply -f kubernetes/overlays/prod/temporal.yml
```

### 6.4 Verify GPU Allocation
```bash
# Check GPU nodes
kubectl get nodes -l nvidia.com/gpu.present=true

# Check GPU in pods
kubectl exec -it <pod-name> -- nvidia-smi
```

---

## 7. Install Monitoring

### 7.1 Prometheus Operator
```bash
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=15d \
  --set grafana.persistence.enabled=true
```

### 7.2 NVIDIA DCGM Exporter
```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/master/k8s/dcgm-exporter.yaml

# Verify
kubectl get pods -n monitoring | grep dcgm
```

---

## 8. Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: temporal-worker-hpa
  namespace: video-ai
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: temporal-worker
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Pods
    pods:
      metric:
        name: kafka_consumer_group_lag
      target:
        type: AverageValue
        averageValue: "50"
  - type: Resource
    resource:
      name: nvidia.com/gpu
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 9. Troubleshooting

### Check GPU Status
```bash
# On node
nvidia-smi

# In cluster
kubectl get nodes -o json | jq '.items[].status.allocatable | with_entries(select(.key | startswith("nvidia")))'

# In pod
kubectl exec -it <pod> -- nvidia-smi
```

### Check GPU Available
```bash
# Check device plugin
kubectl describe pod <nvidia-device-plugin-pod> -n kube-system

# View logs
kubectl logs -n kube-system ds/nvidia-device-plugin-daemonset
```

### Common Issues

| Issue | Solution |
|-------|----------|
| GPU not detected | Verify nvidia-smi on node, restart kubelet |
| Pod pending | Check taints: `kubectl describe node` |
| OOMKilled | Increase GPU memory requests |

---

## 10. Optional: GPU Sharing (Time Slicing)

```yaml
apiVersion: node.k8s.io/v1
kind: Node
metadata:
  name: gpu-node-1
spec:
  taints:
  - key: nvidia.com/gpu
    value: shared
    effect: NoSchedule
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-worker
spec:
  template:
    spec:
      containers:
      - name: worker
        resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            nvidia.com/gpu: 1
```

---

## Quick Commands Reference

```bash
# Join node
kubeadm token create --print-join-command

# Check nodes
kubectl get nodes -o wide

# Check GPU pods
kubectl get pods -n video-ai

# View logs
kubectl logs -f deployment/temporal-worker -n video-ai

# Scale
kubectl scale deployment/temporal-worker --replicas=3 -n video-ai

# Restart
kubectl rollout restart deployment/temporal-worker -n video-ai
```