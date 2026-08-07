import { runtimeConfig } from '../../generated/runtime-config';

export function releaseReadiness() {
  return {
    codeReady: runtimeConfig.codeReady,
    productionReady: runtimeConfig.productionReady,
    requiredEvidence: runtimeConfig.releaseEvidence,
    profileHash: runtimeConfig.profileHash,
  };
}
