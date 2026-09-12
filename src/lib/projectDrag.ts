import { arrayMove } from '@dnd-kit/sortable'
import type { Category, Project } from '../types'

/**
 * Sentinel key for projects that have no category. Used internally by the drag
 * layer so uncategorized projects can be grouped/dropped like any other.
 */
export const UNCATEGORIZED_KEY = '__uncategorized__'

/** The droppable id used for a category zone is `${prefix}${suffix}`. */
export interface DroppablePrefixes {
  /** e.g. `list-cat-` / `grid-cat-` / `kanban-cat-` */
  category: string
}

export type ProjectDropResolution =
  | { type: 'none' }
  /** Manual reorder inside the current (flat) list or a single category. */
  | { type: 'reorder'; orderedIds: string[] }
  /** Move into another category, optionally landing at a specific position. */
  | {
      type: 'move'
      activeId: string
      categoryName: string
      destOrderedIds: string[]
    }

export function categoryKeyOf(project: Pick<Project, 'category'>): string {
  return project.category || UNCATEGORIZED_KEY
}

/** Translate a droppable id suffix (`<category.id>` or `uncategorized`) to a category key. */
function categoryKeyFromSuffix(suffix: string, categories: Category[]): string {
  if (suffix === 'uncategorized') return UNCATEGORIZED_KEY
  return categories.find((c) => c.id === suffix)?.name ?? suffix
}

function idsOf(projects: Project[]): string[] {
  return projects.map((p) => p.id)
}

export interface ProjectDropInput {
  activeId: string
  overId: string
  /**
   * The draggable projects in the order they appear in the DOM. Pinned projects
   * are never draggable and must be excluded.
   */
  projects: Project[]
  categories: Category[]
  /** Whether the view renders the projects grouped into their categories. */
  grouped: boolean
  prefixes: DroppablePrefixes
}

/**
 * Pure resolution of a drag end. Given where a card started and where it was
 * dropped, work out whether it was reordered, moved to another category, or
 * nothing at all. No side effects so both the UI and tests can share it.
 */
export function resolveProjectDrop({
  activeId,
  overId,
  projects,
  categories,
  grouped,
  prefixes,
}: ProjectDropInput): ProjectDropResolution {
  if (activeId === overId) return { type: 'none' }

  // Flat list: a simple index move over everything draggable.
  if (!grouped) {
    const ids = idsOf(projects)
    const from = ids.indexOf(activeId)
    const to = ids.indexOf(overId)
    if (from === -1 || to === -1 || from === to) return { type: 'none' }
    return { type: 'reorder', orderedIds: arrayMove(ids, from, to) }
  }

  const dragged = projects.find((p) => p.id === activeId)
  if (!dragged) return { type: 'none' }
  const draggedKey = categoryKeyOf(dragged)

  const zoneSuffix = overId.startsWith(prefixes.category)
    ? overId.slice(prefixes.category.length)
    : null

  let targetKey: string
  let insertIndex: number | null = null
  let droppedOnZone = false

  if (zoneSuffix !== null) {
    droppedOnZone = true
    targetKey = categoryKeyFromSuffix(zoneSuffix, categories)
  } else {
    const overProject = projects.find((p) => p.id === overId)
    if (!overProject) return { type: 'none' }
    targetKey = categoryKeyOf(overProject)
    if (targetKey !== draggedKey) {
      const dest = projects.filter((p) => categoryKeyOf(p) === targetKey)
      const overIdx = dest.findIndex((p) => p.id === overId)
      insertIndex = overIdx >= 0 ? overIdx : dest.length
    }
  }

  // Same category: reorder in place.
  if (targetKey === draggedKey) {
    const ids = idsOf(projects.filter((p) => categoryKeyOf(p) === draggedKey))
    const from = ids.indexOf(activeId)
    if (from === -1) return { type: 'none' }
    const to = droppedOnZone ? ids.length - 1 : ids.indexOf(overId)
    if (to === -1 || from === to) return { type: 'none' }
    return { type: 'reorder', orderedIds: arrayMove(ids, from, to) }
  }

  // Cross-category move.
  const dest = projects.filter((p) => categoryKeyOf(p) === targetKey)
  const next = [...dest]
  next.splice(insertIndex ?? dest.length, 0, dragged)
  return {
    type: 'move',
    activeId,
    categoryName: targetKey === UNCATEGORIZED_KEY ? '' : targetKey,
    destOrderedIds: idsOf(next),
  }
}
