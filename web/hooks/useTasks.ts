import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskStatus } from '../types';
import * as TaskService from '../services/taskService';

export function useTasks() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: TaskService.getTasks,
  });

  const createMutation = useMutation({
    mutationFn: TaskService.createTask,
    onSuccess: (newTask) => {
      if (newTask) {
        queryClient.setQueryData<Task[]>(['tasks'], (old = []) => [newTask, ...old]);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: TaskService.updateTask,
    onSuccess: (updatedTask) => {
      if (updatedTask) {
        queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
          old.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: TaskService.deleteTask,
    onSuccess: (_success, id) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.filter((t) => t.id !== id)
      );
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (task: Task) => {
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      return TaskService.updateTask({ ...task, status: newStatus });
    },
    onSuccess: (updatedTask) => {
      if (updatedTask) {
        queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
          old.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
      }
    },
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
