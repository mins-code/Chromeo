import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskStatus } from '../types';
import * as TaskService from '../services/taskService';
import { QUERY_CONFIG } from '../constants';

export function useTasks() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: TaskService.getTasks,
    ...QUERY_CONFIG,
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
    // Optimistic update: Remove task from cache immediately
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      
      // Optimistically update the cache
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.filter((t) => t.id !== id)
      );
      
      // Return a context object with the snapshot
      return { previousTasks };
    },
    onError: (_error, _id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      console.error('Failed to delete task:', _error);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
