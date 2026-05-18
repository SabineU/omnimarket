// frontend/src/hooks/useUpdateAddress.ts
// Mutation hook for updating an existing address.
// Calls PATCH /api/users/me/addresses/:id and refetches addresses on success.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

/** Payload for updating an address (all fields optional) */
export interface UpdateAddressPayload {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

interface Address {
  id: string;
  street: string;
  city: string;
  state: string | null;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface UpdateAddressResponse {
  status: string;
  data: {
    address: Address;
  };
}

/** Variables needed for the mutation: the address ID + the fields to update */
export interface UpdateAddressVariables {
  addressId: string;
  data: UpdateAddressPayload;
}

/**
 * React Query mutation for updating a user's saved address.
 */
export function useUpdateAddress(): UseMutationResult<
  UpdateAddressResponse,
  Error,
  UpdateAddressVariables
> {
  const queryClient = useQueryClient();

  return useMutation<UpdateAddressResponse, Error, UpdateAddressVariables>({
    mutationFn: async ({ addressId, data }: UpdateAddressVariables) => {
      const { data: responseData } = await apiClient.patch<UpdateAddressResponse>(
        `/users/me/addresses/${addressId}`,
        data,
      );
      return responseData;
    },
    onSuccess: () => {
      toast.success('Address updated');
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update address');
      console.error('Update address error:', error);
    },
  });
}
