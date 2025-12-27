import { createApi } from '@reduxjs/toolkit/query/react';
import { supabaseBaseQuery } from './baseQuery';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type LessonMessage = Tables<'lesson_messages'>;
export type LessonMessageInsert = TablesInsert<'lesson_messages'>;

export const messagesApi = createApi({
  reducerPath: 'messagesApi',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['Messages'],
  endpoints: (builder) => ({
    getMessagesByConversation: builder.query<LessonMessage[], string>({
      query: (conversationId) => ({
        table: 'lesson_messages',
        method: 'select',
        select: '*',
        eq: { column: 'conversation_id', value: conversationId },
        order: { column: 'created_at', ascending: true },
      }),
      providesTags: (result, error, conversationId) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    getMessagesByUser: builder.query<
      LessonMessage[],
      { userId: string; limit?: number }
    >({
      query: ({ userId, limit }) => ({
        table: 'lesson_messages',
        method: 'select',
        select: '*',
        eq: { column: 'user_id', value: userId },
        order: { column: 'created_at', ascending: false },
        limit: limit || 100,
      }),
      providesTags: (result, error, { userId }) => [
        { type: 'Messages', id: userId },
      ],
    }),

    createMessage: builder.mutation<LessonMessage, LessonMessageInsert>({
      query: (message) => ({
        table: 'lesson_messages',
        method: 'insert',
        body: message,
      }),
      invalidatesTags: (result, error, message) =>
        message.conversation_id
          ? [{ type: 'Messages', id: message.conversation_id }]
          : [],
    }),
  }),
});

export const {
  useGetMessagesByConversationQuery,
  useGetMessagesByUserQuery,
  useCreateMessageMutation,
} = messagesApi;
