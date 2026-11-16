import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api'
import { useAdminContext } from './context'
import type { ListResponse, ResourceName } from './types'

const CONNECTION_ERROR = 'Could not reach the CVC API.'
const CHANGED_ELSEWHERE = 'This list changed in another tab, so it has been refreshed.'

/* The list for one admin resource, kept in step with the API. Create, edit and
   remove update the local list straight from the response, so the screen never
   waits for a reload. Reordering shows the new order at once and rolls back if
   the server refuses it. Mutations throw on failure (the message is the API's),
   so the calling screen can show it next to the control that failed. */
export function useResourceList<T extends { id: string }>(name: ResourceName) {
  const { token, onUnauthorized } = useAdminContext()
  const [list, setList] = useState<ListResponse<T>>({ items: [], count: 0, limit: 0 })
  // Mirror of `list` for handlers that need the value as it was before their
  // own optimistic write, without depending on a stale closure.
  const latest = useRef(list)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const write = useCallback((next: ListResponse<T>) => {
    latest.current = next
    setList(next)
  }, [])

  // A 401 ends the session; the caller still gets an error to show.
  const fail = useCallback(
    (err: unknown): Error => {
      if (err instanceof ApiError && err.status === 401) onUnauthorized()
      return err instanceof ApiError ? err : new Error(CONNECTION_ERROR)
    },
    [onUnauthorized]
  )

  const reload = useCallback(async () => {
    try {
      write(await apiGet<ListResponse<T>>(`/admin/${name}`, token))
      setError('')
    } catch (err) {
      setError(fail(err).message)
    } finally {
      setLoading(false)
    }
  }, [name, token, write, fail])

  useEffect(() => {
    void reload()
  }, [reload])

  const create = useCallback(
    async (body: object): Promise<T> => {
      let item: T
      try {
        item = await apiPost<T>(`/admin/${name}`, body, token)
      } catch (err) {
        // At the cap: another tab got there first, so this count is stale.
        if (err instanceof ApiError && err.status === 409) await reload()
        throw fail(err)
      }
      // The server puts new galleries first and new services and testimonials last.
      const cur = latest.current
      write({
        items: name === 'portfolio' ? [item, ...cur.items] : [...cur.items, item],
        count: cur.count + 1,
        limit: cur.limit,
      })
      return item
    },
    [name, token, write, reload, fail]
  )

  const update = useCallback(
    async (id: string, patch: object): Promise<T> => {
      let item: T
      try {
        item = await apiPatch<T>(`/admin/${name}/${id}`, patch, token)
      } catch (err) {
        throw fail(err)
      }
      const cur = latest.current
      write({ ...cur, items: cur.items.map((i) => (i.id === id ? item : i)) })
      return item
    },
    [name, token, write, fail]
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        await apiDelete(`/admin/${name}/${id}`, token)
      } catch (err) {
        throw fail(err)
      }
      const cur = latest.current
      write({ ...cur, items: cur.items.filter((i) => i.id !== id), count: Math.max(0, cur.count - 1) })
    },
    [name, token, write, fail]
  )

  const reorder = useCallback(
    async (ids: string[]) => {
      const before = latest.current
      const byId = new Map(before.items.map((i) => [i.id, i]))
      const ordered = ids.map((id) => byId.get(id)).filter((i): i is T => Boolean(i))
      write({ ...before, items: ordered })
      setNotice('')
      try {
        await apiPut(`/admin/${name}/order`, { ids }, token)
      } catch (err) {
        // 409 means another tab changed the list: take the server's order rather than ours.
        if (err instanceof ApiError && err.status === 409) {
          setNotice(CHANGED_ELSEWHERE)
          await reload()
          return
        }
        write(before)
        throw fail(err)
      }
    },
    [name, token, write, reload, fail]
  )

  return {
    items: list.items,
    count: list.count,
    limit: list.limit,
    loading,
    error,
    notice,
    reload,
    create,
    update,
    remove,
    reorder,
  }
}
