import { useState } from "react";
import { useNotes, Note } from "@/hooks/useNotes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Edit2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { mk } from "date-fns/locale";

export default function NotesSection() {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    note_date: "" as string | null,
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        description: note.description,
        note_date: note.note_date,
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: "",
        description: "",
        note_date: null,
      });
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
        await createNote({
          title: formData.title,
          description: formData.description,
          note_date: formData.note_date,
        });
        toast({ title: "Успешно", description: "Нова белешка е додадена." });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message || "Настана грешка.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id);
      toast({ title: "Успешно", description: "Белешката е избришана." });
      if (editingNote?.id === id) {
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message || "Грешка при бришење.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="py-10 text-center">Се вчитуваат белешките...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Ваши белешки</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Додај белешка
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-border/50">
          <p className="text-muted-foreground">Немате додадено белешки. Кликнете "Додај белешка" за да започнете.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg leading-tight">{note.title}</CardTitle>
                </div>
                {note.note_date && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {format(new Date(note.note_date), "dd.MM.yyyy")}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm whitespace-pre-wrap">{note.description}</p>
              </CardContent>
              <CardFooter className="pt-2 flex justify-end gap-2 border-t mt-auto">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(note)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Уреди
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(note.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Избриши
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Уреди белешка" : "Додај нова белешка"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Наслов</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Пр. Набавка на бои..."
                className="h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Опис</Label>
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
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal border-input h-10",
                      !formData.note_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.note_date ? format(new Date(formData.note_date), "dd.MM.yyyy") : <span>Избери датум</span>}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Откажи</Button>
            <Button onClick={handleSave} className="bg-accent hover:bg-accent/90">Зачувај</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
