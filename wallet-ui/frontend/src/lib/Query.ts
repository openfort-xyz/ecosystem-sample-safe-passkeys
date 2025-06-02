import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { MutationCache, QueryClient } from '@tanstack/react-query'

export const client: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnReconnect: () => !client.isMutating(),
      retry: 0,
    },
  },
  /**
   * @see https://tkdodo.eu/blog/react-query-error-handling#putting-it-all-together
   */
  mutationCache: new MutationCache({
    onSettled: () => {
      if (client.isMutating() === 1) {
        return client.invalidateQueries()
      }
    },
  }),
})

export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
})
