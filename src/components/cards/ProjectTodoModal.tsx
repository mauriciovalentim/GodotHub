import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ModalHeader } from "../modals/ModalHeader";
import { IconCheckCircle, IconPencil } from '../../lib/icons'

import type {
  ProjectTodo,
  TodoArea,
  TodoStatus,
} from "../../types/projectTodo";
import { DatePicker } from "../ui/DatePicker";

type ProjectTodoModalProps = {
  onClose: () => void
  onSubmit: (todo: ProjectTodo) => void
  todo?: ProjectTodo
}

const areaOptions: Array<{
  value: TodoArea;
  label: string;
}> = [
  { value: "programming", label: "Programação" },
  { value: "art", label: "Arte" },
  { value: "audio", label: "Áudio" },
  { value: "design", label: "Design" },
  { value: "narrative", label: "Narrativa" },
  { value: "other", label: "Outro" },
];

export function ProjectTodoModal({
  onClose,
  onSubmit,
  todo,
}: ProjectTodoModalProps) {
  const editing = !!todo

  const [title, setTitle] = useState(todo?.title ?? '')
const [description, setDescription] = useState(
  todo?.description ?? '',
)
const [dueDate, setDueDate] = useState(todo?.dueDate ?? '')
const [status, setStatus] = useState<TodoStatus>(
  todo?.status ?? 'todo',
)
const [area, setArea] = useState<TodoArea>(
  todo?.area ?? 'other',
)

const trimmedTitle = title.trim()

const hasChanges =
  !editing ||
  trimmedTitle !== todo.title ||
  description.trim() !== (todo.description ?? '') ||
  dueDate !== (todo.dueDate ?? '') ||
  status !== todo.status ||
  area !== (todo.area ?? 'other')

const canSubmit =
  trimmedTitle.length > 0 && hasChanges

const submit = () => {
  if (!canSubmit) return

  const savedTodo: ProjectTodo = {
      id: todo?.id ?? crypto.randomUUID(),
      title: trimmedTitle,
      status,
      area,
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      createdAt: todo?.createdAt ?? new Date().toISOString(),
    }

    onSubmit(savedTodo)
    onClose()
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("app:dialog-open"));

    return () => {
      window.dispatchEvent(new CustomEvent("app:dialog-close"));
    };
  }, []);

  const optionButtonClass = (active: boolean) =>
    `focus-ring cursor-pointer px-3 py-2 rounded-btn border text-xs font-medium transition-colors ${
      active
        ? "border-accent bg-accent/10 text-accent-bright"
        : "border-outline/50 text-muted hover:border-accent-dim hover:text-ink hover:bg-raised"
    }`;

  // const canSubmit = title.trim().length > 0;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="bg-surface rounded-modal w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-clip"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          icon={
  editing ? (
    <IconPencil className="w-5 h-5 text-accent-bright" />
  ) : (
    <IconCheckCircle className="w-5 h-5 text-accent-bright" />
  )
}
          title={editing ? 'Editar tarefa' : 'Nova tarefa'}
description={
  editing
    ? 'Atualize as informações desta tarefa.'
    : 'Adicione um próximo passo para este projeto.'
}
          onClose={onClose}
          autoFocusBanner={false}
        />

        <div className="p-6 pt-4 flex flex-col gap-4 overflow-y-auto">
          {/* Título */}
          <div className="flex flex-col gap-0.5">
            <label className="pl-3 text-xs font-medium text-muted">
              Título
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Criar menu principal"
              className="focus-ring bg-overlay border border-outline/50 focus:border-accent-dim rounded-item px-3.5 py-2.5 text-sm font-mono text-ink placeholder:text-muted/70 transition-colors"
            />
          </div>

                        {/* Área */}
          <div className="flex flex-col gap-2">
            <label className="pl-3 text-xs font-medium text-muted">
              Área
            </label>

            <div className="flex flex-wrap gap-1.5">
              {areaOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setArea(option.value)}
                  className={optionButtonClass(
                    area === option.value,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2">
            <label className="pl-3 text-xs font-medium text-muted">
              Status
            </label>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatus("todo")}
                className={optionButtonClass(status === "todo")}
              >
                A fazer
              </button>

              <button
                type="button"
                onClick={() => setStatus("paused")}
                className={optionButtonClass(status === "paused")}
              >
                Em pausa
              </button>

              <button
                type="button"
                onClick={() => setStatus("in_progress")}
                className={optionButtonClass(status === "in_progress")}
              >
                Em andamento
              </button>
              <button
                type="button"
                onClick={() => setStatus("done")}
                className={optionButtonClass(status === "done")}
              >
                Concluída
              </button>
            </div>
          </div>

      

          {/* Descrição */}
          <div className="flex flex-col gap-0.5">
            <label className="pl-3 text-xs font-medium text-muted">
              Descrição{" "}
              <span className="font-normal text-muted/60">(opcional)</span>
            </label>

            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Adicione mais detalhes sobre o que precisa ser feito..."
              className="focus-ring bg-overlay border border-outline/50 focus:border-accent-dim rounded-item px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors resize-none"
            />
          </div>

          {/* Prazo */}
          <div className="flex flex-col gap-0.5">
            <label className="pl-3 text-xs font-medium text-muted">
              Prazo{" "}
              <span className="font-normal text-muted/60">(opcional)</span>
            </label>

            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Sem prazo"
              clearLabel="Remover prazo"
              markPastDates
              pastDateMessage="Este prazo já venceu"
            />
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-2 p-5 pt-2">
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            className="focus-ring cursor-pointer px-4 py-2.5 rounded-btn border border-outline/50 hover:border-accent-dim hover:bg-raised text-sm text-muted hover:text-ink transition-colors"
          >
            Cancelar
          </motion.button>

          <motion.button
  type="button"
  whileHover={canSubmit ? { y: -1 } : undefined}
  whileTap={canSubmit ? { scale: 0.96 } : undefined}
  onClick={submit}
  disabled={!canSubmit}
  className="focus-ring cursor-pointer px-4 py-2.5 rounded-btn bg-accent text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
>
  {editing ? 'Salvar alterações' : 'Adicionar tarefa'}
</motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
