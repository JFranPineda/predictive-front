import { baseApi } from '@app/api/baseApi';

/** The conditions a machine was running under when it was measured. */
export interface OperatingParameter {
  id: number;
  code: string;
  name: string;
  unit_code: string;
  technique_code: string;
  decimals: number;
  /** A running-hour counter only grows; a pressure does not. */
  is_cumulative: boolean;
  applies_to?: string;
}

export const operatingDataApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    operatingParameters: build.query<OperatingParameter[], void>({
      query: () => 'operating-parameters/',
      providesTags: ['OperatingParameter'],
    }),
    createOperatingParameter: build.mutation<
      OperatingParameter,
      Partial<OperatingParameter>
    >({
      query: (body) => ({ url: 'operating-parameters/', method: 'POST', body }),
      invalidatesTags: ['OperatingParameter'],
    }),
    updateOperatingParameter: build.mutation<
      OperatingParameter,
      Partial<OperatingParameter> & { id: number }
    >({
      query: ({ id, ...body }) => ({
        url: `operating-parameters/${id}/`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['OperatingParameter'],
    }),
    deleteOperatingParameter: build.mutation<void, number>({
      query: (id) => ({ url: `operating-parameters/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['OperatingParameter'],
    }),
  }),
});

export const {
  useOperatingParametersQuery,
  useCreateOperatingParameterMutation,
  useUpdateOperatingParameterMutation,
  useDeleteOperatingParameterMutation,
} = operatingDataApi;
