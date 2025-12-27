import { createApi } from '@reduxjs/toolkit/query/react';
import { supabaseBaseQuery } from './baseQuery';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type CurriculumTopic = Tables<'curriculum_topics'>;
export type UserTopic = Tables<'user_topics'>;
export type UserTopicInsert = TablesInsert<'user_topics'>;

export interface TopicWithProgress {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  conversationCount: number;
}

export const topicsApi = createApi({
  reducerPath: 'topicsApi',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['CurriculumTopics', 'UserTopics'],
  endpoints: (builder) => ({
    getCurriculumTopics: builder.query<CurriculumTopic[], number>({
      query: (grade) => ({
        table: 'curriculum_topics',
        method: 'select',
        select: '*',
        eq: { column: 'grade', value: grade },
        order: { column: 'title', ascending: true },
      }),
      providesTags: (result, error, grade) => [
        { type: 'CurriculumTopics', id: grade },
      ],
    }),

    getCurriculumTopicById: builder.query<CurriculumTopic, string>({
      query: (topicId) => ({
        table: 'curriculum_topics',
        method: 'select',
        select: '*',
        eq: { column: 'id', value: topicId },
        single: true,
      }),
      providesTags: (result, error, topicId) => [
        { type: 'CurriculumTopics', id: topicId },
      ],
    }),

    getUserTopics: builder.query<TopicWithProgress[], string>({
      async queryFn(userId) {
        try {
          const { data: userTopics, error: topicsError } = await supabase
            .from('user_topics')
            .select(
              `
              topic_id,
              curriculum_topics (
                id,
                title,
                icon,
                description
              )
            `
            )
            .eq('user_id', userId)
            .order('last_accessed_at', { ascending: false });

          if (topicsError) throw topicsError;

          const topicsWithCount = await Promise.all(
            (userTopics || []).map(async (userTopic: any) => {
              const topic = userTopic.curriculum_topics;
              const { count } = await supabase
                .from('conversations')
                .select('*', { count: 'exact', head: true })
                .eq('topic_id', topic.id);

              return {
                id: topic.id,
                title: topic.title,
                icon: topic.icon,
                description: topic.description,
                conversationCount: count || 0,
              };
            })
          );

          return { data: topicsWithCount };
        } catch (error) {
          return { error: error as Error };
        }
      },
      providesTags: (result, error, userId) => [
        { type: 'UserTopics', id: userId },
      ],
    }),

    getUserTopicByTopicId: builder.query<
      UserTopic | null,
      { userId: string; topicId: string }
    >({
      query: ({ userId, topicId }) => ({
        table: 'user_topics',
        method: 'select',
        select: '*',
        match: { user_id: userId, topic_id: topicId },
        maybeSingle: true,
      }),
      providesTags: (result, error, { userId, topicId }) => [
        { type: 'UserTopics', id: `${userId}-${topicId}` },
      ],
    }),

    enrollInTopic: builder.mutation<
      UserTopic,
      { userId: string; topicId: string }
    >({
      query: ({ userId, topicId }) => ({
        table: 'user_topics',
        method: 'insert',
        body: {
          user_id: userId,
          topic_id: topicId,
        },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'UserTopics', id: userId },
      ],
    }),
  }),
});

export const {
  useGetCurriculumTopicsQuery,
  useGetCurriculumTopicByIdQuery,
  useGetUserTopicsQuery,
  useGetUserTopicByTopicIdQuery,
  useEnrollInTopicMutation,
} = topicsApi;
