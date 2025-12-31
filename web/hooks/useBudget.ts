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

  return {
    budget: query.data ?? DEFAULT_BUDGET,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateSettings: updateSettingsMutation.mutateAsync,
    addTransaction: addTransactionMutation.mutateAsync,
    processRecurring: processRecurringMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
    isAddingTransaction: addTransactionMutation.isPending,
    isProcessingRecurring: processRecurringMutation.isPending,
  };
}
