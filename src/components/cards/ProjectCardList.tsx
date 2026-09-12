import {
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { AnimatedNumber } from '../reusables/AnimatedNumber'
import { useTranslation } from 'react-i18next'
import { IconChevronDown, IconNode, IconPin } from '../../lib/icons'
import { isReducedMotion } from '../../lib/appearance'
import { UNCATEGORIZED_KEY } from '../../lib/projectDrag'
import { AUTO_SCROLL_CONFIG, DRAG_FEEL } from '../../lib/dragFeel'
import { useProjectDnd } from '../../hooks/useProjectDnd'
import {
  ProjectDragOverlay,
  ProjectDropLine,
  SortableProjectItem,
} from '../dnd/ProjectDnd'
import type { Category, Project } from '../../types'

const DEFAULT_ANIMATION_THRESHOLD = 20
const UNCATEGORIZED = UNCATEGORIZED_KEY

interface ProjectCardListProps {
  projects: Project[]
  renderCard: (project: Project) => ReactNode
  hasActiveFilters: boolean
  totalCount: number
  animationThreshold?: number
  categories?: Category[]
  categoriesEnabled?: boolean
  onReorder?: (orderedIds: string[]) => Promise<void>
  onMoveProject?: (
    id: string,
    category: string,
    destOrderedIds: string[],
  ) => Promise<void>
}

function CategorySection({
  title,
  color,
  count,
  children,
  defaultOpen = true,
  disableAnimation = false,
  droppableId,
}: {
  title: string
  color?: string
  count: number
  children: ReactNode
  defaultOpen?: boolean
  disableAnimation?: boolean
  droppableId?: string
}) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(defaultOpen)
  const isEmpty = count === 0
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId ?? `list-cat-${title}`,
    disabled: !isEmpty,
  })

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring cursor-pointer w-full flex items-center gap-1.5 px-1 py-1 rounded-item text-left hover:bg-raised/60 transition-colors group"
      >
        <IconChevronDown
          className={`w-3 h-3 text-muted/50 shrink-0 transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
        {color && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted/50 group-hover:text-muted transition-colors">
          {title}
        </span>
        <div className="flex-1 h-px bg-outline/30 mx-1.5" />
        <span className="text-[10px] font-medium text-muted/50 tabular-nums shrink-0">
          · <AnimatedNumber value={count} />
        </span>
      </button>

      <div
        className={`grid ${
          disableAnimation
            ? ''
            : 'transition-[grid-template-rows] duration-200 ease-out'
        } ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden min-h-0">
          <div
            ref={isEmpty ? setNodeRef : undefined}
            className={`flex flex-col gap-2 pt-2 pb-0.5 rounded-item transition-colors duration-150 ${
              isOver ? 'bg-accent/10 ring-1 ring-accent/30' : ''
            }`}
          >
            {children}
            {isEmpty && !isOver && (
              <div className="flex items-center justify-center py-6">
                <span className="text-xs text-muted/40 select-none">
                  {t('empty_category')}
                </span>
              </div>
            )}
            {isEmpty && isOver && (
              <div className="flex items-center justify-center py-6">
                <span className="text-xs text-accent-bright font-medium select-none">
                  {t('release_to_drop')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProjectCardList({
  projects,
  renderCard,
  hasActiveFilters,
  totalCount,
  animationThreshold = DEFAULT_ANIMATION_THRESHOLD,
  categories = [],
  categoriesEnabled = false,
  onReorder,
  onMoveProject,
}: ProjectCardListProps) {
  const { t } = useTranslation('common')

  const animateList = totalCount <= animationThreshold && !isReducedMotion()
  const layoutTransition: Transition = {
    type: 'spring',
    stiffness: 350,
    damping: 30,
    mass: 0.8,
  }

  const showPinnedSection = projects.some((p) => p.pinned)
  const pinnedProjects = showPinnedSection
    ? projects.filter((p) => p.pinned)
    : []
  const unpinnedProjects = showPinnedSection
    ? projects.filter((p) => !p.pinned)
    : projects

  const grouped = categoriesEnabled && categories.length > 0

  const groups = useMemo(() => {
    const map = new Map<string, Project[]>()
    for (const p of unpinnedProjects) {
      const key = p.category || UNCATEGORIZED
      const list = map.get(key)
      if (list) list.push(p)
      else map.set(key, [p])
    }
    return map
  }, [unpinnedProjects])

  /** Category keys in the order they are rendered, including stray ones. */
  const orderedCategoryKeys = useMemo(() => {
    const keys: string[] = []
    for (const cat of categories) {
      if (groups.has(cat.name)) keys.push(cat.name)
    }
    if (groups.has(UNCATEGORIZED)) keys.push(UNCATEGORIZED)
    for (const key of groups.keys()) {
      if (!keys.includes(key)) keys.push(key)
    }
    return keys
  }, [categories, groups])

  /** Draggable projects in the exact order they appear on screen. */
  const sortableProjects = useMemo(() => {
    if (!grouped) return unpinnedProjects
    const ordered: Project[] = []
    for (const key of orderedCategoryKeys) {
      ordered.push(...(groups.get(key) ?? []))
    }
    return ordered
  }, [grouped, unpinnedProjects, orderedCategoryKeys, groups])

  const sortableIds = useMemo(
    () => sortableProjects.map((p) => p.id),
    [sortableProjects],
  )

  const isDndEnabled = Boolean(onReorder)

  const dnd = useProjectDnd({
    projects: sortableProjects,
    categories,
    grouped,
    prefixes: { category: 'list-cat-' },
    collisionDetection: closestCenter,
    onReorder,
    onMoveProject,
  })

  const cardBody = (p: Project) => renderCard(p)

  const animatedCard = (p: Project) =>
    animateList ? (
      <motion.div
        key={p.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={layoutTransition}
        className="min-w-0"
      >
        {cardBody(p)}
      </motion.div>
    ) : (
      <div key={p.id} className="min-w-0">
        {cardBody(p)}
      </div>
    )

  const pinnedCard = (p: Project) =>
    animateList ? (
      <motion.div
        key={p.id}
        layout
        layoutId={p.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={layoutTransition}
        className="min-w-0"
      >
        {cardBody(p)}
      </motion.div>
    ) : (
      <div key={p.id} className="min-w-0">
        {cardBody(p)}
      </div>
    )

  const sortableCard = (p: Project) => (
    <SortableProjectItem
      key={p.id}
      id={p.id}
      className="px-2"
      gripClassName="left-0.5"
    >
      {animatedCard(p)}
    </SortableProjectItem>
  )

  const cardFor = isDndEnabled ? sortableCard : animatedCard

  const pinnedHeader = (
    <div
      key="pinned-header"
      className="mt-1 mb-0.5 flex items-center gap-2 px-1 rounded-item"
    >
      <IconPin className="w-3 h-3 text-accent-bright" fill="currentColor" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {t('pinned_section')}
      </span>
      <span className="text-[10px] font-medium text-muted/50 tabular-nums">
        · <AnimatedNumber value={pinnedProjects.length} />
      </span>
      <div className="flex-1 h-px bg-outline/50" />
    </div>
  )

  const emptyState = animateList ? (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full flex flex-col items-center justify-center gap-2 text-center"
    >
      <IconNode className="w-5 h-5 text-muted/50" />
      <p className="text-sm text-muted">
        {hasActiveFilters ? t('no_projects_match') : t('no_projects_yet')}
      </p>
    </motion.div>
  ) : (
    <div
      key="empty"
      className="h-full flex flex-col items-center justify-center gap-2 text-center"
    >
      <IconNode className="w-5 h-5 text-muted/50" />
      <p className="text-sm text-muted">
        {hasActiveFilters ? t('no_projects_match') : t('no_projects_yet')}
      </p>
    </div>
  )

  const renderGrouped = (): ReactNode[] => {
    const result: ReactNode[] = []
    for (const cat of categories) {
      const projs = groups.get(cat.name) ?? []
      result.push(
        <CategorySection
          key={`cat-${cat.id}`}
          title={cat.name}
          color={cat.color}
          count={projs.length}
          defaultOpen={projs.length > 0}
          disableAnimation={isDndEnabled}
          droppableId={`list-cat-${cat.id}`}
        >
          {projs.map((p) => cardFor(p))}
        </CategorySection>,
      )
    }
    const uncategorized = groups.get(UNCATEGORIZED) ?? []
    result.push(
      <CategorySection
        key="cat-uncategorized"
        title={t('uncategorized')}
        count={uncategorized.length}
        defaultOpen={uncategorized.length > 0}
        disableAnimation={isDndEnabled}
        droppableId="list-cat-uncategorized"
      >
        {uncategorized.map((p) => cardFor(p))}
      </CategorySection>,
    )
    // Category names that no longer exist in the category list.
    for (const key of orderedCategoryKeys) {
      if (key === UNCATEGORIZED || categories.some((c) => c.name === key)) {
        continue
      }
      const projs = groups.get(key) ?? []
      result.push(
        <CategorySection
          key={`cat-stray-${key}`}
          title={key}
          count={projs.length}
          defaultOpen={projs.length > 0}
          disableAnimation={isDndEnabled}
          droppableId={`list-cat-${key}`}
        >
          {projs.map((p) => cardFor(p))}
        </CategorySection>,
      )
    }
    return result
  }

  const unpinnedContent = grouped
    ? renderGrouped()
    : unpinnedProjects.map((p) => cardFor(p))

  const listChildren: ReactNode[] =
    projects.length === 0
      ? [emptyState]
      : showPinnedSection
        ? [
            <div
              key="pinned-top-divider"
              className="h-0.5 my-1 bg-outline"
              style={{ backgroundColor: 'var(--color-outline)' }}
            />,
            pinnedHeader,
            ...pinnedProjects.map((p) => pinnedCard(p)),
            <div
              key="pinned-bottom-divider"
              className="h-0.5 my-1 bg-outline"
              style={{ backgroundColor: 'var(--color-outline)' }}
            />,
            ...unpinnedContent,
          ]
        : unpinnedContent

  const list = animateList ? (
    <AnimatePresence initial={false}>{listChildren}</AnimatePresence>
  ) : (
    listChildren
  )

  return (
    <div className="flex-1 min-h-0 relative flex flex-col gap-2">
      {isDndEnabled ? (
        <DndContext
          sensors={dnd.sensors}
          collisionDetection={dnd.collisionDetection ?? closestCenter}
          autoScroll={AUTO_SCROLL_CONFIG}
          onDragStart={dnd.handleDragStart}
          onDragMove={dnd.handleDragMove}
          onDragEnd={dnd.handleDragEnd}
          onDragCancel={dnd.handleDragCancel}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {list}
          </SortableContext>
          <ProjectDropLine ignorePrefix="list-cat-" />
          <DragOverlay
            dropAnimation={{
              duration: DRAG_FEEL.drop.duration,
              easing: DRAG_FEEL.drop.easing,
            }}
          >
            {dnd.activeProject ? (
              <ProjectDragOverlay innerRef={dnd.overlayRef}>
                <div className="px-2">{cardBody(dnd.activeProject)}</div>
              </ProjectDragOverlay>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        list
      )}
      {projects.length > 0 && (
        <div className="shrink-0 h-4" aria-hidden="true" />
      )}
    </div>
  )
}
