import { runtimeConfig } from '../../generated/runtime-config';
import { releaseApproval } from '../../generated/release-approval';

export function releaseReadiness() {
  return {
    codeReady: runtimeConfig.codeReady,
    productionReady: runtimeConfig.codeReady && releaseApproval.productionReady,
    requiredEvidence: runtimeConfig.releaseEvidence,
    profileHash: runtimeConfig.profileHash,
    approval: releaseApproval,
  };
}
