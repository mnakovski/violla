import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Note {
  id: string;
  title: string;
  description: string;
  note_date: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateNoteInput = Omit<Note, "id" | "created_at" | "updated_at">;
export type UpdateNoteInput = Partial<CreateNoteInput>;

export function useNotes() {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as Note[];
    },
  });

  const createNote = useMutation({
    mutationFn: async (newNote: CreateNoteInput) => {
      const { data, error } = await supabase
        .from("notes")
        .insert([{ ...newNote, updated_at: new Date().toISOString() }])
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
    loading: isLoading,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
  };
}
