import * as pulumi from '@pulumi/pulumi';
import * as azure from "@pulumi/azure";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const commonTags = { client: 'self', environment: 'dev', application: 'pulumiaks' };
const location = config.get('azure:location') || 'australiaeast';

const k8sVersion = azure.containerservice.getKubernetesServiceVersions({ 
  includePreview: false, 
  location,
}).then(v => v.latestVersion);

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("pulumiaks", { 
  tags: commonTags,
});

export const logAnalyticsWorkspace = new azure.operationalinsights.AnalyticsWorkspace('pulumiworkspace', {
  resourceGroupName: resourceGroup.name,
  sku: 'PerGB2018',
  tags: commonTags,
  location: location,
});

export const k8sCluster = new azure.containerservice.KubernetesCluster('pulumakscluster', {
  resourceGroupName: resourceGroup.name,
  dnsPrefix: `${pulumi.getStack()}-dns`,
  kubernetesVersion: k8sVersion,
  roleBasedAccessControl: { enabled: true, },
  addonProfile: {
    kubeDashboard: { enabled: false },
    omsAgent: { enabled: true, logAnalyticsWorkspaceId: logAnalyticsWorkspace.id },
  },
  location,
  networkProfile: {
    networkPlugin: 'azure',
  },
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

