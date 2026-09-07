import { projectTodosApi } from "../api/projectTodos";
import { useApiData } from "../lib/useApiData";
import { useCallback } from "react";
import type { ProjectTodo } from "../types/projectTodo";

export function useProjectTodos(projectId: string) {
  const {
    data: todos,
    loaded,
    loading,
    refresh,
    setData: setTodos,
  } = useApiData(
    () => projectTodosApi.list(projectId),
    [projectId],
    [] as ProjectTodo[],
  );

  const saveTodos = useCallback(
    async (nextTodos: ProjectTodo[]): Promise<void> => {
      await projectTodosApi.save(projectId, nextTodos);

      setTodos(nextTodos);
    },
    [projectId, setTodos],
  );

  return {
    todos,
    loaded,
    loading,
    refresh,
    saveTodos,
  };
}
