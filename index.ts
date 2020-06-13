import * as k8s from "@pulumi/kubernetes";

import { k8sCluster, k8sProvider, acr } from './cluster';

const appLabels = { app: 'nginx' };
const nginxDeployment = new k8s.apps.v1.Deployment('nginx', {
  spec: {
    selector: { matchLabels: appLabels },
    replicas: 1,
    template: {
      metadata: { labels: appLabels },
      spec: {
        containers: [
          {
            name: 'nginx',
            image: acr.then(r => `${r.name}.azurecr.io/nginx:mainline-alpine`),
            ports: [
              { name: 'http', containerPort: 80 },
            ]
          }
        ]
      }
    }
  }
}, { provider: k8sProvider });

export const name = nginxDeployment.metadata.name;
export const azCliKubectlGetCredentials = `az aks get-credentials --resource-group ${k8sCluster.resourceGroupName} --name ${k8sCluster.name}`


