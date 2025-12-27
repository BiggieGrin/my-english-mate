import { createApi } from '@reduxjs/toolkit/query/react';
import { supabaseBaseQuery } from './baseQuery';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Conversation = Tables<'conversations'>;
export type ConversationInsert = TablesInsert<'conversations'>;
export type ConversationUpdate = TablesUpdate<'conversations'>;

export interface ConversationWithTopic extends Conversation {
  topics?: {
    title: string;
    icon: string;
  };
}

export const conversationsApi = createApi({
  reducerPath: 'conversationsApi',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['Conversations'],
  endpoints: (builder) => ({
    getConversations: builder.query<
      ConversationWithTopic[],
      { userId: string; topicId?: string }
    >({
      async queryFn({ userId, topicId }) {
        try {
          let query = supabase
            .from('conversations')
            .select(
              `
              *,
              curriculum_topics (title, icon)
            `
            )
            .eq('user_id', userId)
            .order('last_message_at', { ascending: false });

          if (topicId) {
            query = query.eq('topic_id', topicId);
          }

          const { data, error } = await query;
          if (error) throw error;

          return {
            data: data.map((conv: any) => ({
              ...conv,
              topics: conv.curriculum_topics,
            })),
          };
        } catch (error) {
          return { error: error as Error };
        }
      },
      providesTags: (result, error, { userId, topicId }) =>
        topicId
          ? [{ type: 'Conversations', id: `${userId}-${topicId}` }]
          : [{ type: 'Conversations', id: userId }],
    }),

    getRecentConversation: builder.query<ConversationWithTopic | null, string>({
      async queryFn(userId) {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select(
              `
              *,
              curriculum_topics (title, icon)
            `
            )
            .eq('user_id', userId)
            .order('last_message_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          if (!data) return { data: null };

          return {
            data: {
              ...data,
              topics: (data as any).curriculum_topics,
            },
          };
        } catch (error) {
          return { error: error as Error };
        }
      },
      providesTags: (result, error, userId) => [
        { type: 'Conversations', id: `${userId}-recent` },
      ],
    }),

    getConversationById: builder.query<ConversationWithTopic, string>({
      async queryFn(conversationId) {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select(
              `
              *,
              curriculum_topics (title, icon)
            `
            )
            .eq('id', conversationId)
            .single();

          if (error) throw error;

          return {
            data: {
              ...data,
              topics: (data as any).curriculum_topics,
            },
          };
        } catch (error) {
          return { error: error as Error };
        }
      },
      providesTags: (result, error, conversationId) => [
        { type: 'Conversations', id: conversationId },
      ],
    }),

    createConversation: builder.mutation<
      Conversation,
      { userId: string; topicId: string; title?: string; mode?: string }
    >({
      query: ({ userId, topicId, title, mode }) => ({
        table: 'conversations',
        method: 'insert',
        body: {
          user_id: userId,
          topic_id: topicId,
          title,
          mode: mode || 'לימוד',
        },
      }),
      invalidatesTags: (result, error, { userId, topicId }) => [
        { type: 'Conversations', id: userId },
        { type: 'Conversations', id: `${userId}-${topicId}` },
        { type: 'Conversations', id: `${userId}-recent` },
      ],
    }),

    updateConversation: builder.mutation<
      Conversation,
      { conversationId: string; updates: ConversationUpdate }
    >({
      query: ({ conversationId, updates }) => ({
        table: 'conversations',
        method: 'update',
        body: updates,
        eq: { column: 'id', value: conversationId },
      }),
      invalidatesTags: (result, error, { conversationId }) => [
        { type: 'Conversations', id: conversationId },
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetRecentConversationQuery,
  useGetConversationByIdQuery,
  useCreateConversationMutation,
  useUpdateConversationMutation,
} = conversationsApi;
