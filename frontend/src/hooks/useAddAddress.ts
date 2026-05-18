// frontend/src/hooks/useAddAddress.ts
// Mutation hook for creating a new shipping address for the current user.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Data required to create a new address – state is optional */
export interface NewAddressInput {
  street: string;
  city: string;
  state?: string; // <-- made optional to match the backend schema
  zipCode: string;
  country: string;
}

/** The address object returned by the API after creation */
export interface Address {
  id: string;
  street: string;
  city: string;
  state: string | null;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface CreateAddressResponse {
  status: string;
  data: {
    address: Address;
  };
}

/**
 * React Query mutation that creates a new address.
 * On success, it invalidates the 'addresses' query so the address list refetches.
 */
export function useAddAddress(): UseMutationResult<CreateAddressResponse, Error, NewAddressInput> {
  const queryClient = useQueryClient();

  return useMutation<CreateAddressResponse, Error, NewAddressInput>({
    mutationFn: async (input: NewAddressInput) => {
      const { data } = await apiClient.post<CreateAddressResponse>('/users/me/addresses', input);
      return data;
    },
    onSuccess: () => {
      // Refetch the list of addresses so the new one appears immediately
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}
