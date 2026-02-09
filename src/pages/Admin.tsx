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
import { Plus, LogOut, Home, Calendar, AlertTriangle, MessageCircle, Phone, Smartphone, CheckCircle } from "lucide-react";
import viollaLogo from "@/assets/new-logo.jpg";
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
  { value: 45, label: "45 минути" },
  { value: 60, label: "1 час" },
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

const generateConfirmationMessage = (data: any) => {
  // Format date to local standard (e.g. 10.02.2026)
  const dateObj = new Date(data.appointment_date);
  const formattedDate = format(dateObj, "dd.MM.yyyy");
  
  return `Здраво, ${data.customer_name || ""}! 💇‍♀️ Вашиот термин во Violla е успешно потврден за ${formattedDate} во ${data.start_time.slice(0, 5)} часот. Со задоволство Ве очекуваме! ✨`;
};

const Admin = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    appointments,
    loading,
    checkOverlap,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAdminAppointments();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isOverlapAlertOpen, setIsOverlapAlertOpen] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState(false);
  
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  // Store form data to be submitted after confirmation
  const [pendingSubmission, setPendingSubmission] = useState<any>(null);
  
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
    setShowSuccessView(false);
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
    setShowSuccessView(false);
    if (appointment) {
      setEditingAppointment(appointment);
      
      // Try to extract sub-service from notes
      let foundSubService = "";
      if (appointment.notes && appointment.notes.startsWith("[")) {
        const endIndex = appointment.notes.indexOf("]");
        if (endIndex > 1) {
          // Logic to find sub service... keeping it simple for now as it was
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

  const executeSubmission = async (data: any) => {
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, data);
        toast({
          title: "Успешно",
          description: "Терминот е ажуриран",
        });
        setIsDialogOpen(false); // Close on edit as requested (but buttons are visible inside if they want to click before saving)
      } else {
        await createAppointment(data);
        toast({
          title: "Успешно",
          description: "Терминот е додаден",
        });
        // Show success view instead of closing
        setShowSuccessView(true);
      }
      setPendingSubmission(null);
    } catch (error) {
      toast({
        title: "Грешка",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    const submissionData = {
      customer_name: formData.customer_name,
      client_phone: formData.client_phone,
      service_type: formData.service_type,
      appointment_date: formData.appointment_date,
      start_time: formData.start_time,
      duration_minutes: formData.duration_minutes,
      notes: formData.notes
    };

    // Check for overlap first
    const hasOverlap = await checkOverlap(
      formData.appointment_date,
      formData.start_time,
      formData.duration_minutes,
      formData.service_type,
      editingAppointment?.id // Exclude current if editing
    );

    if (hasOverlap) {
      setPendingSubmission(submissionData);
      setIsOverlapAlertOpen(true);
      return;
    }

    // No overlap, proceed immediately
    await executeSubmission(submissionData);
  };

  const handleConfirmOverlap = async () => {
    if (pendingSubmission) {
      setIsOverlapAlertOpen(false);
      await executeSubmission(pendingSubmission);
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

  // Notification Helpers
  const sendSMS = () => {
    if (!formData.client_phone) return;
    const message = generateConfirmationMessage(formData);
    const url = `sms:${formData.client_phone}?body=${encodeURIComponent(message)}`;
    window.location.href = url;
  };

  const sendViber = () => {
    if (!formData.client_phone) return;
    const message = generateConfirmationMessage(formData);
    let phone = formData.client_phone.replace(/\s/g, "");
    if (phone.startsWith("0")) phone = "389" + phone.substring(1);
    
    const url = `viber://chat?number=%2B${phone}`; 
    const forwardUrl = `viber://forward?text=${encodeURIComponent(message)}`;
    window.location.href = forwardUrl;
  };

  const sendWhatsApp = () => {
    if (!formData.client_phone) return;
    const message = generateConfirmationMessage(formData);
    let phone = formData.client_phone.replace(/\s/g, "");
    if (phone.startsWith("0")) phone = "389" + phone.substring(1);
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Render Confirmation Buttons Component
  const ConfirmationButtons = () => (
    <div className="space-y-3 pt-2">
      <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Испрати Потврда</Label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button 
          type="button" 
          variant="outline" 
          className="h-12 sm:h-10 gap-2 border-purple-200 hover:bg-purple-50 hover:text-purple-600 dark:border-purple-900 dark:hover:bg-purple-900/20"
          onClick={sendViber}
          title="Viber"
        >
          <Phone className="w-4 h-4" /> Viber
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="h-12 sm:h-10 gap-2 border-green-200 hover:bg-green-50 hover:text-green-600 dark:border-green-900 dark:hover:bg-green-900/20"
          onClick={sendWhatsApp}
          title="WhatsApp"
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="h-12 sm:h-10 gap-2 border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-blue-900 dark:hover:bg-blue-900/20"
          onClick={sendSMS}
          title="SMS"
        >
          <Smartphone className="w-4 h-4" /> SMS
        </Button>
      </div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Се вчитува...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={viollaLogo}
              alt="Violla"
              className="w-10 h-10 rounded-full object-cover border-2 border-accent/40 shadow-md"
            />
            <h1 
              className="text-xl text-foreground tracking-wide"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Violla
            </h1>
            <span className="hidden sm:inline-block text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              Админ
            </span>
          </div>
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-background/50"
              onClick={() => navigate("/")}
              title="Почетна"
            >
              <Home className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-background/50"
              onClick={handleSignOut}
              title="Одјави се"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Actions */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
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
        <DialogContent className="bg-card w-[95vw] max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showSuccessView 
                ? "Успешно Креирано" 
                : (editingAppointment ? "Уреди термин" : "Додај нов термин")}
            </DialogTitle>
          </DialogHeader>

          {showSuccessView ? (
            <div className="py-6 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Терминот е додаден!</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Терминот за <strong>{formData.customer_name}</strong> е успешно зачуван во календарот.
                </p>
              </div>
              
              <div className="w-full bg-muted/30 p-4 rounded-lg border border-border/50">
                 {/* Reusing confirmation buttons component */}
                 <ConfirmationButtons />
              </div>

              <Button 
                className="w-full" 
                onClick={() => setIsDialogOpen(false)}
              >
                Затвори
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Form Fields - same as before */}
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
                    <Label>Телефон</Label>
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

                {/* Rest of form fields (Category, Service, Duration, Date, Time, Notes) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Категорија</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(v) =>
                        setFormData({ 
                          ...formData, 
                          service_type: v as "hair" | "nails" | "waxing",
                          sub_service: "" 
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
                
                {/* Only show buttons here if editing existing appointment */}
                {editingAppointment && formData.client_phone && (
                   <div className="pt-2 border-t border-border mt-2">
                     <ConfirmationButtons />
                   </div>
                )}

                {editingAppointment && (
                  <div className="pt-4 border-t border-border mt-4">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      className="w-full h-9" 
                      onClick={() => confirmDelete(editingAppointment.id)}
                    >
                      Избриши термин
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-card pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11">
                  Откажи
                </Button>
                <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90 h-11">
                  {editingAppointment ? "Зачувај промени" : "Креирај термин"}
                </Button>
              </DialogFooter>
            </>
          )}
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

      {/* Overlap Confirmation Alert */}
      <AlertDialog open={isOverlapAlertOpen} onOpenChange={setIsOverlapAlertOpen}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-xl border-amber-500/50">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle className="text-amber-500">Внимание: Преклопување</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-foreground">
              Веќе постои термин во ова време за избраната категорија.
              <br /><br />
              Дали сте сигурни дека сакате да го додадете овој термин секако?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmission(null)}>Откажи</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmOverlap}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Закажи секако
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
