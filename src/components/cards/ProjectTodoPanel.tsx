import { useMemo, useRef, useState } from "react";
import { Dropdown } from "../ui/Dropdown";
import { DatePicker } from "../ui/DatePicker";
import { IconMore, IconPencil, IconTrash } from "../../lib/icons";

import { ProjectTodoModal } from "./ProjectTodoModal";
import { ConfirmDialog } from "../modals/ConfirmDialog";

import type { ProjectTodo, TodoStatus } from "../../types/projectTodo";

const mockTodos: ProjectTodo[] = [
  {
    id: "1",
    title: "Adicionar ícone do projeto",
    status: "done",
    dueDate: "2026-08-20",
    createdAt: "2026-08-15",
  },
  {
    id: "2",
    title: "Revisar traduções",
    status: "done",
    dueDate: "2026-08-23",
    createdAt: "2026-08-16",
  },
  {
    id: "3",
    title: "Criar menu principal",
    status: "in_progress",
    dueDate: "2026-08-29",
    description: "Implementar o menu principal do jogo com transições suaves.",
    createdAt: "2026-08-18",
  },
  {
    id: "4",
    title: "Melhorar interface do launcher",
    status: "paused",
    dueDate: "2026-09-02",
    createdAt: "2026-08-20",
  },
  {
    id: "5",
    title: "Testar configurações de exportação fela da puta",
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
        const direction =
          statusSort === "completed-first" ? -1 : 1;

        const statusDifference =
          (statusOrder[a.todo.status] -
            statusOrder[b.todo.status]) *
          direction;

        if (statusDifference !== 0) {
          return statusDifference;
        }
      }

      return a.index - b.index;
    })
    .map(({ todo }) => todo);
}

function haveSameTodoOrder(
  first: ProjectTodo[],
  second: ProjectTodo[],
) {
  return (
    first.length === second.length &&
    first.every(
      (todo, index) => todo.id === second[index]?.id,
    )
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
  const [dueDateSort, setDueDateSort] =
    useState<DueDateSort>("nearest-first");
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
  const [editingTodo, setEditingTodo] = useState<ProjectTodo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<ProjectTodo | null>(null);

  const previousStatusRef = useRef<Map<string, TodoStatus>>(new Map());
  const completedCount = todos.filter((todo) => todo.status === "done").length;

  const progress =
    todos.length === 0 ? 0 : (completedCount / todos.length) * 100;

  const sortedTodos = useMemo(
    () => sortProjectTodos(todos, statusSort, dueDateSort),
    [todos, statusSort, dueDateSort],
  );

  const toggleStatusSort = () => {
    const preferredDirection =
      statusSort === "completed-first"
        ? "todo-first"
        : "completed-first";

    const oppositeDirection =
      preferredDirection === "completed-first"
        ? "todo-first"
        : "completed-first";

    const preferredOrder = sortProjectTodos(
      todos,
      preferredDirection,
      null,
    );

    const oppositeOrder = sortProjectTodos(
      todos,
      oppositeDirection,
      null,
    );

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
      dueDateSort === "nearest-first"
        ? "farthest-first"
        : "nearest-first";

    const oppositeDirection =
      preferredDirection === "nearest-first"
        ? "farthest-first"
        : "nearest-first";

    const preferredOrder = sortProjectTodos(
      todos,
      null,
      preferredDirection,
    );

    const oppositeOrder = sortProjectTodos(
      todos,
      null,
      oppositeDirection,
    );

    const nextDirection =
      haveSameTodoOrder(preferredOrder, sortedTodos) &&
      !haveSameTodoOrder(oppositeOrder, sortedTodos)
        ? oppositeDirection
        : preferredDirection;

    setStatusSort(null);
    setDueDateSort(nextDirection);
  };
  const today = getTodayValue();
  return (
    <div className="border-t border-outline/50">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Próximos passos
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted">
            {completedCount} / {todos.length} concluídas
          </span>

          <div className="w-20 h-1 rounded-full bg-raised overflow-hidden">
            <div
              className="h-full bg-accent rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

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
      <div className="mx-3.5 mb-2 border border-outline/50 rounded-item overflow-hidden">
        <div className="flex items-center gap-3 border-b border-outline/40 px-3 py-3">
          <span className="w-3.5 shrink-0" />

          <span className="flex-1 text-[9px] font-medium uppercase tracking-wide text-muted/60">
            Tarefa
          </span>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleStatusSort}
              className="focus-ring min-w-[88px] cursor-pointer rounded-btn text-center text-[9px] font-medium uppercase tracking-wide text-muted/60 transition-colors hover:bg-raised hover:text-ink"
              title="Ordenar por status"
            >
              Status{" "}
              {statusSort === "completed-first"
                ? "↓"
                : statusSort === "todo-first"
                  ? "↑"
                  : ""}
            </button>

            <button
              type="button"
              onClick={toggleDueDateSort}
              className="focus-ring min-w-[48px] cursor-pointer rounded-btn text-right text-[9px] font-medium uppercase tracking-wide text-muted/60 transition-colors hover:bg-raised hover:text-ink"
              title="Ordenar por prazo"
            >
              Prazo{" "}
              {dueDateSort === "nearest-first"
                ? "↑"
                : dueDateSort === "farthest-first"
                  ? "↓"
                  : ""}
            </button>

            <span className="w-6 shrink-0" />
          </div>
        </div>
        {sortedTodos.map((todo, index) => {
          const status = statusConfig[todo.status];
          const completed = todo.status === "done";
          const overdue =
            !!todo.dueDate && todo.dueDate < today && todo.status !== "done";
          return (
            <div
              key={todo.id}
              className={`flex items-center gap-3 px-3 py-2 ${
                index < sortedTodos.length - 1
                  ? "border-b border-outline/40"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={() => toggleTodoCompleted(todo)}
                aria-label={
                  completed
                    ? "Marcar tarefa como não concluída"
                    : "Marcar tarefa como concluída"
                }
                className="focus-ring flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-btn"
              >
                {completed ? (
                  <span className="text-mint">✓</span>
                ) : (
                  <span className="h-3.5 w-3.5 rounded border border-outline transition-colors hover:border-mint" />
                )}
              </button>

              <span
                className={`flex-1 text-[11px] ${
                  completed ? "text-muted line-through" : "text-ink"
                }`}
              >
                {todo.title}
              </span>

              <div className="flex shrink-0 items-center gap-2">
                <Dropdown
                  align="right"
                  compact
                  activeItemClassName="bg-raised text-ink hover:bg-raised"
                  menuClassName="!min-w-40!"
                  trigger={({ open, toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      aria-label={`Alterar status: ${status.label}`}
                      aria-expanded={open}
                      className={`focus-ring min-w-[88px] shrink-0 cursor-pointer rounded-tag border px-2 py-1 text-center text-[10px] transition-all hover:brightness-95 ${status.className} ${
                        open ? "ring-1 ring-accent/40" : ""
                      }`}
                    >
                      {status.label}
                    </button>
                  )}
                  items={[
                    {
                      key: "todo",
                      label: "A fazer",
                      leading: (
                        <span
                          aria-hidden="true"
                          className={`mr-1 block h-2 w-2 rounded-full ${statusConfig.todo.dotClassName}`}
                        />
                      ),
                      shortcut: todo.status === "todo" ? "✓" : undefined,
                      active: todo.status === "todo",
                      onClick: () => setTodoStatus(todo, "todo"),
                    },
                    {
                      key: "paused",
                      label: "Em pausa",
                      leading: (
                        <span
                          aria-hidden="true"
                          className={`mr-1 block h-2 w-2 rounded-full ${statusConfig.paused.dotClassName}`}
                        />
                      ),
                      shortcut: todo.status === "paused" ? "✓" : undefined,
                      active: todo.status === "paused",
                      onClick: () => setTodoStatus(todo, "paused"),
                    },
                    {
                      key: "in-progress",
                      label: "Em andamento",
                      leading: (
                        <span
                          aria-hidden="true"
                          className={`mr-1 block h-2 w-2 rounded-full ${statusConfig.in_progress.dotClassName}`}
                        />
                      ),
                      shortcut: todo.status === "in_progress" ? "✓" : undefined,
                      active: todo.status === "in_progress",
                      onClick: () => setTodoStatus(todo, "in_progress"),
                    },
                    {
                      key: "done",
                      label: "Concluída",
                      leading: (
                        <span
                          aria-hidden="true"
                          className={`mr-1 block h-2 w-2 rounded-full ${statusConfig.done.dotClassName}`}
                        />
                      ),
                      shortcut: todo.status === "done" ? "✓" : undefined,
                      active: todo.status === "done",
                      onClick: () => setTodoStatus(todo, "done"),
                    },
                  ]}
                />

                {completed ? (
                  <span className="min-w-[48px] shrink-0 whitespace-nowrap text-right text-[10px] tabular-nums text-muted">
                    {formatDueDate(todo.dueDate, today, false)}
                  </span>
                ) : (
                  <DatePicker
                    value={todo.dueDate ?? ""}
                    onChange={(dueDate) =>
                      updateTodo({
                        ...todo,
                        dueDate: dueDate || undefined,
                      })
                    }
                    compact
                    markPastDates
                    displayValue={
                      <span
                        className={
                          overdue ? "font-medium text-danger" : "text-muted"
                        }
                        title={overdue ? "Prazo vencido" : undefined}
                      >
                        {overdue && <span className="mr-1 font-bold">!</span>}

                        {formatDueDate(todo.dueDate, today, overdue)}
                      </span>
                    }
                  />
                )}

                <Dropdown
                  align="right"
                  compact
                  trigger={({ open, toggle }) => (
                    <button
                      type="button"
                      aria-label="Ações da tarefa"
                      aria-expanded={open}
                      onClick={toggle}
                      className={`focus-ring flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-btn transition-colors ${
                        open
                          ? "bg-raised text-ink"
                          : "text-muted hover:bg-raised hover:text-ink"
                      }`}
                    >
                      <IconMore className="w-3.5 h-3.5" />
                    </button>
                  )}
                  items={[
                    {
                      key: "edit",
                      label: "Editar",
                      icon: IconPencil,
                      onClick: () => setEditingTodo(todo),
                      dividerAfter: true,
                    },
                    {
                      key: "delete",
                      label: "Excluir",
                      icon: IconTrash,
                      danger: true,
                      onClick: () => setDeletingTodo(todo),
                    },
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between px-3.5 pb-2.5">
        <span className="text-[10px] text-muted">
          Use a lista para acompanhar os próximos passos do projeto.
        </span>

        <button
          type="button"
          className="px-2.5 py-1.5 rounded-btn border border-outline/50 text-[10px] text-muted"
        >
          Ver todas
        </button>
      </div>
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
