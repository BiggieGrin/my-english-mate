import { BaseQueryFn } from '@reduxjs/toolkit/query';
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

export type SupabaseQueryArgs = {
  table: string;
  method: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  select?: string;
  match?: Record<string, unknown>;
  eq?: { column: string; value: unknown };
  single?: boolean;
  maybeSingle?: boolean;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  body?: unknown;
};

export type SupabaseQueryError = {
  error: PostgrestError | Error;
  status?: number;
};

export const supabaseBaseQuery: BaseQueryFn<
  SupabaseQueryArgs,
  unknown,
  SupabaseQueryError
> = async (args) => {
  try {
    let query = supabase.from(args.table);

    switch (args.method) {
      case 'select': {
        let selectQuery = query.select(args.select || '*');

        if (args.match) {
          selectQuery = selectQuery.match(args.match);
        }

        if (args.eq) {
          selectQuery = selectQuery.eq(args.eq.column, args.eq.value);
        }

        if (args.order) {
          selectQuery = selectQuery.order(args.order.column, {
            ascending: args.order.ascending ?? true,
          });
        }

        if (args.limit) {
          selectQuery = selectQuery.limit(args.limit);
        }

        if (args.single) {
          const { data, error } = await selectQuery.single();
          if (error) throw error;
          return { data };
        }

        if (args.maybeSingle) {
          const { data, error } = await selectQuery.maybeSingle();
          if (error) throw error;
          return { data };
        }

        const { data, error } = await selectQuery;
        if (error) throw error;
        return { data };
      }

      case 'insert': {
        const { data, error } = await query.insert(args.body as never).select();
        if (error) throw error;
        return { data };
      }

      case 'update': {
        let updateQuery = query.update(args.body as never);

        if (args.match) {
          updateQuery = updateQuery.match(args.match);
        }

        if (args.eq) {
          updateQuery = updateQuery.eq(args.eq.column, args.eq.value);
        }

        const { data, error } = await updateQuery.select();
        if (error) throw error;
        return { data };
      }

      case 'delete': {
        let deleteQuery = query.delete();

        if (args.match) {
          deleteQuery = deleteQuery.match(args.match);
        }

        if (args.eq) {
          deleteQuery = deleteQuery.eq(args.eq.column, args.eq.value);
        }

        const { data, error } = await deleteQuery;
        if (error) throw error;
        return { data };
      }

      case 'upsert': {
        const { data, error } = await query.upsert(args.body as never).select();
        if (error) throw error;
        return { data };
      }

      default:
        throw new Error(`Unsupported method: ${args.method}`);
    }
  } catch (error) {
    return {
      error: {
        error: error as PostgrestError | Error,
        status: (error as PostgrestError)?.code ? 400 : 500,
      },
    };
  }
};
