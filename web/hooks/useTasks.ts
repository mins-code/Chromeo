/**
 * useTasks Hook
 *
 * Provides task CRUD operations with React Query.
 * Implements optimistic updates for instant UI feedback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskStatus } from '../types';
import * as TaskService from '../services/taskService';
import { QUERY_CONFIG } from '../constants';
import { logger } from '../utils/logger';

// Type for mutation context (used for rollback on error)
interface MutationContext {
  previousTasks: Task[] | undefined;
}

export function useTasks() {
  const queryClient = useQueryClient();

  // ============================================================================
  // Query
  // ============================================================================

  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: TaskService.getTasks,
    ...QUERY_CONFIG,
  });

  // ============================================================================
  // Create Mutation
  // ============================================================================

  const createMutation = useMutation({
    mutationFn: TaskService.createTask,
    onSuccess: (newTask) => {
      if (newTask) {
        queryClient.setQueryData<Task[]>(['tasks'], (old = []) => [newTask, ...old]);
      }
    },
  });

  // ============================================================================
  // Update Mutation (with Optimistic Updates)
  // ============================================================================

  const updateMutation = useMutation({
    mutationFn: TaskService.updateTask,

    // Optimistic update: Apply changes immediately before server responds
    onMutate: async (updatedTask: Task): Promise<MutationContext> => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot the previous value for rollback
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update the cache with the new task data
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );

      // Return context with the snapshot for potential rollback
      return { previousTasks };
    },

    // Rollback to previous state on error
    onError: (error, _updatedTask, context) => {
      logger.error('Failed to update task', error);
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },

    // Invalidate to ensure cache is in sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // ============================================================================
  // Delete Mutation (with Optimistic Updates)
  // ============================================================================

  const deleteMutation = useMutation({
    mutationFn: TaskService.deleteTask,

    // Optimistic update: Remove task from cache immediately
    onMutate: async (id: string): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update the cache
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => old.filter((t) => t.id !== id));

      // Return a context object with the snapshot
      return { previousTasks };
    },

    onError: (error, _id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      logger.error('Failed to delete task', error);
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },

    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // ============================================================================
  // Toggle Status Mutation (with Optimistic Updates)
  // ============================================================================

  const toggleStatusMutation = useMutation({
    mutationFn: async (task: Task) => {
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      return TaskService.updateTask({ ...task, status: newStatus });
    },

    // Optimistic update: Flip status immediately for instant UI feedback
    onMutate: async (task: Task): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Calculate the new status
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;

      // Optimistically update the cache with flipped status
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );

      // Return context with snapshot for rollback
      return { previousTasks };
    },

    onError: (error, _task, context) => {
      // Rollback to previous state on error
      logger.error('Failed to toggle task status', error);
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },

    onSettled: () => {
      // Invalidate to ensure cache consistency with server
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // ============================================================================
  // Return Values
  // ============================================================================

  return {
    // Query state
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Mutation functions
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,

    // Mutation loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleStatusMutation.isPending,
  };
}
