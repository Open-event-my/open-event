import { useState, useCallback } from 'react'

/**
 * State for a single modal with optional data
 */
interface ModalState<T = unknown> {
  isOpen: boolean
  data: T | null
}

/**
 * Hook for managing a single modal's open/close state with optional data.
 *
 * @example
 * const deleteModal = useModalState<User>()
 *
 * // Open with data
 * deleteModal.open(user)
 *
 * // Check state
 * if (deleteModal.isOpen && deleteModal.data) {
 *   console.log(deleteModal.data.name)
 * }
 *
 * // Close
 * deleteModal.close()
 */
export function useModalState<T = unknown>(initialState = false) {
  const [state, setState] = useState<ModalState<T>>({
    isOpen: initialState,
    data: null,
  })

  /**
   * Open the modal, optionally with data
   */
  const open = useCallback((data?: T) => {
    setState({ isOpen: true, data: data ?? null })
  }, [])

  /**
   * Close the modal and clear data
   */
  const close = useCallback(() => {
    setState({ isOpen: false, data: null })
  }, [])

  /**
   * Toggle the modal state
   */
  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  /**
   * Update the data without changing open state
   */
  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }))
  }, [])

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
    toggle,
    setData,
  }
}

/**
 * Type for modal identifiers
 */
type ModalId = string

/**
 * Hook for managing multiple modals on a single page.
 * Only one modal can be open at a time.
 *
 * @example
 * const modals = useMultiModal<'create' | 'edit' | 'delete'>()
 *
 * // Open a specific modal
 * modals.open('edit', { id: '123' })
 *
 * // Check which is open
 * modals.isOpen('edit') // true
 * modals.activeModal // 'edit'
 *
 * // Get data for a modal
 * const data = modals.getData<EditData>('edit')
 */
export function useMultiModal<K extends ModalId = string>() {
  const [activeModal, setActiveModal] = useState<K | null>(null)
  const [modalData, setModalData] = useState<Record<string, unknown>>({})

  /**
   * Open a modal, optionally with data
   */
  const open = useCallback(<T>(modal: K, data?: T) => {
    setActiveModal(modal)
    if (data !== undefined) {
      setModalData((prev) => ({ ...prev, [modal]: data }))
    }
  }, [])

  /**
   * Close the currently open modal
   */
  const close = useCallback(() => {
    setActiveModal(null)
  }, [])

  /**
   * Close and clear all data
   */
  const closeAndClear = useCallback(() => {
    setActiveModal(null)
    setModalData({})
  }, [])

  /**
   * Check if a specific modal is open
   */
  const isOpen = useCallback((modal: K) => activeModal === modal, [activeModal])

  /**
   * Get data for a specific modal
   */
  const getData = useCallback(
    <T>(modal: K): T | undefined => modalData[modal] as T | undefined,
    [modalData]
  )

  /**
   * Update data for the active modal
   */
  const updateData = useCallback(
    <T>(data: T) => {
      if (activeModal) {
        setModalData((prev) => ({ ...prev, [activeModal]: data }))
      }
    },
    [activeModal]
  )

  return {
    activeModal,
    open,
    close,
    closeAndClear,
    isOpen,
    getData,
    updateData,
    hasActiveModal: activeModal !== null,
  }
}
