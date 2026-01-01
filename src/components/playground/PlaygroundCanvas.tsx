import { useCallback, useEffect, useState } from 'react'
import { Tldraw, type Editor, type TLShapeId, type TLComponents } from 'tldraw'
import 'tldraw/tldraw.css'
import { customShapeUtils } from './shapes'

interface PlaygroundCanvasProps {
  onSelectionChange?: (shapeIds: TLShapeId[]) => void
  onEditorReady?: (editor: Editor) => void
}

// Hide all default tldraw UI components for a clean canvas
const components: TLComponents = {
  ContextMenu: null,
  ActionsMenu: null,
  HelpMenu: null,
  ZoomMenu: null,
  MainMenu: null,
  Minimap: null,
  StylePanel: null,
  PageMenu: null,
  NavigationPanel: null,
  Toolbar: null,
  KeyboardShortcutsDialog: null,
  QuickActions: null,
  HelperButtons: null,
  DebugPanel: null,
  DebugMenu: null,
  MenuPanel: null,
  TopPanel: null,
  SharePanel: null,
}

export function PlaygroundCanvas({ onSelectionChange, onEditorReady }: PlaygroundCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null)

  const handleMount = useCallback(
    (editorInstance: Editor) => {
      setEditor(editorInstance)
      onEditorReady?.(editorInstance)
    },
    [onEditorReady]
  )

  // Listen for selection changes
  useEffect(() => {
    if (!editor || !onSelectionChange) return

    const handleSelectionChange = () => {
      const selectedIds = Array.from(editor.getSelectedShapeIds())
      onSelectionChange(selectedIds)
    }

    const unsubscribe = editor.store.listen(handleSelectionChange, {
      source: 'user',
      scope: 'session',
    })

    return () => {
      unsubscribe()
    }
  }, [editor, onSelectionChange])

  return (
    <div className="w-full h-full playground-canvas">
      <Tldraw
        shapeUtils={customShapeUtils}
        onMount={handleMount}
        inferDarkMode
        components={components}
        hideUi={false}
      />
      <style>{`
        /* Clean canvas background */
        .playground-canvas .tl-background {
          background-color: var(--color-background) !important;
        }

        /* Subtle dot grid pattern */
        .playground-canvas .tl-canvas {
          background-image: radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        /* Hide any remaining tldraw UI */
        .playground-canvas .tlui-layout,
        .playground-canvas .tlui-layout__top,
        .playground-canvas .tlui-layout__bottom,
        .playground-canvas [class*="tlui-"],
        .playground-canvas [class*="watermark"],
        .playground-canvas [class*="Watermark"] {
          display: none !important;
        }

        /* Keep the canvas visible */
        .playground-canvas .tl-container,
        .playground-canvas .tl-canvas,
        .playground-canvas .tl-background,
        .playground-canvas .tl-shapes,
        .playground-canvas .tl-overlays {
          display: block !important;
        }

        /* Custom selection colors */
        .playground-canvas .tl-selection__bg {
          stroke: var(--color-purple) !important;
          stroke-width: 1.5px !important;
        }

        .playground-canvas .tl-selection__fg {
          stroke: var(--color-purple) !important;
        }

        /* Selection handles */
        .playground-canvas .tl-corner-handle,
        .playground-canvas .tl-edge-handle {
          fill: white !important;
          stroke: var(--color-purple) !important;
          stroke-width: 1.5px !important;
        }

        /* Rotation handle */
        .playground-canvas .tl-rotate-handle {
          fill: white !important;
          stroke: var(--color-purple) !important;
        }

        /* Cursor styles */
        .playground-canvas .tl-cursor {
          color: var(--color-purple) !important;
        }
      `}</style>
    </div>
  )
}
