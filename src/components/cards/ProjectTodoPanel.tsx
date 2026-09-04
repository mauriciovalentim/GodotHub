import { useMemo, useRef, useState } from "react";
import { IconCheckCircle } from "../../lib/icons";

import { ProjectTodoModal } from "./ProjectTodoModal";
import { ProjectTodoDetailsModal } from "./ProjectTodoDetailsModal";
import { ProjectTodoList } from "./ProjectTodoList";
import { ProjectTodoListModal } from "./ProjectTodoListModal";
import { ConfirmDialog } from "../modals/ConfirmDialog";

import type { ProjectTodo, TodoStatus } from "../../types/projectTodo";

const mockTodos: ProjectTodo[] = [
  {
    id: "1",
    title: "Adicionar ícone do projeto",
    status: "done",
    area: "art",
    dueDate: "2026-08-20",
    createdAt: "2026-08-15",
  },
  {
    id: "2",
    title: "Revisar traduções",
    status: "done",
    area: "other",
    dueDate: "2026-08-23",
    createdAt: "2026-08-16",
  },
  {
    id: "3",
    title: "Criar menu principal",
    area: "programming",
    status: "in_progress",
    dueDate: "2026-08-29",
    description: "Implementar o menu principal do jogo com transições suaves.",
    createdAt: "2026-08-18",
  },
  {
    id: "4",
    title: "Melhorar interface do launcher",
    area: "design",
    status: "paused",
    dueDate: "2026-09-02",
    createdAt: "2026-08-20",
  },
  {
    id: "5",
    title: "Testar configurações de exportação fela da puta",
    area: "other",
    status: "todo",
    createdAt: "2026-08-21",
  },
];

type ProjectTodoPanelProps = {
  onClose: () => void;
};
type StatusSort = "completed-first" | "todo-first" | null;

type DueDateSort = "nearest-first" | "farthest-first" | null;
const statusConfig = {
  todo: {
    label: "A fazer",
    className: "bg-raised text-ink border border-outline/40",
    dotClassName: "bg-muted",
  },
  paused: {
    label: "Em pausa",
    className: "bg-amber/20 text-ink border border-amber/30",
    dotClassName: "bg-amber",
  },
  in_progress: {
    label: "Em andamento",
    className: "bg-accent/15 text-ink border border-accent/30",
    dotClassName: "bg-accent",
  },
  done: {
    label: "Concluída",
    className: "bg-mint/15 text-ink border border-mint/30",
    dotClassName: "bg-mint",
  },
} satisfies Record<
  TodoStatus,
  { label: string; className: string; dotClassName: string }
>;

const statusOrder = {
  todo: 0,
  paused: 1,
  in_progress: 2,
  done: 3,
} satisfies Record<TodoStatus, number>;

function sortProjectTodos(
  todos: ProjectTodo[],
  statusSort: StatusSort,
  dueDateSort: DueDateSort,
) {
  if (!statusSort && !dueDateSort) {
    return todos;
  }

  return todos
    .map((todo, index) => ({ todo, index }))
    .sort((a, b) => {
      if (dueDateSort) {
        const aDate = a.todo.dueDate;
        const bDate = b.todo.dueDate;

        if (!aDate && !bDate) {
          return a.index - b.index;
        }

        if (!aDate) return 1;
        if (!bDate) return -1;

        const dateDifference = aDate.localeCompare(bDate);

        if (dateDifference !== 0) {
          return dueDateSort === "nearest-first"
            ? dateDifference
            : -dateDifference;
        }

        return a.index - b.index;
      }

      if (statusSort) {
        const direction = statusSort === "completed-first" ? -1 : 1;

        const statusDifference =
          (statusOrder[a.todo.status] - statusOrder[b.todo.status]) * direction;

        if (statusDifference !== 0) {
          return statusDifference;
        }
      }

      return a.index - b.index;
    })
    .map(({ todo }) => todo);
}

function haveSameTodoOrder(first: ProjectTodo[], second: ProjectTodo[]) {
  return (
    first.length === second.length &&
    first.every((todo, index) => todo.id === second[index]?.id)
  );
}

function getTodayValue() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDueDate(
  dueDate: string | undefined,
  today: string,
  overdue: boolean,
) {
  if (!dueDate) return "—";

  const millisecondsPerDay = 86_400_000;
  const differenceInDays = Math.round(
    (new Date(`${dueDate}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime()) /
      millisecondsPerDay,
  );

  if (differenceInDays === 0) return "Hoje";
  if (differenceInDays === 1) return "Amanhã";
  if (overdue && differenceInDays === -1) return "ontem";
  if (overdue && differenceInDays >= -7)
    return `${Math.abs(differenceInDays)} dias`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${dueDate}T00:00:00`))
    .replace(" de ", " ");
}

export function ProjectTodoPanel({ onClose }: ProjectTodoPanelProps) {
  const [todos, setTodos] = useState<ProjectTodo[]>(mockTodos);
  const [statusSort, setStatusSort] = useState<StatusSort>(null);
  
  const [dueDateSort, setDueDateSort] = useState<DueDateSort>("nearest-first");
  const addTodo = (todo: ProjectTodo) => {
    setTodos((currentTodos) => [...currentTodos, todo]);
  };
  const updateTodo = (updatedTodo: ProjectTodo) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === updatedTodo.id ? updatedTodo : todo,
      ),
    );
  };

  const setTodoStatus = (todo: ProjectTodo, status: TodoStatus) => {
    previousStatusRef.current.delete(todo.id);

    updateTodo({
      ...todo,
      status,
    });
  };

  const toggleTodoCompleted = (todo: ProjectTodo) => {
    if (todo.status === "done") {
      const previousStatus = previousStatusRef.current.get(todo.id) ?? "todo";

      previousStatusRef.current.delete(todo.id);

      updateTodo({
        ...todo,
        status: previousStatus,
      });

      return;
    }

    previousStatusRef.current.set(todo.id, todo.status);

    updateTodo({
      ...todo,
      status: "done",
    });
  };

  const [isCreating, setIsCreating] = useState(false);
  const [viewingTodo, setViewingTodo] = useState<ProjectTodo | null>(null);
  const [editingTodo, setEditingTodo] = useState<ProjectTodo | null>(null);
  const [showAllTodos, setShowAllTodos] = useState(false);
  const [deletingTodo, setDeletingTodo] = useState<ProjectTodo | null>(null);

  const previousStatusRef = useRef<Map<string, TodoStatus>>(new Map());
const pendingCount = todos.filter(
  (todo) => todo.status !== "done",
).length;

const sortedTodos = useMemo(
  () => sortProjectTodos(todos, statusSort, dueDateSort),
  [todos, statusSort, dueDateSort],
);

const compactTodos = sortedTodos
  .filter((todo) => todo.status !== "done")
  .slice(0, 5);

const fullTodos = useMemo(
  () => [
    ...sortedTodos.filter((todo) => todo.status !== "done"),
    ...sortedTodos.filter((todo) => todo.status === "done"),
  ],
  [sortedTodos],
);

  const toggleStatusSort = () => {
    const preferredDirection =
      statusSort === "completed-first" ? "todo-first" : "completed-first";

    const oppositeDirection =
      preferredDirection === "completed-first"
        ? "todo-first"
        : "completed-first";

    const preferredOrder = sortProjectTodos(todos, preferredDirection, null);

    const oppositeOrder = sortProjectTodos(todos, oppositeDirection, null);

    const nextDirection =
      haveSameTodoOrder(preferredOrder, sortedTodos) &&
      !haveSameTodoOrder(oppositeOrder, sortedTodos)
        ? oppositeDirection
        : preferredDirection;

    setDueDateSort(null);
    setStatusSort(nextDirection);
  };

  const toggleDueDateSort = () => {
    const preferredDirection =
      dueDateSort === "nearest-first" ? "farthest-first" : "nearest-first";

    const oppositeDirection =
      preferredDirection === "nearest-first"
        ? "farthest-first"
        : "nearest-first";

    const preferredOrder = sortProjectTodos(todos, null, preferredDirection);

    const oppositeOrder = sortProjectTodos(todos, null, oppositeDirection);

    const nextDirection =
      haveSameTodoOrder(preferredOrder, sortedTodos) &&
      !haveSameTodoOrder(oppositeOrder, sortedTodos)
        ? oppositeDirection
        : preferredDirection;

    setStatusSort(null);
    setDueDateSort(nextDirection);
  };
  const today = getTodayValue();

  const viewingTodoOverdue = viewingTodo
    ? !!viewingTodo.dueDate &&
      viewingTodo.dueDate < today &&
      viewingTodo.status !== "done"
    : false;

  return (
    <div className="rounded-b-item border-x border-b border-outline/50 bg-overlay">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Próximos passos
          </span>
        </div>

        <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted">
  {pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}
</span>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="focus-ring cursor-pointer inline-flex items-center gap-1.5 rounded-btn border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-[10px] font-medium text-accent-bright transition-colors hover:border-accent/50 hover:bg-accent/20"
          >
            <span className="text-xs font-semibold">+</span>
            Nova tarefa
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Ocultar próximos passos"
            className="text-muted cursor-pointer"
          >
            ⌃
          </button>
        </div>
      </div>

     {/* Tarefas */}
{todos.length === 0 ? (
  <div className="mx-3.5 mb-2 flex flex-col items-center justify-center rounded-item border border-outline/50 px-4 py-10 text-center">
    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent-bright">
      <IconCheckCircle aria-hidden="true" className="h-4 w-4" />
    </span>

    <p className="text-sm font-medium text-ink">
      Nenhuma tarefa ainda
    </p>

    <p className="mt-1 text-[11px] text-muted">
      Adicione o primeiro próximo passo deste projeto.
    </p>

    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="focus-ring mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-btn border border-accent/30 bg-accent/10 px-3 py-1.5 text-[11px] font-medium text-accent-bright transition-colors hover:border-accent/50 hover:bg-accent/20"
    >
      <span className="text-xs font-semibold">+</span>
      Criar tarefa
    </button>
  </div>
) : (
  <>
    {pendingCount === 0 ? (
      <div className="mx-3.5 mb-2 flex flex-col items-center justify-center rounded-item border border-outline/50 px-4 py-10 text-center">
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-mint/10 text-mint">
          <IconCheckCircle aria-hidden="true" className="h-4 w-4" />
        </span>

        <p className="text-sm font-medium text-ink">
          Tudo concluído
        </p>

        <p className="mt-1 text-[11px] text-muted">
          Você concluiu todos os próximos passos deste projeto.
        </p>
      </div>
    ) : (
   <ProjectTodoList
  todos={compactTodos}
  today={today}
  statusSort={statusSort}
  dueDateSort={dueDateSort}
  statusConfig={statusConfig}
  className="mx-3.5 mb-2"
  formatDueDate={formatDueDate}
  onToggleStatusSort={toggleStatusSort}
  onToggleDueDateSort={toggleDueDateSort}
  onToggleCompleted={toggleTodoCompleted}
  onSetStatus={setTodoStatus}
  onUpdate={updateTodo}
  onView={setViewingTodo}
  onEdit={setEditingTodo}
  onDelete={setDeletingTodo}
/>   
    )}
      {/* Rodapé */}
      <div className="flex items-center justify-between px-3.5 pb-2.5">
        <span className="text-[10px] text-muted">
          Use a lista para acompanhar os próximos passos do projeto.
        </span>

        <button
          type="button"
          className="focus-ring cursor-pointer rounded-btn border border-outline/50 px-2.5 py-1.5 text-[10px] text-muted transition-colors hover:border-accent-dim hover:bg-raised hover:text-ink"
          onClick={() => setShowAllTodos(true)}
        >
          Ver todas
        </button>
      </div>
        </>
)}
{showAllTodos &&
  !viewingTodo &&
  !isCreating &&
  !editingTodo &&
  !deletingTodo && (
    <ProjectTodoListModal
      totalCount={todos.length}
      pendingCount={pendingCount}
      onCreate={() => setIsCreating(true)}
      onClose={() => setShowAllTodos(false)}
    >
      <ProjectTodoList
        todos={fullTodos}
        today={today}
        statusSort={statusSort}
        dueDateSort={dueDateSort}
        statusConfig={statusConfig}
        showArea
        formatDueDate={formatDueDate}
        onToggleStatusSort={toggleStatusSort}
        onToggleDueDateSort={toggleDueDateSort}
        onToggleCompleted={toggleTodoCompleted}
        onSetStatus={setTodoStatus}
        onUpdate={updateTodo}
        onView={setViewingTodo}
        onEdit={setEditingTodo}
        onDelete={setDeletingTodo}
      />
    </ProjectTodoListModal>
  )}
      {viewingTodo && (
        <ProjectTodoDetailsModal
          todo={viewingTodo}
          statusLabel={statusConfig[viewingTodo.status].label}
          statusClassName={statusConfig[viewingTodo.status].className}
          overdue={viewingTodoOverdue}
          onClose={() => setViewingTodo(null)}
        />
      )}
      {isCreating && (
        <ProjectTodoModal
          onClose={() => setIsCreating(false)}
          onSubmit={addTodo}
        />
      )}

      {editingTodo && (
        <ProjectTodoModal
          todo={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSubmit={updateTodo}
        />
      )}

      {deletingTodo && (
        <ConfirmDialog
          title="Excluir tarefa?"
          description={
            <>
              A tarefa <strong>“{deletingTodo.title}”</strong> será excluída.
              Esta ação não pode ser desfeita.
            </>
          }
          confirmLabel="Excluir"
          variant="danger"
          onConfirm={() => {
            setTodos((currentTodos) =>
              currentTodos.filter((todo) => todo.id !== deletingTodo.id),
            );

            setDeletingTodo(null);
          }}
          onCancel={() => setDeletingTodo(null)}
        />
      )}
    </div>
  );
}
