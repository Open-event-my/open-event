import { useState, useCallback, useEffect } from 'react'
import { createTLStore, defaultShapeUtils, type TLStore } from 'tldraw'
import { getSnapshot, loadSnapshot } from '@tldraw/editor'
import { customShapeUtils } from '../shapes'

const STORAGE_KEY = 'open-event-playground-v1'

export function usePlaygroundStore() {
  const [store] = useState<TLStore>(() => {
    const newStore = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...customShapeUtils],
    })

    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const snapshot = JSON.parse(saved)
          loadSnapshot(newStore, snapshot)
        }
      } catch (error) {
        console.warn('Failed to load playground state:', error)
      }
    }

    return newStore
  })

  const saveToStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const snapshot = getSnapshot(store)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
      } catch (error) {
        console.warn('Failed to save playground state:', error)
      }
    }
  }, [store])

  const clearStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Auto-save on changes
  useEffect(() => {
    const unsubscribe = store.listen(
      () => {
        saveToStorage()
      },
      { scope: 'document' }
    )

    return () => {
      unsubscribe()
    }
  }, [store, saveToStorage])

  return { store, saveToStorage, clearStorage }
}
