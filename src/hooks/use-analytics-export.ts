import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  generateAnalyticsCSV,
  downloadCSV,
  generateCSVFilename,
  generateAnalyticsPDF,
  downloadPDF,
  generatePDFFilename,
  type AnalyticsExportData,
  type ExportSectionId,
  type ExportFormat,
} from '@/lib/export'

interface UseAnalyticsExportReturn {
  isExporting: boolean
  exportFormat: ExportFormat | null
  showModal: boolean
  openModal: () => void
  closeModal: () => void
  exportToCSV: (data: AnalyticsExportData, sections: ExportSectionId[]) => Promise<void>
  exportToPDF: (data: AnalyticsExportData, sections: ExportSectionId[]) => Promise<void>
}

/**
 * Hook for managing analytics export functionality
 * Provides export methods for CSV and PDF with loading states and toast notifications
 */
export function useAnalyticsExport(): UseAnalyticsExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null)
  const [showModal, setShowModal] = useState(false)

  const openModal = useCallback(() => {
    setShowModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const exportToCSV = useCallback(
    async (data: AnalyticsExportData, sections: ExportSectionId[]) => {
      if (sections.length === 0) {
        toast.error('Please select at least one section to export')
        return
      }

      setIsExporting(true)
      setExportFormat('csv')

      try {
        const csvContent = generateAnalyticsCSV(data, sections)
        const filename = generateCSVFilename(data.isAdmin ?? false)
        downloadCSV(csvContent, filename)
        toast.success('CSV exported successfully')
        closeModal()
      } catch (error) {
        console.error('CSV export error:', error)
        toast.error('Failed to export CSV')
      } finally {
        setIsExporting(false)
        setExportFormat(null)
      }
    },
    [closeModal]
  )

  const exportToPDF = useCallback(
    async (data: AnalyticsExportData, sections: ExportSectionId[]) => {
      if (sections.length === 0) {
        toast.error('Please select at least one section to export')
        return
      }

      setIsExporting(true)
      setExportFormat('pdf')

      try {
        const doc = generateAnalyticsPDF(data, sections)
        const filename = generatePDFFilename(data.isAdmin ?? false)
        downloadPDF(doc, filename)
        toast.success('PDF exported successfully')
        closeModal()
      } catch (error) {
        console.error('PDF export error:', error)
        toast.error('Failed to export PDF')
      } finally {
        setIsExporting(false)
        setExportFormat(null)
      }
    },
    [closeModal]
  )

  return {
    isExporting,
    exportFormat,
    showModal,
    openModal,
    closeModal,
    exportToCSV,
    exportToPDF,
  }
}
