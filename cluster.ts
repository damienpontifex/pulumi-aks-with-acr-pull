import * as pulumi from '@pulumi/pulumi';
import * as azure from "@pulumi/azure";
import * as k8s from "@pulumi/kubernetes";

const commonTags = { client: 'Self', environment: 'dev', application: 'pulumiaks' };
const k8sVersion = '1.16.9';

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("pulumiaks", { 
  tags: commonTags,
});

export const k8sCluster = new azure.containerservice.KubernetesCluster('pulumakscluster', {
  resourceGroupName: resourceGroup.name,
  dnsPrefix: `${pulumi.getStack()}-dns`,
  kubernetesVersion: k8sVersion,
  roleBasedAccessControl: { 
    enabled: true 
  },
  addonProfile: {
    kubeDashboard: { enabled: false },
  },
  location: resourceGroup.location,
  defaultNodePool: {
    name: 'system',
    vmSize: 'Standard_B2s',
    nodeCount: 1,
    orchestratorVersion: k8sVersion,
    tags: commonTags,
  },
  tags: commonTags,
  identity: {
    type: 'SystemAssigned'
  }
});

export const acr = azure.containerservice.getRegistry({
  name: 'pontifex',
  resourceGroupName: 'containers'
});

new azure.authorization.Assignment('K8sAcrPull', {
  principalId: k8sCluster.kubeletIdentities.apply(i => i[0].objectId),
  roleDefinitionName: 'AcrPull',
  scope: acr.then(r => r.id),
});

export const k8sProvider = new k8s.Provider('aksK8s', {
  kubeconfig: k8sCluster.kubeConfigRaw,
});

