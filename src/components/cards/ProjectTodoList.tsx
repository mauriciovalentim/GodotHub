import { DatePicker } from "../ui/DatePicker";
import { Dropdown } from "../ui/Dropdown";
import { IconMore, IconPencil, IconTrash } from "../../lib/icons";

import type {
  ProjectTodo,
  TodoArea,
  TodoStatus,
} from "../../types/projectTodo";

type StatusSort = "completed-first" | "todo-first" | null;
type DueDateSort = "nearest-first" | "farthest-first" | null;

type StatusConfig = Record<
  TodoStatus,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
>;

type ProjectTodoListProps = {
  todos: ProjectTodo[];
  today: string;
  statusSort: StatusSort;
  dueDateSort: DueDateSort;
  statusConfig: StatusConfig;
  showArea?: boolean;
  className?: string;
  formatDueDate: (
    dueDate: string | undefined,
    today: string,
    overdue: boolean,
  ) => string;
  onToggleStatusSort: () => void;
  onToggleDueDateSort: () => void;
  onToggleCompleted: (todo: ProjectTodo) => void;
  onSetStatus: (todo: ProjectTodo, status: TodoStatus) => void;
  onUpdate: (todo: ProjectTodo) => void;
  onView: (todo: ProjectTodo) => void;
  onEdit: (todo: ProjectTodo) => void;
  onDelete: (todo: ProjectTodo) => void;
};

const areaLabels = {
  programming: "Programação",
  art: "Arte",
  audio: "Áudio",
  design: "Design",
  narrative: "Narrativa",
  other: "Outro",
} satisfies Record<TodoArea, string>;

export function ProjectTodoList({
  todos,
  today,
  statusSort,
  dueDateSort,
  statusConfig,
  showArea = false,
  className = "",
  formatDueDate,
  onToggleStatusSort,
  onToggleDueDateSort,
  onToggleCompleted,
  onSetStatus,
  onUpdate,
  onView,
  onEdit,
  onDelete,
}: ProjectTodoListProps) {
  const statusHeader = (
    <button
      type="button"
      onClick={onToggleStatusSort}
      className={`focus-ring cursor-pointer rounded-btn text-center text-[9px] font-medium uppercase tracking-wide text-muted/60 transition-colors hover:bg-raised hover:text-ink ${
        showArea ? "w-28" : "min-w-[88px]"
      }`}
      title="Ordenar por status"
    >
      Status{" "}
      {statusSort === "completed-first"
        ? "↓"
        : statusSort === "todo-first"
          ? "↑"
          : ""}
    </button>
  );

  const dueDateHeader = (
    <button
      type="button"
      onClick={onToggleDueDateSort}
      className={`focus-ring cursor-pointer rounded-btn text-[9px] font-medium uppercase tracking-wide text-muted/60 transition-colors hover:bg-raised hover:text-ink ${
        showArea ? "w-28 text-center" : "min-w-[48px] text-right"
      }`}
      title="Ordenar por prazo"
    >
      Prazo{" "}
      {dueDateSort === "nearest-first"
        ? "↑"
        : dueDateSort === "farthest-first"
          ? "↓"
          : ""}
    </button>
  );

  return (
    <div
      className={`overflow-hidden rounded-item border border-outline/50 ${
  showArea ? "min-w-[640px]" : ""
} ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-outline/40 px-3 py-3">
        <span className="w-3.5 shrink-0" />

        <span className="min-w-0 flex-1 text-[9px] font-medium uppercase tracking-wide text-muted/60">
          Tarefa
        </span>

        {showArea && (
          <span className="w-28 shrink-0 text-center text-[9px] font-medium uppercase tracking-wide text-muted/60">
            Área
          </span>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {showArea ? (
            <>
              {dueDateHeader}
              {statusHeader}
            </>
          ) : (
            <>
              {statusHeader}
              {dueDateHeader}
            </>
          )}

          <span className="w-6 shrink-0" />
        </div>
      </div>

      {todos.map((todo, index) => {
        const status = statusConfig[todo.status];
        const completed = todo.status === "done";
        const overdue =
          !!todo.dueDate && todo.dueDate < today && !completed;

        const statusControl = (
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
                className={`focus-ring shrink-0 cursor-pointer rounded-tag border px-2 py-1 text-center text-[10px] transition-all hover:brightness-95 ${status.className} ${
                  showArea ? "w-28" : "min-w-[88px]"
                } ${open ? "ring-1 ring-accent/40" : ""}`}
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
                onClick: () => onSetStatus(todo, "todo"),
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
                onClick: () => onSetStatus(todo, "paused"),
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
                shortcut:
                  todo.status === "in_progress" ? "✓" : undefined,
                active: todo.status === "in_progress",
                onClick: () => onSetStatus(todo, "in_progress"),
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
                onClick: () => onSetStatus(todo, "done"),
              },
            ]}
          />
        );

        const dueDateControl = completed ? (
          <span
            className={`shrink-0 whitespace-nowrap text-[10px] tabular-nums text-muted ${
  showArea ? "w-28 text-center" : "min-w-[48px] text-right"
}`}
          >
            {formatDueDate(todo.dueDate, today, false)}
          </span>
        ) : (
          <div
  className={
    showArea
      ? "w-28 shrink-0 [&>div]:w-full [&_button]:w-full [&_button]:text-center"
      : ""
  }
>
            <DatePicker
              value={todo.dueDate ?? ""}
              onChange={(dueDate) =>
                onUpdate({
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
                  {overdue && (
                    <span className="mr-1 font-bold">!</span>
                  )}

                  {formatDueDate(todo.dueDate, today, overdue)}
                </span>
              }
            />
          </div>
        );

        return (
          <div
            key={todo.id}
            className={`flex items-center gap-3 px-3 py-2 ${
              index < todos.length - 1
                ? "border-b border-outline/40"
                : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleCompleted(todo)}
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

            <button
              type="button"
              onClick={() => onView(todo)}
              aria-label={`Ver detalhes da tarefa: ${todo.title}`}
              className={`focus-ring min-w-0 flex-1 cursor-pointer truncate rounded-btn text-left text-[11px] transition-colors ${
                completed
                  ? "text-muted line-through hover:text-ink"
                  : "text-ink hover:text-accent-bright"
              }`}
            >
              {todo.title}
            </button>

            {showArea && (
              <span className="w-28 shrink-0 text-center">
                <span className="inline-flex w-full justify-center truncate rounded-tag border border-outline/50 bg-raised px-2 py-1 text-[10px] font-medium text-ink">
                  {areaLabels[todo.area ?? "other"]}
                </span>
              </span>
            )}

            <div className="flex shrink-0 items-center gap-2">
              {showArea ? (
                <>
                  {dueDateControl}
                  {statusControl}
                </>
              ) : (
                <>
                  {statusControl}
                  {dueDateControl}
                </>
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
                    <IconMore className="h-3.5 w-3.5" />
                  </button>
                )}
                items={[
                  {
                    key: "edit",
                    label: "Editar",
                    icon: IconPencil,
                    onClick: () => onEdit(todo),
                    dividerAfter: true,
                  },
                  {
                    key: "delete",
                    label: "Excluir",
                    icon: IconTrash,
                    danger: true,
                    onClick: () => onDelete(todo),
                  },
                ]}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}