import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type RowInfo = {
  index: number
  /** The drag handle. SortableList already places it beside the row, so renderItem need not. */
  handle: ReactNode
  moveUp: () => void
  moveDown: () => void
  isFirst: boolean
  isLast: boolean
}

type Props<T> = {
  items: T[]
  getId: (item: T) => string
  /** Receives the full list of ids in the new order. */
  onReorder: (ids: string[]) => void
  /** Renders the row's content. The drag handle and move buttons come from SortableList. */
  renderItem: (item: T, info: RowInfo) => ReactNode
  /** What a screen reader calls the item while it's dragged, e.g. its title. */
  getLabel: (item: T) => string
}

// Pointer drags start after a small movement, so tapping a row's buttons
// doesn't begin a drag.
function useOrderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}

const GripIcon = () => (
  <svg viewBox="0 0 12 18" aria-hidden="true" className="h-4 w-3" fill="currentColor">
    {[3, 9, 15].map((cy) => (
      <g key={cy}>
        <circle cx="3" cy={cy} r="1.4" />
        <circle cx="9" cy={cy} r="1.4" />
      </g>
    ))}
  </svg>
)

const moveButton =
  'min-h-11 px-2 text-[11px] uppercase tracking-[0.2em] text-warm-gray-deep transition-colors hover:text-charcoal disabled:opacity-35'

type RowProps<T> = {
  id: string
  item: T
  index: number
  total: number
  grid: boolean
  move: (from: number, to: number) => void
  renderItem: (item: T, info: RowInfo) => ReactNode
}

function SortableRow<T>({ id, item, index, total, grid, move, renderItem }: RowProps<T>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const isFirst = index === 0
  const isLast = index === total - 1
  const moveUpLabel = grid ? 'Move earlier' : 'Move up'
  const moveDownLabel = grid ? 'Move later' : 'Move down'

  // Only the handle starts a drag, so touch scrolling still works over the row.
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Drag to reorder, position ${index + 1} of ${total}`}
      className="flex min-h-11 min-w-11 touch-none cursor-grab items-center justify-center text-warm-gray-deep hover:text-charcoal active:cursor-grabbing"
    >
      <GripIcon />
    </button>
  )

  const info: RowInfo = {
    index,
    handle,
    moveUp: () => move(index, index - 1),
    moveDown: () => move(index, index + 1),
    isFirst,
    isLast,
  }

  const up = (
    <button type="button" aria-label={moveUpLabel} disabled={isFirst} onClick={info.moveUp} className={moveButton}>
      {grid ? 'Earlier' : 'Move up'}
    </button>
  )
  const down = (
    <button type="button" aria-label={moveDownLabel} disabled={isLast} onClick={info.moveDown} className={moveButton}>
      {grid ? 'Later' : 'Move down'}
    </button>
  )

  const lift = isDragging ? 'relative z-10 shadow-lg' : ''

  if (grid) {
    return (
      <li ref={setNodeRef} style={style} className={`flex min-w-0 flex-col ${lift}`}>
        <div className="min-w-0 flex-1">{renderItem(item, info)}</div>
        <div className="flex items-center justify-between border-t border-line">
          {handle}
          <div className="flex">
            {up}
            {down}
          </div>
        </div>
      </li>
    )
  }

  return (
    // On a phone the controls sit in a bar under the card, so the card keeps
    // the full width; from sm up they stack in a column beside it.
    <li ref={setNodeRef} style={style} className={`flex flex-col sm:flex-row sm:gap-3 ${lift}`}>
      <div className="order-last flex items-center justify-between border-x border-b border-line sm:order-first sm:w-24 sm:shrink-0 sm:flex-col sm:justify-start sm:border-0">
        {handle}
        <div className="flex sm:flex-col sm:items-center">
          {up}
          {down}
        </div>
      </div>
      <div className="min-w-0 flex-1">{renderItem(item, info)}</div>
    </li>
  )
}

function SortableBase<T>({
  items,
  getId,
  onReorder,
  renderItem,
  getLabel,
  grid,
}: Props<T> & { grid: boolean }) {
  const sensors = useOrderSensors()
  const ids = items.map(getId)

  // dnd-kit's default announcements read out raw ids; say the item's name and
  // where it would land instead.
  const nameOf = (id: string | number) => {
    const i = ids.indexOf(String(id))
    return i < 0 ? 'Item' : getLabel(items[i])
  }
  const spot = (id: string | number) => `position ${ids.indexOf(String(id)) + 1} of ${ids.length}`
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, ${spot(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} moved to ${spot(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped at ${spot(over.id)}.` : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= ids.length) return
    onReorder(arrayMove(ids, from, to))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Press space to pick this up. Use the arrow keys to move it, space again to drop it, or escape to cancel.',
        },
      }}
    >
      <SortableContext items={ids} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'flex flex-col gap-6'}>
          {items.map((item, index) => (
            <SortableRow
              key={ids[index]}
              id={ids[index]}
              item={item}
              index={index}
              total={items.length}
              grid={grid}
              move={move}
              renderItem={renderItem}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

/** A vertical list the owner can reorder by dragging, or with the move buttons on a phone. */
export function SortableList<T>(props: Props<T>) {
  return <SortableBase {...props} grid={false} />
}

/** The same behaviour for a grid of tiles, such as gallery photos. Buttons read "Earlier" and "Later". */
export function SortableGrid<T>(props: Props<T>) {
  return <SortableBase {...props} grid />
}
