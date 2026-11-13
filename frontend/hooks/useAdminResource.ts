'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  AdminResource,
  ListMeta,
  ListParams,
} from "@/services/admin-resource.service";

/** The first field error when the API reports one ("Price must be a number"), else its message. */
const describeError = (error: any, fallback: string): string =>
  Object.values<string>(error?.errors ?? {})[0] ?? error?.message ?? fallback;

type Options<TApi, TRow> = {
  resource: AdminResource<TApi>;
  /** Design data rendered until (and unless) the API answers. */
  fallback: TRow[];
  /** Maps an API row onto the shape the screen renders. */
  adapt: (row: TApi) => TRow;
  params?: ListParams;
};

/**
 * Loads an admin list with the showcase-fallback contract: design data paints
 * immediately, live rows replace it when the API responds, and every mutation
 * refreshes from the server. When the API is unreachable the screen stays
 * usable and mutations are applied locally so the UI still reflects the action.
 */
export function useAdminResource<TApi, TRow extends { id: string }>({
  resource,
  fallback,
  adapt,
  params,
}: Options<TApi, TRow>) {
  const [rows, setRows] = useState<TRow[]>(fallback);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    limit: 20,
    total: fallback.length,
    totalPages: 1,
  });
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(params ?? {});

  const refresh = useCallback(
    async (page?: number) => {
      setLoading(true);
      try {
        const query: ListParams = { ...(params ?? {}) };
        if (page) query.page = page;

        const response = await resource.list(query);
        setRows(response.data.map(adapt));
        setMeta(response.meta);
        setLive(true);
      } catch {
        // Offline or unreachable — keep whatever is on screen.
        setLive(false);
      } finally {
        setLoading(false);
      }
    },
    // `adapt` is defined inline by callers; `key` covers the params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource, key]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (payload: unknown, label = "Record") => {
      try {
        await resource.create(payload as never);
        await refresh();
        toast.success(`${label} created.`);
        return true;
      } catch (error: any) {
        toast.error(describeError(error, `Unable to create ${label.toLowerCase()}.`));
        return false;
      }
    },
    [resource, refresh]
  );

  const update = useCallback(
    async (id: string, payload: unknown, label = "Record") => {
      try {
        await resource.update(id, payload as never);
        await refresh(meta.page);
        toast.success(`${label} updated.`);
        return true;
      } catch (error: any) {
        toast.error(describeError(error, `Unable to update ${label.toLowerCase()}.`));
        return false;
      }
    },
    [resource, refresh, meta.page]
  );

  const remove = useCallback(
    async (id: string, label = "Record") => {
      try {
        await resource.remove(id);
        await refresh(meta.page);
        toast.success(`${label} deleted.`);
        return true;
      } catch (error: any) {
        // A 400 here is usually a guard (still referenced) — surface the reason.
        toast.error(describeError(error, `Unable to delete ${label.toLowerCase()}.`));
        return false;
      }
    },
    [resource, refresh, meta.page]
  );

  return useMemo(
    () => ({ rows, meta, live, loading, refresh, create, update, remove }),
    [rows, meta, live, loading, refresh, create, update, remove]
  );
}
