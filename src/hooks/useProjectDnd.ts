import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { isReducedMotion } from '../lib/appearance'
import { DRAG_FEEL } from '../lib/dragFeel'
import {
  resolveProjectDrop,
  type DroppablePrefixes,
} from '../lib/projectDrag'
import type { Category, Project } from '../types'

export interface UseProjectDndOptions {
  /** Draggable projects in DOM order (pinned projects excluded). */
  projects: Project[]
  categories: Category[]
  grouped: boolean
  prefixes: DroppablePrefixes
  collisionDetection?: CollisionDetection
  onReorder?: (orderedIds: string[]) => Promise<void> | void
  onMoveProject?: (
    id: string,
    category: string,
    destOrderedIds: string[],
  ) => Promise<void> | void
}

/**
 * Owns everything drag related for a projects surface: sensors, the active
 * card, the overlay transform, and the drop resolution.
 *
 * The tilt is written straight to the overlay's DOM node instead of React
 * state. Drag move fires many times a second, and re-rendering a list of cards
 * on every one of those would make the card visibly trail the pointer.
 */
export function useProjectDnd({
  projects,
  categories,
  grouped,
  prefixes,
  collisionDetection,
  onReorder,
  onMoveProject,
}: UseProjectDndOptions) {
  const reducedMotion = isReducedMotion()
  const overlayRef = useRef<HTMLDivElement | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small threshold so clicks, text selection and buttons keep working.
      activationConstraint: { distance: DRAG_FEEL.activationDistance },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const [activeId, setActiveId] = useState<string | null>(null)

  const byId = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  const motion = useRef({ x: 0, t: 0, angle: 0 })

  const paintTilt = useCallback((angle: number) => {
    const el = overlayRef.current
    if (!el) return
    el.style.transform = `rotate(${angle}deg) scale(${DRAG_FEEL.lift.scale})`
  }, [])

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
    motion.current = { x: 0, t: performance.now(), angle: 0 }
  }, [])

  const handleDragMove = useCallback(
    (e: DragMoveEvent) => {
      if (reducedMotion) return
      const now = performance.now()
      const dt = now - motion.current.t
      if (dt < DRAG_FEEL.tilt.sampleMs) return
      const vx = (e.delta.x - motion.current.x) / dt
      const { maxDeg, velocityScale, damping } = DRAG_FEEL.tilt
      const target = Math.max(-maxDeg, Math.min(maxDeg, vx * velocityScale))
      motion.current.x = e.delta.x
      motion.current.t = now
      motion.current.angle += (target - motion.current.angle) * damping
      paintTilt(motion.current.angle)
    },
    [reducedMotion, paintTilt],
  )

  const reset = useCallback(() => {
    setActiveId(null)
    motion.current = { x: 0, t: 0, angle: 0 }
    paintTilt(0)
  }, [paintTilt])

  const handleDragCancel = useCallback(() => reset(), [reset])

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e
      reset()
      if (!over) return
      const resolution = resolveProjectDrop({
        activeId: String(active.id),
        overId: String(over.id),
        projects,
        categories,
        grouped,
        prefixes,
      })
      if (resolution.type === 'reorder') {
        await onReorder?.(resolution.orderedIds)
      } else if (resolution.type === 'move') {
        await onMoveProject?.(
          resolution.activeId,
          resolution.categoryName,
          resolution.destOrderedIds,
        )
      }
    },
    [
      reset,
      projects,
      categories,
      grouped,
      prefixes,
      onReorder,
      onMoveProject,
    ],
  )

  // Hold a grabbing cursor and suppress text selection for the whole drag so
  // the interaction reads the same everywhere on screen.
  useEffect(() => {
    if (!activeId) return
    const { body } = document
    const prevCursor = body.style.cursor
    const prevSelect = body.style.userSelect
    body.style.cursor = 'grabbing'
    body.style.userSelect = 'none'
    return () => {
      body.style.cursor = prevCursor
      body.style.userSelect = prevSelect
    }
  }, [activeId])

  const activeProject = activeId ? byId.get(activeId) ?? null : null

  return {
    sensors,
    activeId,
    activeProject,
    overlayRef,
    collisionDetection,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  }
}
