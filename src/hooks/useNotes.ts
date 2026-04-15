import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Note {
  id: string;
  title: string;
  description: string;
  note_date: string | null;
  user_id: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateNoteInput = Pick<Note, "title" | "description" | "note_date" | "is_shared">;
export type UpdateNoteInput = Partial<CreateNoteInput>;

export function useNotes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: notes = [], isLoading, isError, error } = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .or(`user_id.eq.${user.id},is_shared.eq.true`)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as Note[];
    },
    enabled: !!user,
  });

  const createNote = useMutation({
    mutationFn: async (newNote: CreateNoteInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("notes")
        .insert([{
          ...newNote,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateNoteInput }) => {
      const { data, error } = await supabase
        .from("notes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const toggleShare = useMutation({
    mutationFn: async ({ id, is_shared }: { id: string; is_shared: boolean }) => {
      const { data, error } = await supabase
        .from("notes")
        .update({ is_shared, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  return {
    notes,
    currentUserId: user?.id ?? null,
    loading: isLoading,
    isError,
    error: error as Error | null,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    toggleShare: toggleShare.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
  };
}
