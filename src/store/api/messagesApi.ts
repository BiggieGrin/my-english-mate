import { createApi } from '@reduxjs/toolkit/query/react';
import { supabaseBaseQuery } from './baseQuery';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type LessonMessage = Tables<'lesson_messages'>;
export type LessonMessageInsert = TablesInsert<'lesson_messages'>;

/** A message with its attached image already resolved, via a PostgREST embed. */
export interface LessonMessageWithImage {
  id: string;
  role: string;
  content: string;
  image_id: string | null;
  created_at: string;
  lesson_images: { image_data: string } | null;
}

export const messagesApi = createApi({
  reducerPath: 'messagesApi',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['Messages'],
  endpoints: (builder) => ({
    /**
     * Conversation history with images resolved in a single request.
     *
     * The lesson page previously fetched messages, then issued one
     * `lesson_images` select per message that had an `image_id` -- a classic
     * N+1. The `lesson_messages_image_id_fkey` foreign key lets PostgREST
     * embed the image directly.
     */
    getMessagesByConversation: builder.query<LessonMessageWithImage[], string>({
      async queryFn(conversationId) {
        try {
          const { data, error } = await supabase
            .from('lesson_messages')
            .select(
              'id, role, content, image_id, created_at, lesson_images:image_id (image_data)'
            )
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          return { data: (data ?? []) as unknown as LessonMessageWithImage[] };
        } catch (error) {
          return { error: error as Error };
        }
      },
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
