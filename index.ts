import * as k8s from "@pulumi/kubernetesx";

import { k8sCluster, k8sProvider } from './cluster';

const pb = new k8s.PodBuilder({
  containers: [{
    name: 'nginx',
    ports: { http: 80 },
  }]
});

const deployment = new k8s.Deployment('nginx', {
  spec: pb.asDeploymentSpec({ replicas: 1 }),
}, { provider: k8sProvider });

deployment.createService({
  type: k8s.types.ServiceType.ClusterIP,
});

export const name = deployment.metadata.name;
export const azCliKubectlGetCredentials = `az aks get-credentials --resource-group ${k8sCluster.resourceGroupName} --name ${k8sCluster.name}`


