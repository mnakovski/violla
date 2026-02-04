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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { mk } from "date-fns/locale";
import { Plus, Pencil, Trash2, LogOut, Home, Calendar, Clock, User, Scissors } from "lucide-react";
import viollaLogo from "@/assets/violla-logo.jpg";
import { SERVICE_OPTIONS } from "@/constants/services";

const serviceLabels: Record<string, string> = {
  hair: "Коса",
  nails: "Нокти",
  waxing: "Депилација",
};

const durationOptions = [
  { value: 15, label: "15 минути" },
  { value: 30, label: "30 минути" },
  { value: 60, label: "60 минути" },
  { value: 90, label: "1 час 30 мин" },
  { value: 120, label: "2 часа" },
  { value: 240, label: "4 часа" },
];

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 8; hour <= 20; hour++) {
    const hourStr = hour.toString().padStart(2, "0");
    options.push(`${hourStr}:00`);
    if (hour < 20) {
      options.push(`${hourStr}:15`);
      options.push(`${hourStr}:30`);
      options.push(`${hourStr}:45`);
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

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
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  const [formData, setFormData] = useState({
    customer_name: "",
    service_type: "hair" as "hair" | "nails" | "waxing",
    sub_service: "", // Temporary state for UI
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    duration_minutes: 30,
    notes: "",
  });

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      // Try to extract sub-service from notes if possible, or just reset
      setFormData({
        customer_name: appointment.customer_name || "",
        service_type: appointment.service_type,
        sub_service: "",
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
        sub_service: "",
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
      // Prepare data for submission
      // If a sub-service is selected, we might want to prepend it to notes if not already there
      let finalNotes = formData.notes;
      if (formData.sub_service) {
         const serviceConfig = SERVICE_OPTIONS.find(s => s.id === formData.service_type);
         const subServiceLabel = serviceConfig?.subServices.find(sub => sub.id === formData.sub_service)?.label;
         
         if (subServiceLabel) {
            // Simple check to avoid duplication if editing
            if (!finalNotes.includes(subServiceLabel)) {
               finalNotes = `[${subServiceLabel}] ${finalNotes}`;
            }
         }
      }

      const submissionData = {
        customer_name: formData.customer_name,
        service_type: formData.service_type,
        appointment_date: formData.appointment_date,
        start_time: formData.start_time,
        duration_minutes: formData.duration_minutes,
        notes: finalNotes
      };

      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, submissionData);
        toast({
          title: "Успешно",
          description: "Терминот е ажуриран",
        });
      } else {
        await createAppointment(submissionData);
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

  const confirmDelete = (id: string) => {
    setAppointmentToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!appointmentToDelete) return;
    
    try {
      await deleteAppointment(appointmentToDelete);
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
    } finally {
      setIsAlertOpen(false);
      setAppointmentToDelete(null);
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
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={viollaLogo}
              alt="Violla"
              className="w-10 h-10 rounded-full object-cover border border-border"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                Админ Панел
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
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
          <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Додај термин</span>
            <span className="sm:hidden">Додај</span>
          </Button>
        </div>

        {/* Empty State */}
        {appointments.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border border-border/50">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Нема закажани термини</h3>
            <p className="text-muted-foreground mb-6">Календарот е празен за овој период.</p>
            <Button onClick={() => handleOpenDialog()} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Додај прв термин
            </Button>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block salon-card overflow-hidden">
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
              {appointments.map((apt) => {
                const isSunday = parseISO(apt.appointment_date).getDay() === 0;
                return (
                  <TableRow
                    key={apt.id}
                    className={isSunday ? "bg-accent/5" : ""}
                  >
                    <TableCell className="font-medium">
                      {apt.customer_name || "Непознато"}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(apt.appointment_date), "d MMM yyyy", {
                        locale: mk,
                      })}
                      {isSunday && (
                        <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                          Недела
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{apt.start_time.slice(0, 5)}</TableCell>
                    <TableCell>{serviceLabels[apt.service_type]}</TableCell>
                    <TableCell>{apt.duration_minutes} мин</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {apt.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(apt)}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(apt.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {appointments.map((apt) => {
            const isSunday = parseISO(apt.appointment_date).getDay() === 0;
            return (
              <Card key={apt.id} className={`overflow-hidden ${isSunday ? "border-accent/30 bg-accent/5" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {apt.customer_name || "Непознато"}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          {serviceLabels[apt.service_type]}
                        </p>
                      </div>
                    </div>
                    {isSunday && (
                      <span className="text-[10px] font-bold bg-accent/20 text-accent px-2 py-1 rounded-full uppercase tracking-wide">
                        Недела
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground bg-secondary/50 p-2 rounded">
                      <Calendar className="w-4 h-4" />
                      <span>{format(parseISO(apt.appointment_date), "d MMM", { locale: mk })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground bg-secondary/50 p-2 rounded">
                      <Clock className="w-4 h-4" />
                      <span>{apt.start_time.slice(0, 5)} ({apt.duration_minutes}м)</span>
                    </div>
                  </div>

                  {apt.notes && (
                    <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded mb-4 italic">
                      "{apt.notes}"
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-border pt-3 mt-1">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-9 text-sm"
                      onClick={() => handleOpenDialog(apt)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-2" />
                      Уреди
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-9 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                      onClick={() => confirmDelete(apt.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Избриши
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card w-[95vw] max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Уреди термин" : "Додај нов термин"}
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
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Категорија</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(v) =>
                    setFormData({ 
                      ...formData, 
                      service_type: v as "hair" | "nails" | "waxing",
                      sub_service: "" // Reset sub-service when category changes
                    })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Услуга</Label>
                <Select
                  value={formData.sub_service}
                  onValueChange={(v) =>
                    setFormData({ ...formData, sub_service: v })
                  }
                  disabled={!formData.service_type}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Избери..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.find(s => s.id === formData.service_type)?.subServices.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
                <Label>Траење</Label>
                <Select
                  value={formData.duration_minutes.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, duration_minutes: parseInt(v) })
                  }
                >
                  <SelectTrigger className="h-11">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Датум</Label>
                <Input
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, appointment_date: e.target.value })
                  }
                  className="h-11 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label>Време</Label>
                <Select
                  value={formData.start_time.slice(0, 5)}
                  onValueChange={(v) =>
                    setFormData({ ...formData, start_time: v })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Белешки (опционално)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Додадете белешки..."
                className="bg-background min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11">
              Откажи
            </Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90 h-11">
              {editingAppointment ? "Зачувај промени" : "Креирај термин"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Дали сте сигурни?</AlertDialogTitle>
            <AlertDialogDescription>
              Оваа акција е неповратна. Терминот ќе биде трајно избришан од системот.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Откажи</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Избриши
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
