import { Note, NoteShare, DbNote, DbNoteShare, ChecklistItem } from '../types';
import { supabase } from './supabaseClient';

/**
 * Get all notes for the current user
 * Returns both owned notes and notes shared with the user
 */
export const getNotes = async (): Promise<Note[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch user's own notes
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Transform DB format to app format
  return (notes || []).map((dbNote: DbNote) => ({
    id: dbNote.id,
    user_id: dbNote.user_id,
    title: dbNote.title,
    content: dbNote.content,
    isChecklist: dbNote.is_checklist,
    checklistItems: dbNote.checklist_items || [],
    isShared: dbNote.is_shared,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
  }));
};

/**
 * Create a new note
 */
export const createNote = async (
  title: string,
  content: string,
  isChecklist: boolean = false,
  checklistItems: ChecklistItem[] = []
): Promise<Note> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title,
      content,
      is_checklist: isChecklist,
      checklist_items: checklistItems,
      is_shared: false,
    })
    .select()
    .single();

  if (error) throw error;

  const dbNote = data as DbNote;
  return {
    id: dbNote.id,
    user_id: dbNote.user_id,
    title: dbNote.title,
    content: dbNote.content,
    isChecklist: dbNote.is_checklist,
    checklistItems: dbNote.checklist_items || [],
    isShared: dbNote.is_shared,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
  };
};

/**
 * Update an existing note
 */
export const updateNote = async (
  id: string,
  updates: Partial<Omit<Note, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>>
): Promise<Note> => {
  const dbUpdates: any = {};
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.isChecklist !== undefined) dbUpdates.is_checklist = updates.isChecklist;
  if (updates.checklistItems !== undefined) dbUpdates.checklist_items = updates.checklistItems;
  if (updates.isShared !== undefined) dbUpdates.is_shared = updates.isShared;

  const { data, error } = await supabase
    .from('notes')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const dbNote = data as DbNote;
  return {
    id: dbNote.id,
    user_id: dbNote.user_id,
    title: dbNote.title,
    content: dbNote.content,
    isChecklist: dbNote.is_checklist,
    checklistItems: dbNote.checklist_items || [],
    isShared: dbNote.is_shared,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
  };
};

/**
 * Delete a note
 */
export const deleteNote = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// ============ NOTE SHARING ============

/**
 * Get all shares for notes owned by current user
 */
export const getNoteShares = async (noteId?: string): Promise<NoteShare[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('note_shares')
    .select(`
      *,
      shared_with:profiles!note_shares_shared_with_id_fkey(id, email, full_name)
    `)
    .eq('owner_id', user.id);

  if (noteId) {
    query = query.eq('note_id', noteId);
  }

  const { data: shares, error } = await query;

  if (error) throw error;

  return (shares || []).map((dbShare: DbNoteShare) => {
    const sharedWith = Array.isArray(dbShare.shared_with) 
      ? dbShare.shared_with[0] 
      : dbShare.shared_with;

    return {
      id: dbShare.id,
      noteId: dbShare.note_id,
      ownerId: dbShare.owner_id,
      sharedWithId: dbShare.shared_with_id,
      sharedWithEmail: sharedWith?.email || '',
      sharedWithName: sharedWith?.full_name,
      createdAt: dbShare.created_at,
    };
  });
};

/**
 * Share a note with a partner
 */
export const shareNoteWithPartner = async (
  noteId: string,
  partnerId: string
): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // First, update the note to mark it as shared
  const { error: noteError } = await supabase
    .from('notes')
    .update({ is_shared: true })
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (noteError) throw noteError;

  // Then create the share record
  const { error: shareError } = await supabase
    .from('note_shares')
    .insert({
      note_id: noteId,
      owner_id: user.id,
      shared_with_id: partnerId,
    });

  if (shareError) {
    // If already shared, ignore the error
    if (shareError.code === '23505') { // unique constraint violation
      return true;
    }
    throw shareError;
  }

  return true;
};

/**
 * Unshare a note (remove a specific share)
 */
export const unshareNote = async (shareId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the share to find the note_id
  const { data: share } = await supabase
    .from('note_shares')
    .select('note_id')
    .eq('id', shareId)
    .eq('owner_id', user.id)
    .single();

  // Delete the share
  const { error } = await supabase
    .from('note_shares')
    .delete()
    .eq('id', shareId)
    .eq('owner_id', user.id);

  if (error) throw error;

  // Check if there are any remaining shares for this note
  if (share) {
    const { data: remainingShares } = await supabase
      .from('note_shares')
      .select('id')
      .eq('note_id', share.note_id)
      .eq('owner_id', user.id);

    // If no more shares, update the note to mark as not shared
    if (!remainingShares || remainingShares.length === 0) {
      await supabase
        .from('notes')
        .update({ is_shared: false })
        .eq('id', share.note_id);
    }
  }

  return true;
};
