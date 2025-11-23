import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import { flagRegistry } from '@/shared/lib/flags';

const getApiData = () => getProviderData(flagRegistry);

export const GET = createFlagsDiscoveryEndpoint(getApiData, {
  secret: process.env.FLAGS_SECRET
});


