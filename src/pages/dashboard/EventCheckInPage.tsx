/**
 * Event Check-In Page
 * QR code scanning and manual check-in for event attendees
 */

import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  QrCode,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Camera,
  CameraSlash,
  User,
  Envelope,
  Buildings,
  Clock,
  Warning,
  ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type CheckInResult = {
  success: boolean
  attendee?: {
    _id: Id<'attendees'>
    name: string
    email: string
    organization?: string
    ticketType?: string
    ticketNumber: string
    status: string
    checkedInAt?: number
  }
  message: string
}

export function EventCheckInPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [manualSearch, setManualSearch] = useState('')
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')
  const stats = useQuery(
    api.attendees.getStats,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )
  const searchResult = useQuery(
    api.attendees.getByTicket,
    manualSearch.length > 3 ? { ticketNumber: manualSearch } : 'skip'
  )

  const checkIn = useMutation(api.attendees.checkIn)
  const undoCheckIn = useMutation(api.attendees.undoCheckIn)

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraEnabled(true)
      setIsScanning(true)
      toast.success('Camera started. Point at a QR code.')
    } catch {
      toast.error('Could not access camera. Please grant permission.')
      setCameraEnabled(false)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraEnabled(false)
    setIsScanning(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Handle check-in
  const handleCheckIn = async (attendeeId: Id<'attendees'>, method: 'qr' | 'manual' = 'manual') => {
    try {
      const result = await checkIn({ id: attendeeId, method })
      if (result.success) {
        setLastResult({
          success: true,
          attendee: result.attendee as CheckInResult['attendee'],
          message: 'Checked in successfully!',
        })
        toast.success(`${result.attendee?.name} checked in!`)
      } else {
        setLastResult({
          success: false,
          attendee: result.attendee as CheckInResult['attendee'],
          message: result.message,
        })
        toast.error(result.message)
      }
    } catch {
      setLastResult({
        success: false,
        message: 'Failed to check in attendee',
      })
      toast.error('Failed to check in attendee')
    }
  }

  // Handle undo check-in
  const handleUndoCheckIn = async (attendeeId: Id<'attendees'>) => {
    try {
      await undoCheckIn({ id: attendeeId })
      setLastResult(null)
      toast.success('Check-in undone')
    } catch {
      toast.error('Failed to undo check-in')
    }
  }

  // Search result found
  const foundAttendee = searchResult

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/dashboard/events/${eventId}/attendees`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <QrCode size={24} />
              Check-In Mode
            </h1>
            <p className="text-muted-foreground text-sm">{event.title}</p>
          </div>
        </div>
        <Link to={`/dashboard/events/${eventId}/attendees`}>
          <Button variant="outline">Exit Check-In Mode</Button>
        </Link>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">{stats.checkedIn}</div>
            <div className="text-sm text-muted-foreground">Checked In</div>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">
              {stats.total - stats.checkedIn - stats.cancelled}
            </div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-primary">{stats.checkInRate}%</div>
            <div className="text-sm text-muted-foreground">Check-In Rate</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Scanner */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <QrCode size={20} />
            QR Code Scanner
          </h2>

          <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Camera size={64} className="mb-4" />
                <p className="text-sm">Camera is off</p>
                <p className="text-xs mt-1">Click the button below to start scanning</p>
              </div>
            )}

            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse" />
              </div>
            )}
          </div>

          <Button
            onClick={cameraEnabled ? stopCamera : startCamera}
            variant={cameraEnabled ? 'destructive' : 'default'}
            className="w-full"
          >
            {cameraEnabled ? (
              <>
                <CameraSlash size={16} className="mr-2" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera size={16} className="mr-2" />
                Start Camera
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Note: QR code detection requires the html5-qrcode library. For now, use manual search
            below.
          </p>
        </div>

        {/* Manual Search */}
        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <MagnifyingGlass size={20} />
              Manual Search
            </h2>

            <div className="relative">
              <MagnifyingGlass
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                placeholder="Enter ticket number (e.g., TKT-123456)"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value.toUpperCase())}
                className="pl-9 font-mono"
              />
            </div>

            {/* Search Result */}
            {foundAttendee && (
              <div
                className={cn(
                  'p-4 rounded-lg border-2',
                  foundAttendee.status === 'checked_in'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : foundAttendee.status === 'cancelled'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-muted-foreground" />
                      <span className="font-medium">{foundAttendee.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Envelope size={14} />
                      {foundAttendee.email}
                    </div>
                    {foundAttendee.organization && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Buildings size={14} />
                        {foundAttendee.organization}
                      </div>
                    )}
                    <div className="font-mono text-xs bg-background px-2 py-1 rounded inline-block">
                      {foundAttendee.ticketNumber}
                    </div>
                  </div>

                  <div className="text-right">
                    {foundAttendee.status === 'checked_in' ? (
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Warning size={12} weight="bold" />
                          Already Checked In
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} />
                          {foundAttendee.checkedInAt &&
                            new Date(foundAttendee.checkedInAt).toLocaleTimeString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUndoCheckIn(foundAttendee._id)}
                        >
                          <ArrowCounterClockwise size={14} className="mr-1" />
                          Undo
                        </Button>
                      </div>
                    ) : foundAttendee.status === 'cancelled' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle size={12} weight="bold" />
                        Cancelled
                      </span>
                    ) : (
                      <Button onClick={() => handleCheckIn(foundAttendee._id)}>
                        <CheckCircle size={16} className="mr-2" />
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {manualSearch.length > 3 && !foundAttendee && (
              <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
                <XCircle size={24} className="mx-auto mb-2" />
                No attendee found with this ticket number
              </div>
            )}
          </div>

          {/* Last Check-In Result */}
          {lastResult && (
            <div
              className={cn(
                'p-4 rounded-lg border-2',
                lastResult.success
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              )}
            >
              <div className="flex items-center gap-3">
                {lastResult.success ? (
                  <CheckCircle size={32} className="text-green-600" weight="fill" />
                ) : (
                  <XCircle size={32} className="text-red-600" weight="fill" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{lastResult.message}</div>
                  {lastResult.attendee && (
                    <div className="text-sm text-muted-foreground">
                      {lastResult.attendee.name} • {lastResult.attendee.ticketNumber}
                    </div>
                  )}
                </div>
                {lastResult.success && lastResult.attendee && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUndoCheckIn(lastResult.attendee!._id)}
                  >
                    <ArrowCounterClockwise size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Tip: USB barcode scanners work automatically with the manual search field</p>
      </div>
    </div>
  )
}
