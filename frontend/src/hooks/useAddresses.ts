// frontend/src/hooks/useAddresses.ts
// Fetches the current user's saved addresses for the checkout flow.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of an address object returned by the API */
export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressesResponse {
  status: string;
  data: {
    addresses: Address[];
  };
}

/**
 * React Query hook to retrieve the user's saved addresses.
 * Used in the Address step of checkout.
 */
export function useAddresses(): UseQueryResult<AddressesResponse, Error> {
  return useQuery<AddressesResponse, Error>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await apiClient.get<AddressesResponse>('/users/me/addresses');
      return data;
    },
  });
}
