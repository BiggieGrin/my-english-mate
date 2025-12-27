import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    getSession: builder.query<Session | null, void>({
      async queryFn() {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          return { data: data.session };
        } catch (error) {
          return { error: error as Error };
        }
      },
      providesTags: ['Auth'],
    }),

    getUser: builder.query<User | null, void>({
      async queryFn() {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          return { data: data.user };
        } catch (error) {
          return { error: error as Error };
        }
      },
      providesTags: ['Auth'],
    }),

    signIn: builder.mutation<
      Session,
      { email: string; password: string }
    >({
      async queryFn({ email, password }) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          return { data: data.session! };
        } catch (error) {
          return { error: error as Error };
        }
      },
      invalidatesTags: ['Auth'],
    }),

    signUp: builder.mutation<
      Session | null,
      { email: string; password: string }
    >({
      async queryFn({ email, password }) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          return { data: data.session };
        } catch (error) {
          return { error: error as Error };
        }
      },
      invalidatesTags: ['Auth'],
    }),

    signOut: builder.mutation<void, void>({
      async queryFn() {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          return { data: undefined };
        } catch (error) {
          return { error: error as Error };
        }
      },
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useGetSessionQuery,
  useGetUserQuery,
  useSignInMutation,
  useSignUpMutation,
  useSignOutMutation,
} = authApi;
