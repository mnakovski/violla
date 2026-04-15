import { useState } from "react";
import { useNotes, Note } from "@/hooks/useNotes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, Share2, AlertCircle, Users, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { mk } from "date-fns/locale";

type FilterTab = "all" | "mine" | "shared";

function NoteCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border/50 bg-card animate-pulse">
      <div className="p-4 pb-2 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
      <div className="px-4 py-2 flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
      <div className="px-4 py-3 border-t flex justify-end gap-2">
        <div className="h-7 bg-muted rounded w-16" />
        <div className="h-7 bg-muted rounded w-16" />
      </div>
    </div>
  );
}

export default function NotesSection() {
  const { notes, currentUserId, loading, isError, error, createNote, updateNote, toggleShare, deleteNote } = useNotes();
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    note_date: null as string | null,
    is_shared: false,
  });

  // ── Filtered notes ──────────────────────────────────────────────────────────
  const filteredNotes = notes.filter((note) => {
    if (activeFilter === "mine") return note.user_id === currentUserId;
    if (activeFilter === "shared") return note.is_shared;
    return true;
  });

  const isOwner = (note: Note) => note.user_id === currentUserId;

  // ── Dialog helpers ──────────────────────────────────────────────────────────
  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        description: note.description,
        note_date: note.note_date,
        is_shared: note.is_shared,
      });
    } else {
      setEditingNote(null);
      setFormData({ title: "", description: "", note_date: null, is_shared: false });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Грешка",
        description: "Насловот и описот се задолжителни.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingNote) {
        await updateNote({ id: editingNote.id, updates: formData });
        toast({ title: "Успешно", description: "Белешката е ажурирана." });
      } else {
        await createNote(formData);
        toast({ title: "Успешно", description: "Нова белешка е додадена." });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Грешка",
        description: err.message || "Настана грешка.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteNote(noteToDelete);
      toast({ title: "Успешно", description: "Белешката е избришана." });
    } catch (err: any) {
      toast({
        title: "Грешка",
        description: err.message || "Грешка при бришење.",
        variant: "destructive",
      });
    } finally {
      setNoteToDelete(null);
    }
  };

  const handleToggleShare = async (note: Note) => {
    try {
      await toggleShare({ id: note.id, is_shared: !note.is_shared });
      toast({
        title: note.is_shared ? "Споделувањето е исклучено" : "Белешката е споделена",
        description: note.is_shared
          ? "Белешката е сега приватна."
          : "Другите администратори можат да ја видат.",
      });
    } catch (err: any) {
      toast({
        title: "Грешка",
        description: err.message || "Настана грешка.",
        variant: "destructive",
      });
    }
  };

  // ── Filter tab counts ───────────────────────────────────────────────────────
  const counts = {
    all: notes.length,
    mine: notes.filter((n) => n.user_id === currentUserId).length,
    shared: notes.filter((n) => n.is_shared).length,
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-7 bg-muted rounded w-36 animate-pulse" />
          <div className="h-9 bg-muted rounded w-36 animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded-lg w-full max-w-xs animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <NoteCardSkeleton />
          <NoteCardSkeleton />
          <NoteCardSkeleton />
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-lg font-medium">Грешка при вчитување</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error?.message || "Не можевме да ги вчитаме белешките. Обидете се повторно."}
        </p>
      </div>
    );
  }

  // ── Empty state messages ─────────────────────────────────────────────────────
  const emptyMessages: Record<FilterTab, string> = {
    all: 'Нема белешки. Кликнете "Додај белешка" за да започнете.',
    mine: "Немате свои белешки. Создадете ја вашата прва белешка.",
    shared: "Нема споделени белешки. Споделете белешка за да биде видлива за другите администратори.",
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-xl font-semibold">Белешки</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Додај белешка
        </Button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
        {(["all", "mine", "shared"] as FilterTab[]).map((tab) => {
          const labels: Record<FilterTab, string> = {
            all: "Сите",
            mine: "Мои",
            shared: "Споделени",
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 flex items-center gap-1.5",
                activeFilter === tab
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {labels[tab]}
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeFilter === tab
                    ? "bg-accent/20 text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Notes grid or empty state ── */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-14 bg-muted/20 rounded-xl border border-border/50">
          <div className="flex flex-col items-center gap-3">
            {activeFilter === "shared" ? (
              <Users className="w-8 h-8 text-muted-foreground/50" />
            ) : (
              <Lock className="w-8 h-8 text-muted-foreground/50" />
            )}
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {emptyMessages[activeFilter]}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const owned = isOwner(note);
            return (
              <Card
                key={note.id}
                className={cn(
                  "flex flex-col transition-shadow hover:shadow-md",
                  owned ? "border-border" : "border-border/50 opacity-90"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base leading-snug">{note.title}</CardTitle>
                    {/* Badges */}
                    <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                      {note.is_shared && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          <Share2 className="w-2.5 h-2.5" />
                          Споделено
                        </span>
                      )}
                      {owned && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent-foreground border border-accent/30">
                          <Lock className="w-2.5 h-2.5" />
                          Моја
                        </span>
                      )}
                    </div>
                  </div>
                  {note.note_date && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {format(new Date(note.note_date), "dd.MM.yyyy")}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {note.description}
                  </p>
                </CardContent>

                <CardFooter className="pt-2 flex justify-between items-center gap-2 border-t mt-auto flex-wrap">
                  {/* Left: updated timestamp */}
                  <span className="text-[10px] text-muted-foreground/60">
                    {format(new Date(note.updated_at), "dd.MM.yy HH:mm")}
                  </span>

                  {/* Right: owner actions */}
                  {owned && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={note.is_shared ? "Стопирај споделување" : "Сподели со другите"}
                        onClick={() => handleToggleShare(note)}
                        className={cn(
                          "h-7 px-2 text-xs gap-1",
                          note.is_shared
                            ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        {note.is_shared ? "Стопирај" : "Сподели"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(note)}
                        className="h-7 px-2 text-xs gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Уреди
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNoteToDelete(note.id)}
                        className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Избриши
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Уреди белешка" : "Додај нова белешка"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Наслов *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Пр. Набавка на бои..."
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label>Опис *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Внесете детали..."
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>Датум (Опционално)</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-input h-10",
                      !formData.note_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.note_date
                      ? format(new Date(formData.note_date), "dd.MM.yyyy")
                      : "Избери датум"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.note_date ? new Date(formData.note_date) : undefined}
                    onSelect={(date) => {
                      setFormData({ ...formData, note_date: date ? format(date, "yyyy-MM-dd") : null });
                      setIsDatePickerOpen(false);
                    }}
                    locale={mk}
                    initialFocus
                  />
                  {formData.note_date && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          setFormData({ ...formData, note_date: null });
                          setIsDatePickerOpen(false);
                        }}
                      >
                        Исчисти датум
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Share toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium cursor-pointer" htmlFor="is-shared-toggle">
                  Сподели со другите администратори
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.is_shared
                    ? "Sите администратори можат да ја видат оваа белешка."
                    : "Само вие можете да ја видите оваа белешка."}
                </p>
              </div>
              <Switch
                id="is-shared-toggle"
                checked={formData.is_shared}
                onCheckedChange={(checked) => setFormData({ ...formData, is_shared: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Откажи
            </Button>
            <Button onClick={handleSave} className="bg-accent hover:bg-accent/90">
              Зачувај
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Избриши белешка?</AlertDialogTitle>
            <AlertDialogDescription>
              Оваа акција е неповратна. Белешката ќе биде трајно избришана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Откажи</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Избриши
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
