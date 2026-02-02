import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAppointments, Appointment } from "@/hooks/useAppointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { mk } from "date-fns/locale";
import { Plus, Pencil, Trash2, LogOut, Home } from "lucide-react";
import viollaLogo from "@/assets/violla-logo.jpg";

const serviceLabels: Record<string, string> = {
  hair: "Коса",
  nails: "Нокти",
  waxing: "Депилација",
};

const durationOptions = [
  { value: 30, label: "30 минути" },
  { value: 60, label: "60 минути" },
  { value: 90, label: "90 минути" },
  { value: 120, label: "120 минути" },
];

const Admin = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAdminAppointments();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    service_type: "hair" as "hair" | "nails" | "waxing",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    duration_minutes: 30,
    notes: "",
  });

  /*
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, authLoading, navigate]);
  */

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        customer_name: appointment.customer_name || "",
        service_type: appointment.service_type,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time.slice(0, 5),
        duration_minutes: appointment.duration_minutes,
        notes: appointment.notes || "",
      });
    } else {
      setEditingAppointment(null);
      setFormData({
        customer_name: "",
        service_type: "hair",
        appointment_date: format(new Date(), "yyyy-MM-dd"),
        start_time: "09:00",
        duration_minutes: 30,
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, formData);
        toast({
          title: "Успешно",
          description: "Терминот е ажуриран",
        });
      } else {
        await createAppointment(formData);
        toast({
          title: "Успешно",
          description: "Терминот е додаден",
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Грешка",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Дали сте сигурни дека сакате да го избришете овој термин?")) {
      try {
        await deleteAppointment(id);
        toast({
          title: "Успешно",
          description: "Терминот е избришан",
        });
      } catch (error) {
        toast({
          title: "Грешка",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Се вчитува...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={viollaLogo}
              alt="Violla"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Админ Панел
              </h1>
              <p className="text-xs text-muted-foreground">
                Управување со термини
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              title="Почетна"
            >
              <Home className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Одјави се"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Термини</h2>
          <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Додај термин
          </Button>
        </div>

        {/* Appointments Table */}
        <div className="salon-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Име</TableHead>
                <TableHead>Датум</TableHead>
                <TableHead>Време</TableHead>
                <TableHead>Услуга</TableHead>
                <TableHead>Траење</TableHead>
                <TableHead>Белешки</TableHead>
                <TableHead className="text-right">Акции</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">Нема термини</p>
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((apt) => {
                  const isSunday =
                    parseISO(apt.appointment_date).getDay() === 0;
                  return (
                    <TableRow
                      key={apt.id}
                      className={isSunday ? "bg-accent/10" : ""}
                    >
                      <TableCell className="font-medium">
                        {apt.customer_name || "Непознато"}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(apt.appointment_date), "d MMM yyyy", {
                          locale: mk,
                        })}
                        {isSunday && (
                          <span className="ml-2 text-xs text-accent">
                            (недела)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{apt.start_time.slice(0, 5)}</TableCell>
                      <TableCell>{serviceLabels[apt.service_type]}</TableCell>
                      <TableCell>{apt.duration_minutes} мин</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {apt.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(apt)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(apt.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Уреди термин" : "Додај термин"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Име на клиент</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                placeholder="Внесете име..."
              />
            </div>

            <div className="space-y-2">
              <Label>Услуга</Label>
              <Select
                value={formData.service_type}
                onValueChange={(v) =>
                  setFormData({ ...formData, service_type: v as "hair" | "nails" | "waxing" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hair">Коса</SelectItem>
                  <SelectItem value="nails">Нокти</SelectItem>
                  <SelectItem value="waxing">Депилација</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Датум</Label>
              <Input
                type="date"
                value={formData.appointment_date}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Време</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Траење</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(v) =>
                  setFormData({ ...formData, duration_minutes: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Белешки (опционално)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Додадете белешки..."
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Откажи
            </Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
              {editingAppointment ? "Зачувај" : "Додај"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
