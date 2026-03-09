import React, { useState, useEffect, useMemo } from 'react';
import { ThemeOption, Note, ChecklistItem, NoteShare, Partnership } from '../types';
import { useNotes } from '../hooks/useNotes';
import * as NotesService from '../services/notesService';
import * as PartnerService from '../services/partnerService';
import { supabase } from '../services/supabaseClient';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import {
  FileText,
  Plus,
  Trash2,
  Share2,
  CheckSquare,
  X,
  Loader2,
  UserPlus,
  User,
  Save,
  Search,
  StickyNote,
  Check,
} from 'lucide-react';
import { t } from '../themeText';
import { logger } from '../utils/logger';

interface NotesManagerProps {
  currentTheme: ThemeOption;
}

const NotesManager: React.FC<NotesManagerProps> = ({ currentTheme }) => {
  const { notes, isLoading, createNote, updateNote, deleteNote, shareNote, unshareNote } =
    useNotes();

  // UI State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'checklist'>('note');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Sharing State
  const [noteShares, setNoteShares] = useState<Record<string, NoteShare[]>>({});
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [sharingNoteId, setSharingNoteId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load user data on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    const partners = await PartnerService.getPartnerships();
    setPartnerships(partners.filter((p) => p.status === 'accepted'));
  };

  const loadNoteShares = async (noteId: string) => {
    setIsLoadingShares(true);
    const shares = await NotesService.getNoteShares(noteId);
    setNoteShares((prev) => ({ ...prev, [noteId]: shares }));
    setIsLoadingShares(false);
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteType('note');
    setChecklistItems([]);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteType(note.isChecklist ? 'checklist' : 'note');
    setChecklistItems(note.checklistItems || []);
    setIsEditorOpen(true);
    if (note.isShared) {
      loadNoteShares(note.id);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      alert('Please enter a title for the note');
      return;
    }

    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          title: noteTitle,
          content: noteContent,
          isChecklist: noteType === 'checklist',
          checklistItems: noteType === 'checklist' ? checklistItems : [],
        });
      } else {
        await createNote(
          noteTitle,
          noteContent,
          noteType === 'checklist',
          noteType === 'checklist' ? checklistItems : []
        );
      }
      setIsEditorOpen(false);
      resetForm();
    } catch (error) {
      logger.error('Failed to save note', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(noteId);
        setIsEditorOpen(false);
        resetForm();
      } catch (error) {
        logger.error('Failed to delete note', error);
        alert('Failed to delete note. Please try again.');
      }
    }
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([
        ...checklistItems,
        {
          id: crypto.randomUUID(),
          text: newChecklistItem.trim(),
          isCompleted: false,
        },
      ]);
      setNewChecklistItem('');
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== itemId));
  };

  const handleShareNote = async () => {
    if (!editingNote || !selectedPartnerId) return;

    try {
      await shareNote(editingNote.id, selectedPartnerId);
      await loadNoteShares(editingNote.id);
      setSelectedPartnerId('');
    } catch (error) {
      logger.error('Failed to share note', error);
      alert('Failed to share note. Please try again.');
    }
  };

  const handleUnshareNote = async (shareId: string) => {
    if (!editingNote) return;

    try {
      await unshareNote(shareId);
      await loadNoteShares(editingNote.id);
    } catch (error) {
      logger.error('Failed to unshare note', error);
      alert('Failed to unshare note. Please try again.');
    }
  };

  const handleToggleQuickChecklist = async (e: React.MouseEvent, note: Note, itemId: string) => {
    e.stopPropagation(); // Prevent opening the modal

    // Optimistic update locally?
    // Actually relying on React Query optimistic update in useNotes is better,
    // but we need to pass the FULL new items list to updateNote.

    const updatedItems = note.checklistItems.map((item) =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );

    try {
      await updateNote(note.id, {
        checklistItems: updatedItems,
      });
    } catch (error) {
      logger.error('Failed to toggle item', error);
    }
  };

  const resetForm = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteType('note');
    setChecklistItems([]);
    setNewChecklistItem('');
    setSelectedPartnerId('');
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  const availablePartners = useMemo(() => {
    if (!editingNote) return [];
    const currentShares = noteShares[editingNote.id] || [];
    return partnerships.filter((p) => !currentShares.some((s) => s.sharedWithId === p.partnerId));
  }, [partnerships, noteShares, editingNote]);

  return (
    <div className="space-y-8 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/5 pb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-3">
          <StickyNote className="text-brand-500" /> {t(currentTheme, 'myNotes')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Capture your thoughts, ideas, and checklists.
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search notes..."
            aria-label="Search notes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
          />
        </div>
        <Button variant="primary" onClick={handleCreateNote} className="flex-shrink-0">
          <Plus size={18} className="mr-2" />
          {t(currentTheme, 'addNote')}
        </Button>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 overflow-y-auto">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="col-span-full glass-panel rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-brand-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              {searchQuery
                ? 'No notes found matching your search.'
                : 'No notes yet. Create your first note!'}
            </p>
            {searchQuery && (
              <Button
                variant="ghost"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-brand-500"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleEditNote(note)}
              className="glass-panel p-5 rounded-2xl cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-brand-500/20 group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-brand-500 transition-colors line-clamp-1 flex-1">
                  {note.title}
                </h3>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  {note.isChecklist && (
                    <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500">
                      <CheckSquare size={14} />
                    </div>
                  )}
                  {note.isShared && (
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                      <Share2 size={14} />
                    </div>
                  )}
                  {note.isShared && (
                    <div
                      className={`p-1.5 rounded-lg ${note.user_id === currentUserId ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}
                      title={note.user_id === currentUserId ? 'Shared by you' : 'Shared with you'}
                    >
                      {note.user_id === currentUserId ? <Share2 size={14} /> : <User size={14} />}
                    </div>
                  )}
                </div>
              </div>

              {note.isChecklist ? (
                <div className="space-y-1.5">
                  {note.checklistItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <div
                        onClick={(e) => handleToggleQuickChecklist(e, note, item.id)}
                        className={`w-3.5 h-3.5 rounded border flex-shrink-0 cursor-pointer transition-colors flex items-center justify-center ${
                          item.isCompleted
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'
                        }`}
                      >
                        {item.isCompleted && <Check size={10} className="text-white" />}
                      </div>
                      <span
                        className={`line-clamp-1 ${
                          item.isCompleted
                            ? 'line-through text-slate-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                  {note.checklistItems.length > 3 && (
                    <p className="text-xs text-slate-400 ml-5">
                      +{note.checklistItems.length - 3} more items
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-3">
                  {note.content || 'No content'}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 text-xs text-slate-400">
                {new Date(note.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {note.isShared && currentUserId && note.user_id !== currentUserId && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold uppercase tracking-wider">
                    Shared
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 animate-scale-in flex flex-col">
            {/* Editor Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editingNote ? 'Edit Note' : 'Create New Note'}
              </h3>
              <button
                onClick={() => {
                  setIsEditorOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Close editor"
              >
                <X size={20} />
              </button>
            </div>

            {/* Editor Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Note Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setNoteType('note')}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                    noteType === 'note'
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <FileText size={16} className="inline mr-2" />
                  Note
                </button>
                <button
                  onClick={() => setNoteType('checklist')}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                    noteType === 'checklist'
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <CheckSquare size={16} className="inline mr-2" />
                  Checklist
                </button>
              </div>

              {/* Title Input */}
              <Input
                label="Title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Enter note title..."
              />

              {noteType === 'note' ? (
                // Plain Note Content
                <div>
                  <label
                    htmlFor="note-content"
                    className="block text-[10px] font-bold uppercase text-slate-400 mb-2 ml-1 font-mono"
                  >
                    Content
                  </label>
                  <textarea
                    id="note-content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={t(currentTheme, 'noteContent')}
                    rows={8}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                  />
                </div>
              ) : (
                // Checklist Items
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2 ml-1 font-mono">
                    Checklist Items
                  </label>

                  {/* Add New Item */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      aria-label="Add a checklist item"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                      placeholder="Add an item..."
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder-slate-400"
                    />
                    <Button variant="primary" onClick={handleAddChecklistItem}>
                      <Plus size={16} />
                    </Button>
                  </div>

                  {/* Checklist Items List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                      >
                        <button
                          onClick={() => handleToggleChecklistItem(item.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            item.isCompleted
                              ? 'bg-brand-500 border-brand-500'
                              : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'
                          }`}
                          aria-label={
                            item.isCompleted ? 'Mark item incomplete' : 'Mark item complete'
                          }
                        >
                          {item.isCompleted && <Check size={14} className="text-white" />}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            item.isCompleted
                              ? 'line-through text-slate-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {item.text}
                        </span>
                        <button
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          aria-label="Remove item"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {checklistItems.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">
                        No items yet. Add your first item above.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sharing Section (only for existing notes) */}
              {editingNote && (
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
                    <Share2 size={14} /> Share Note
                  </h4>

                  {partnerships.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No partners connected. Add partners in Settings → Collaboration.
                    </p>
                  ) : availablePartners.length > 0 ? (
                    <div className="flex gap-2">
                      <Select
                        value={selectedPartnerId}
                        onChange={(value) => setSelectedPartnerId(value)}
                        options={[
                          { value: '', label: 'Choose a partner...' },
                          ...availablePartners.map((p) => ({
                            value: p.partnerId,
                            label: p.partnerName || p.partnerEmail,
                          })),
                        ]}
                        currentTheme={currentTheme}
                        className="flex-1"
                      />
                      <Button
                        variant="primary"
                        onClick={handleShareNote}
                        disabled={!selectedPartnerId}
                      >
                        <UserPlus size={16} />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Shared with all connected partners.
                    </p>
                  )}

                  {/* Current Shares */}
                  {editingNote.isShared && noteShares[editingNote.id]?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Shared With
                      </p>
                      {noteShares[editingNote.id].map((share) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {share.sharedWithName || share.sharedWithEmail}
                              </p>
                              {share.sharedWithName && (
                                <p className="text-xs text-slate-500">{share.sharedWithEmail}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnshareNote(share.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                            aria-label="Remove share"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Editor Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                {editingNote && (
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteNote(editingNote.id)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditorOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveNote}>
                  <Save size={16} className="mr-2" />
                  {editingNote ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(NotesManager);
