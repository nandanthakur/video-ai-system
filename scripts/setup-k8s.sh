#!/bin/bash
# Kubernetes Setup Script for Ubuntu with GPU Support
# Usage: sudo ./setup-k8s.sh [master|worker|join]

set -e

K8S_VERSION="1.29"
POD_CIDR="192.168.0.0/16"
SERVICE_CIDR="10.96.0.0/12"

echo "=== Kubernetes Setup for Ubuntu ==="

case "$1" in
  master)
    echo "[1/7] Updating system..."
    apt update && apt upgrade -y

    echo "[2/7] Disabling swap..."
    swapoff -a
    sed -i '/swap/d' /etc/fstab 2>/dev/null || true

    echo "[3/7] Installing NVIDIA driver..."
    apt install -y nvidia-driver-535 nvidia-utils-535
    
    echo "[4/7] Installing container toolkit..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
      gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -fsSL https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
      tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    apt update
    apt install -y nvidia-container-toolkit
    nvidia-ctk runtime configure --runtime=docker
    systemctl restart docker

    echo "[5/7] Installing Kubernetes..."
    apt install -y apt-transport-https ca-certificates curl
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/Release.key | \
      gpg --dearmor -o /etc/apt/keyrings/kubernetes-archive-keyring.gpg
    echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/ /" | \
      tee /etc/apt/sources.list.d/kubernetes.list
    apt update
    apt install -y kubelet kubeadm kubectl
    apt-mark hold kubelet kubeadm kubectl

    echo "[6/7] Initializing cluster..."
    kubeadm init --pod-network-cird=$POD_CIDR --service-cidr=$SERVICE_CIDR

    echo "[7/7] Configuring kubectl..."
    mkdir -p $HOME/.kube
    cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
    chown $(id -u):$(id -g) $HOME/.kube/config

    echo "=== Master node ready ==="
    echo "Join command:"
    kubeadm token create --print-join-command
    ;;

  worker)
    echo "[1/4] Updating system..."
    apt update && apt upgrade -y

    echo "[2/4] Installing GPU drivers..."
    apt install -y nvidia-driver-535 nvidia-utils-535

    echo "[3/4] Installing container toolkit..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
      gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -fsSL https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
      tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    apt update
    apt install -y nvidia-container-toolkit
    nvidia-ctk runtime configure --runtime=docker
    systemctl restart docker

    echo "[4/4] Installing Kubernetes..."
    apt install -y apt-transport-https ca-certificates curl
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/Release.key | \
      gpg --dearmor -o /etc/apt/keyrings/kubernetes-archive-keyring.gpg
    echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/ /" | \
      tee /etc/apt/sources.list.d/kubernetes.list
    apt update
    apt install -y kubelet kubeadm kubectl
    apt-mark hold kubelet kubeadm kubectl

    echo "=== Worker node ready ==="
    ;;

  join)
    if [ -z "$2" ]; then
      echo "Usage: $0 join <join-command>"
      exit 1
    fi
    echo "[1/1] Joining cluster..."
    $2
    echo "=== Node joined ==="
    ;;

  calico)
    echo "Installing Calico CNI..."
    kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml
    kubectl get pods -n calico-system
    ;;

  nvidia)
    echo "Installing NVIDIA Device Plugin..."
    kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/master/nvidia-device-plugin.yml
    kubectl get pods -n kube-system | grep nvidia
    ;;

  *)
    echo "Usage: sudo $0 {master|worker|join|calico|nvidia}"
    echo ""
    echo "  master  - Initialize master node"
    echo "  worker  - Prepare worker node"
    echo "  join    - Join worker to cluster"
    echo "  calico  - Install CNI"
    echo "  nvidia  - Install NVIDIA device plugin"
    exit 1
    ;;
esac

echo "Done!"