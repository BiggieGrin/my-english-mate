import { createApi } from '@reduxjs/toolkit/query/react';
import { supabaseBaseQuery } from './baseQuery';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

export const profileApi = createApi({
  reducerPath: 'profileApi',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['Profile'],
  endpoints: (builder) => ({
    getProfile: builder.query<Profile, string>({
      query: (userId) => ({
        table: 'profiles',
        method: 'select',
        select: '*',
        eq: { column: 'id', value: userId },
        single: true,
      }),
      providesTags: (result, error, userId) => [{ type: 'Profile', id: userId }],
    }),

    updateProfile: builder.mutation<
      Profile,
      { userId: string; updates: ProfileUpdate }
    >({
      query: ({ userId, updates }) => ({
        table: 'profiles',
        method: 'update',
        body: updates,
        eq: { column: 'id', value: userId },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Profile', id: userId },
      ],
      async onQueryStarted({ userId, updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          profileApi.util.updateQueryData('getProfile', userId, (draft) => {
            Object.assign(draft, updates);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const { useGetProfileQuery, useUpdateProfileMutation } = profileApi;
