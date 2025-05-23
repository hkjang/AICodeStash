# AICodeStash Helm Chart for Kubernetes

## Before you begin

This [Helm](https://github.com/kubernetes/helm) chart supports installation of [AICodeStash](https://github.com/jordan-dalby/AICodeStash) - A code snippet storage solution written in React & node.js

The prerequisites for this Helm chart is a working **Kubernetes Cluster** and **Helm** installed.

If you don't have a Kubernetes Cluster, create one with [minikube](https://minikube.sigs.k8s.io/docs/start/).

To install Helm, see [Helm Installation guide](https://helm.sh/docs/intro/install/).

<br>

## Installation and Configuration

To add the AICodeStash helm repository, run command:

```bash
helm repo add bytestash https://jordan-dalby.github.io/AICodeStash/
```

To install the AICodeStash helm chart with a release name `my-release` in `ns` namespace, run command:

```bash
helm install -n ns --create-namespace my-release bytestash/bytestash
```

To update latest changes of the charts from the Helm repository, run commands:

```bash
helm repo update

helm -n ns upgrade my-release bytestash/bytestash

```

To configure the Helm chart deployment, the configurable parameters can be found in `values.yaml` values file. Those parameters can be set via `--set` flag during installation or configured by editing the `values.yaml` directly. An example configuration can be found at [example](./.example.yaml)

To uninstall/delete the `my-release` deployment, run command:

```bash
helm delete my-release
```
