import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Budget } from '../types';
import * as BudgetService from '../services/budgetService';
import { QUERY_CONFIG } from '../constants';

const DEFAULT_BUDGET: Budget = {
  limit: 0,
  duration: 'Monthly',
  transactions: [],
  recurring: [],
  savings: 0,
};

export function useBudget() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['budget'],
    queryFn: BudgetService.getBudget,
    ...QUERY_CONFIG,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ limit, duration }: { limit: number; duration: string }) =>
      BudgetService.updateBudgetSettings(limit, duration),
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: ({
      description,
      amount,
      type,
    }: {
      description: string;
      amount: number;
      type: 'income' | 'expense';
    }) => BudgetService.addTransaction(description, amount, type),
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  const processRecurringMutation = useMutation({
    mutationFn: BudgetService.processRecurringTransaction,
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  const addRecurringTransactionMutation = useMutation({
    mutationFn: ({
      description,
      amount,
      type,
      frequency,
      startDate,
    }: {
      description: string;
      amount: number;
      type: 'income' | 'expense';
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      startDate: string;
    }) => BudgetService.addRecurringTransaction(description, amount, type, frequency, startDate),
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({
      id,
      description,
      amount,
      type,
    }: {
      id: string;
      description: string;
      amount: number;
      type: 'income' | 'expense';
    }) => BudgetService.updateTransaction(id, description, amount, type),
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => BudgetService.deleteTransaction(id),
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  const updateRecurringMutation = useMutation({
    mutationFn: ({ id, updates }: {
      id: string;
      updates: {
        description?: string;
        amount?: number;
        type?: 'income' | 'expense';
        frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
        nextDueDate?: string;
      };
    }) => BudgetService.updateRecurringTransaction(id, updates),
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (id: string) => BudgetService.deleteRecurringTransaction(id),
    onSuccess: (updatedBudget) => {
      queryClient.setQueryData(['budget'], updatedBudget);
    },
  });

  return {
    budget: query.data ?? DEFAULT_BUDGET,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateSettings: updateSettingsMutation.mutateAsync,
    addTransaction: addTransactionMutation.mutateAsync,
    updateTransaction: updateTransactionMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    processRecurring: processRecurringMutation.mutateAsync,
    addRecurringTransaction: addRecurringTransactionMutation.mutateAsync,
    updateRecurring: updateRecurringMutation.mutateAsync,
    deleteRecurring: deleteRecurringMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
    isAddingTransaction: addTransactionMutation.isPending,
    isAddingRecurringTransaction: addRecurringTransactionMutation.isPending,
    isUpdatingTransaction: updateTransactionMutation.isPending,
    isDeletingTransaction: deleteTransactionMutation.isPending,
    isProcessingRecurring: processRecurringMutation.isPending,
    isUpdatingRecurring: updateRecurringMutation.isPending,
    isDeletingRecurring: deleteRecurringMutation.isPending,
  };
}
