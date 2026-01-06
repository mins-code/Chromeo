import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as NotesService from '../services/notesService';
import { Note, ChecklistItem } from '../types';

export const useNotes = () => {
  const queryClient = useQueryClient();

  // Fetch all notes
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes'],
    queryFn: NotesService.getNotes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: ({
      title,
      content,
      isChecklist,
      checklistItems,
    }: {
      title: string;
      content: string;
      isChecklist?: boolean;
      checklistItems?: ChecklistItem[];
    }) => NotesService.createNote(title, content, isChecklist, checklistItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Note, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>> }) =>
      NotesService.updateNote(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData(['notes']);

      // Optimistically update
      queryClient.setQueryData(['notes'], (old: Note[] | undefined) =>
        old?.map((note) => (note.id === id ? { ...note, ...updates } : note))
      );

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => NotesService.deleteNote(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previousNotes = queryClient.getQueryData(['notes']);

      queryClient.setQueryData(['notes'], (old: Note[] | undefined) =>
        old?.filter((note) => note.id !== id)
      );

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Share note mutation
  const shareNoteMutation = useMutation({
    mutationFn: ({ noteId, partnerId }: { noteId: string; partnerId: string }) =>
      NotesService.shareNoteWithPartner(noteId, partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['noteShares'] });
    },
  });

  // Unshare note mutation
  const unshareNoteMutation = useMutation({
    mutationFn: (shareId: string) => NotesService.unshareNote(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['noteShares'] });
    },
  });

  return {
    notes,
    isLoading,
    error,
    createNote: (title: string, content: string, isChecklist?: boolean, checklistItems?: ChecklistItem[]) =>
      createNoteMutation.mutateAsync({ title, content, isChecklist, checklistItems }),
    updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>>) =>
      updateNoteMutation.mutateAsync({ id, updates }),
    deleteNote: (id: string) => deleteNoteMutation.mutateAsync(id),
    shareNote: (noteId: string, partnerId: string) => shareNoteMutation.mutateAsync({ noteId, partnerId }),
    unshareNote: (shareId: string) => unshareNoteMutation.mutateAsync(shareId),
  };
};
