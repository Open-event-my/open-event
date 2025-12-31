/**
 * Hook to check if user needs to accept terms
 * 
 * NOTE: Backend compliance module not yet integrated. Returns stub values.
 */

const CURRENT_TERMS_VERSION = '1.0';

export function useTermsAcceptance() {
  // TODO: Implement when backend compliance module is integrated
  // const hasAccepted = useQuery(
  //   api.lib.compliance.termsAcceptance.hasAcceptedVersion,
  //   { version: CURRENT_TERMS_VERSION }
  // );

  return {
    needsAcceptance: false, // Stub: assume terms are accepted
    currentVersion: CURRENT_TERMS_VERSION,
    isLoading: false,
  };
}
