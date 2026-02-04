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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, LogOut, Home, Calendar } from "lucide-react";
import viollaLogo from "@/assets/violla-logo.jpg";
import { SERVICE_OPTIONS } from "@/constants/services";
import WeekCalendar from "@/components/admin/WeekCalendar";

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
    client_phone: "",
    service_type: "hair" as "hair" | "nails" | "waxing",
    sub_service: "", // Temporary state for UI
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    duration_minutes: 30,
    notes: "",
  });

  // Protect Admin Route
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSlotClick = (date: string, time: string) => {
    setEditingAppointment(null);
    setFormData({
      customer_name: "",
      client_phone: "",
      service_type: "hair",
      sub_service: "",
      appointment_date: date,
      start_time: time,
      duration_minutes: 30,
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      
      // Try to extract sub-service from notes
      let foundSubService = "";
      if (appointment.notes && appointment.notes.startsWith("[")) {
        const endIndex = appointment.notes.indexOf("]");
        if (endIndex > 1) {
          const label = appointment.notes.substring(1, endIndex);
          // Find ID based on label
          const serviceConfig = SERVICE_OPTIONS.find(s => s.id === appointment.service_type);
          const sub = serviceConfig?.subServices.find(s => s.label === label);
          if (sub) foundSubService = sub.id;
        }
      }

      setFormData({
        customer_name: appointment.customer_name || "",
        client_phone: appointment.client_phone || "",
        service_type: appointment.service_type,
        sub_service: foundSubService,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time.slice(0, 5),
        duration_minutes: appointment.duration_minutes,
        notes: appointment.notes || "",
      });
    } else {
      setEditingAppointment(null);
      setFormData({
        customer_name: "",
        client_phone: "",
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
        client_phone: formData.client_phone,
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

        {/* Week Calendar View */}
        <WeekCalendar
          appointments={appointments}
          onSlotClick={handleSlotClick}
          onAppointmentClick={handleOpenDialog}
        />
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Телефон (опц.)</Label>
                <Input
                  value={formData.client_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, client_phone: e.target.value })
                  }
                  placeholder="070..."
                  className="h-11"
                />
              </div>
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
