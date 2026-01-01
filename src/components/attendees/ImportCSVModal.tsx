/**
 * Import CSV Modal
 * Bulk import attendees from a CSV file
 */

import { useState, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  UploadSimple,
  File,
  CheckCircle,
  XCircle,
  Warning,
  DownloadSimple,
  Trash,
  Table,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ImportCSVModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: Id<'events'>
  onSuccess?: () => void
}

interface ParsedRow {
  name: string
  email: string
  phone?: string
  organization?: string
  jobTitle?: string
  ticketType?: string
  dietaryRestrictions?: string
  accessibilityNeeds?: string
  specialRequests?: string
  notes?: string
}

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

const SAMPLE_CSV = `name,email,phone,organization,ticketType
John Doe,john@example.com,+1234567890,Acme Inc,General Admission
Jane Smith,jane@example.com,,Tech Corp,VIP
Bob Wilson,bob@example.com,+1987654321,,Early Bird`

const REQUIRED_COLUMNS = ['name', 'email']
const OPTIONAL_COLUMNS = [
  'phone',
  'organization',
  'jobTitle',
  'ticketType',
  'dietaryRestrictions',
  'accessibilityNeeds',
  'specialRequests',
  'notes',
]

export function ImportCSVModal({ open, onOpenChange, eventId, onSuccess }: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const bulkImport = useMutation(api.attendees.bulkImport)

  const parseCSV = (content: string): { rows: ParsedRow[]; errors: string[] } => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) {
      return { rows: [], errors: ['CSV file must have a header row and at least one data row'] }
    }

    const headerLine = lines[0].toLowerCase()
    const headers = headerLine.split(',').map((h) => h.trim().replace(/"/g, ''))

    // Validate required columns
    const missingRequired = REQUIRED_COLUMNS.filter((col) => !headers.includes(col))
    if (missingRequired.length > 0) {
      return {
        rows: [],
        errors: [`Missing required columns: ${missingRequired.join(', ')}`],
      }
    }

    const rows: ParsedRow[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Simple CSV parsing (handles basic cases)
      const values = parseCSVLine(line)
      if (values.length !== headers.length) {
        errors.push(
          `Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`
        )
        continue
      }

      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })

      // Validate required fields
      if (!row.name) {
        errors.push(`Row ${i + 1}: Missing name`)
        continue
      }
      if (!row.email) {
        errors.push(`Row ${i + 1}: Missing email`)
        continue
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${i + 1}: Invalid email format (${row.email})`)
        continue
      }

      rows.push({
        name: row.name,
        email: row.email.toLowerCase(),
        phone: row.phone || undefined,
        organization: row.organization || undefined,
        jobTitle: row.jobtitle || row.job_title || undefined,
        ticketType: row.tickettype || row.ticket_type || row.ticket || undefined,
        dietaryRestrictions: row.dietaryrestrictions || row.dietary || undefined,
        accessibilityNeeds: row.accessibilityneeds || row.accessibility || undefined,
        specialRequests: row.specialrequests || row.requests || undefined,
        notes: row.notes || undefined,
      })
    }

    return { rows, errors }
  }

  // Parse a single CSV line (handles quoted values)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setImportResult(null)

    try {
      const content = await selectedFile.text()
      const { rows, errors } = parseCSV(content)
      setParsedData(rows)
      setParseErrors(errors)

      if (rows.length > 0) {
        toast.success(`Found ${rows.length} valid attendees to import`)
      }
    } catch {
      toast.error('Failed to read file')
      setParseErrors(['Failed to read file'])
    }
  }

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No valid data to import')
      return
    }

    setIsImporting(true)
    try {
      const result = await bulkImport({
        eventId,
        attendees: parsedData,
      })

      setImportResult({
        total: parsedData.length,
        imported: result.imported,
        skipped: result.skipped,
        errors: (result.errors || []).map((e) => `${e.email}: ${e.error}`),
      })

      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} attendees`)
        onSuccess?.()
      }
      if (result.skipped > 0) {
        toast.warning(`${result.skipped} attendees were skipped (already registered)`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import attendees'
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendees-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Sample CSV downloaded')
  }

  const handleClose = () => {
    setFile(null)
    setParsedData([])
    setParseErrors([])
    setImportResult(null)
    onOpenChange(false)
  }

  const handleClear = () => {
    setFile(null)
    setParsedData([])
    setParseErrors([])
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadSimple size={20} />
            Import Attendees from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import attendees. Required columns: name, email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              file
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />

            {file ? (
              <div className="space-y-2">
                <File size={40} className="mx-auto text-primary" weight="duotone" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                <Button size="sm" variant="ghost" onClick={handleClear}>
                  <Trash size={14} className="mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <label htmlFor="csv-upload" className="cursor-pointer">
                <UploadSimple size={40} className="mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </label>
            )}
          </div>

          {/* Download Sample */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Need a template?</span>
            <Button variant="link" size="sm" onClick={handleDownloadSample} className="p-0 h-auto">
              <DownloadSimple size={14} className="mr-1" />
              Download sample CSV
            </Button>
          </div>

          {/* Parse Results */}
          {parsedData.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle size={20} weight="fill" />
                <span className="font-medium">{parsedData.length} attendees ready to import</span>
              </div>
            </div>
          )}

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                <XCircle size={20} weight="fill" />
                <span className="font-medium">{parseErrors.length} errors found</span>
              </div>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                {parseErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Table size={16} />
                Import Results
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                  <div className="text-xs text-muted-foreground">Imported</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{importResult.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.errors.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-sm text-red-600 dark:text-red-400 mt-2 max-h-24 overflow-y-auto">
                  {importResult.errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && parsedData.length <= 5 && !importResult && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium">Preview</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Organization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.organization || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parsedData.length > 5 && !importResult && (
            <div className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
              <Warning size={14} />
              Showing preview for first 5 of {parsedData.length} attendees
            </div>
          )}

          {/* Column Reference */}
          <div className="text-xs text-muted-foreground">
            <strong>Supported columns:</strong>{' '}
            {[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(', ')}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button onClick={handleImport} disabled={isImporting || parsedData.length === 0}>
              {isImporting ? 'Importing...' : `Import ${parsedData.length} Attendees`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
