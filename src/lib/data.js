import { getSupabaseClient } from './supabase.js';

export const DATA_STATUS = {
  loading: 'loading',
  success: 'success',
  empty: 'empty',
  error: 'error',
};

export async function loadPublishedRows(tableName, { select = '*', orderBy = null, fallback = [], filters = [] } = {}) {
  const client = getSupabaseClient();

  if (!client) {
    return { status: DATA_STATUS.empty, data: fallback, error: null };
  }

  try {
    let query = client.from(tableName).select(select).eq('published', true);

    for (const filter of filters) {
      query = filter(query) ?? query;
    }

    if (orderBy) {
      query = query.order(orderBy[0], { ascending: orderBy[1] ?? false });
    }

    const { data, error } = await query;

    if (error) {
      return { status: DATA_STATUS.error, data: fallback, error: error.message };
    }

    const rows = Array.isArray(data) ? data : [];

    return {
      status: rows.length ? DATA_STATUS.success : DATA_STATUS.empty,
      data: rows.length ? rows : fallback,
      error: null,
    };
  } catch (error) {
    return {
      status: DATA_STATUS.error,
      data: fallback,
      error: error instanceof Error ? error.message : 'Unable to load published data.',
    };
  }
}

export async function loadPublishedContent(options = {}) {
  const fallback = Array.isArray(options.fallback) ? options.fallback : [];
  return loadPublishedRows(options.tableName, {
    select: options.select ?? '*',
    orderBy: options.orderBy ?? null,
    filters: options.filters ?? [],
    fallback,
  });
}
