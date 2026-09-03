export type TodoStatus = 'todo' |  'paused' | 'in_progress' | 'done'

export type ProjectTodo = {
  id: string
  title: string
  status: TodoStatus
  dueDate?: string
  description?: string
  createdAt: string
}