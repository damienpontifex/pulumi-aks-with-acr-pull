import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure';
import * as kz from "@pulumi/kubernetesx";
import * as k8s from "@pulumi/kubernetes";

import { k8sCluster, k8sProvider, acr } from './cluster';

const pb = new kz.PodBuilder({
  containers: [{
    name: 'nginx',
    image: acr.then(r => `${r.loginServer}/nginx:mainline-alpine`),
    ports: { http: 80 },
  }]
});

const deployment = new kz.Deployment('nginx', {
  spec: pb.asDeploymentSpec({ replicas: 1 }),
}, { provider: k8sProvider });

const nginxService = deployment.createService({
  type: kz.types.ServiceType.ClusterIP,
});

const nginxIngressController = new k8s.helm.v3.Chart('default', {
  chart: 'nginx-ingress',
  fetchOpts: {
    repo: 'https://helm.nginx.com/stable',
  },
  values: {
  },
}, { provider: k8sProvider, });

const loadBalancerService = nginxIngressController.getResource("v1/Service", 'default/default-nginx-ingress');

const nginxIngress = new k8s.extensions.v1beta1.Ingress('nginxservice', {
  metadata: {
    labels: deployment.metadata.labels,
    namespace: deployment.metadata.namespace,
    annotations: {
      'kubernetes.io/ingress.class': 'nginx',
    },
  },
  spec: {
    rules: [
      {
        host: pulumi.interpolate`${loadBalancerService.status.loadBalancer.ingress[0].ip}.xip.io`,
        http: {
          paths: [
            {
              path: '/',
              backend: {
                serviceName: nginxService.metadata.name,
                servicePort: 'http',
              },
            }
          ]
        }
      }
    ]
  },
}, { provider: k8sProvider, });

export const name = deployment.metadata.name;
export const azCliKubectlGetCredentials = pulumi.interpolate`az aks get-credentials --resource-group ${k8sCluster.resourceGroupName} --name ${k8sCluster.name}`;
export const serviceAddress = nginxIngress.spec.rules.apply(r => r[0].host);
