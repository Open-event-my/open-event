import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileCsv, FilePdf, SpinnerGap, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_EXPORT_SECTIONS,
  type ExportSection,
  type ExportSectionId,
  type ExportFormat,
  type AnalyticsExportData,
} from '@/lib/export'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: ExportFormat, sections: ExportSectionId[]) => void
  isExporting: boolean
  exportFormat: ExportFormat | null
  data: AnalyticsExportData
}

export function ExportModal({
  open,
  onOpenChange,
  onExport,
  isExporting,
  exportFormat,
  data,
}: ExportModalProps) {
  const [sections, setSections] = useState<ExportSection[]>(() =>
    DEFAULT_EXPORT_SECTIONS.map((s) => ({
      ...s,
      // Disable sections that don't have data
      enabled: s.enabled && hasDataForSection(s.id, data),
    }))
  )

  const toggleSection = (id: ExportSectionId) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id && hasDataForSection(id, data) ? { ...s, enabled: !s.enabled } : s
      )
    )
  }

  const selectAll = () => {
    setSections((prev) => prev.map((s) => ({ ...s, enabled: hasDataForSection(s.id, data) })))
  }

  const deselectAll = () => {
    setSections((prev) => prev.map((s) => ({ ...s, enabled: false })))
  }

  const selectedSections = sections.filter((s) => s.enabled).map((s) => s.id)
  const hasSelection = selectedSections.length > 0

  const handleExport = (format: ExportFormat) => {
    onExport(format, selectedSections)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Analytics</DialogTitle>
          <DialogDescription>Choose which sections to include in your export</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick actions */}
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={selectAll} className="text-primary hover:underline">
              Select all
            </button>
            <span className="text-muted-foreground">|</span>
            <button type="button" onClick={deselectAll} className="text-primary hover:underline">
              Deselect all
            </button>
          </div>

          {/* Section checkboxes */}
          <div className="space-y-2">
            {sections.map((section) => {
              const hasData = hasDataForSection(section.id, data)
              return (
                <label
                  key={section.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    section.enabled
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50',
                    !hasData && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      section.enabled ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                    )}
                  >
                    {section.enabled && <Check size={14} weight="bold" className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => toggleSection(section.id)}
                    disabled={!hasData}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{section.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {hasData ? section.description : 'No data available'}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={!hasSelection || isExporting}
            className="flex-1"
          >
            {isExporting && exportFormat === 'csv' ? (
              <SpinnerGap className="animate-spin mr-2" size={16} />
            ) : (
              <FileCsv className="mr-2" size={16} />
            )}
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            disabled={!hasSelection || isExporting}
            className="flex-1"
          >
            {isExporting && exportFormat === 'pdf' ? (
              <SpinnerGap className="animate-spin mr-2" size={16} />
            ) : (
              <FilePdf className="mr-2" size={16} />
            )}
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Check if data exists for a given section
 */
function hasDataForSection(sectionId: ExportSectionId, data: AnalyticsExportData): boolean {
  switch (sectionId) {
    case 'overview':
      return !!data.stats
    case 'trends':
      return !!data.trends && data.trends.length > 0
    case 'performance':
      return !!data.performance
    case 'budget':
      return !!data.budget
    case 'engagement':
      return !!data.engagement
    default:
      return false
  }
}
