import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAppointments, Appointment } from "@/hooks/useAppointments";
import { useNonWorkingDays, isNonWorkingDay } from "@/hooks/useNonWorkingDays";
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
import { format, parse, isSunday } from "date-fns";
import { mk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Plus,
  LogOut,
  Home,
  Calendar,
  AlertTriangle,
  MessageCircle,
  Phone,
  Smartphone,
  CheckCircle,
  User,
} from "lucide-react";
import viollaLogo from "@/assets/new-logo.jpg";
import { SERVICE_OPTIONS } from "@/constants/services";
import WeekCalendar from "@/components/admin/WeekCalendar";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotesSection from "@/components/admin/NotesSection";

const serviceLabels: Record<string, string> = {
  hair: "Коса",
  nails: "Нокти",
  waxing: "Депилација",
  makeup: "Шминка",
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
  const dateObj = new Date(data.appointment_date);
  const formattedDate = format(dateObj, "dd.MM.yyyy");
  return `Здраво, ${data.customer_name || ""}! 💇‍♀️ Вашиот термин во Violla е успешно потврден за ${formattedDate} во ${data.start_time.slice(0, 5)} часот. Со задоволство Ве очекуваме! ✨`;
};

const Admin = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [isNonWorkingDaysDialogOpen, setIsNonWorkingDaysDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isOverlapAlertOpen, setIsOverlapAlertOpen] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState(false);

  const [isApptDateOpen, setIsApptDateOpen] = useState(false);
  const [isNwdDateOpen, setIsNwdDateOpen] = useState(false);

  // Non-Working Days hook
  const { nonWorkingDays, addNonWorkingDay, removeNonWorkingDay } = useNonWorkingDays();
  const [nwdFormData, setNwdFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    type: "FULL_DAY" as "FULL_DAY" | "CATEGORY",
    category_id: "hair" as string,
  });

  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(
    null,
  );
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const [pendingSubmission, setPendingSubmission] = useState<any>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  // UI State for contact preference badge
  const [contactPref, setContactPref] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_name: "",
    client_phone: "",
    service_type: "hair" as "hair" | "nails" | "waxing" | "makeup",
    sub_service: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    duration_minutes: 30,
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const requestId = searchParams.get("request_id");
    if (requestId && isAdmin && !loading) {
      const fetchRequest = async () => {
        try {
          const { data, error } = await supabase
            .from("appointment_requests")
            .select("*")
            .eq("id", requestId)
            .single();

          if (error) throw error;
          if (data) {
            setPendingRequestId(requestId);

            // Extract Pref
            let pref = "";
            let notesClean = data.notes || "";
            const prefMatch = notesClean.match(/\(Pref: (.*?)\)/);
            if (prefMatch) {
              pref = prefMatch[1];
              notesClean = notesClean.replace(/\(Pref: .*?\)/, "").trim();
            }
            setContactPref(pref);

            // Extract Sub Service
            let foundSubService = "";
            if (notesClean.startsWith("[")) {
              const endIndex = notesClean.indexOf("]");
              if (endIndex > 1) {
                const label = notesClean.substring(1, endIndex);
                const serviceConfig = SERVICE_OPTIONS.find(
                  (s) => s.id === data.service_type,
                );
                const sub = serviceConfig?.subServices.find(
                  (s) => s.label === label,
                );
                if (sub) foundSubService = sub.id;
                // Remove [Service] tag from notes view
                notesClean = notesClean.substring(endIndex + 1).trim();
              }
            }

            setFormData({
              customer_name: data.customer_name,
              client_phone: data.client_phone,
              service_type: data.service_type as "hair" | "nails" | "waxing" | "makeup",
              sub_service: foundSubService,
              appointment_date: data.appointment_date,
              start_time: data.start_time.slice(0, 5),
              duration_minutes: data.duration_minutes,
              notes: notesClean,
            });
            setIsDialogOpen(true);
            searchParams.delete("request_id");
            setSearchParams(searchParams);
          }
        } catch (error) {
          console.error("Error fetching request:", error);
          toast({
            title: "Грешка",
            description: "Не можевме да го вчитаме барањето.",
            variant: "destructive",
          });
        }
      };
      fetchRequest();
    }
  }, [searchParams, isAdmin, loading]);

  const handleSlotClick = (date: string, time: string) => {
    setEditingAppointment(null);
    setShowSuccessView(false);
    setPendingRequestId(null);
    setContactPref(null);
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
    setPendingRequestId(null);
    setContactPref(null);

    if (appointment) {
      setEditingAppointment(appointment);

      let pref = "";
      let notesClean = appointment.notes || "";
      const prefMatch = notesClean.match(/\(Pref: (.*?)\)/);
      if (prefMatch) {
        pref = prefMatch[1];
        notesClean = notesClean.replace(/\(Pref: .*?\)/, "").trim();
      }
      setContactPref(pref);

      let foundSubService = "";
      if (notesClean.startsWith("[")) {
        const endIndex = notesClean.indexOf("]");
        if (endIndex > 1) {
          const label = notesClean.substring(1, endIndex);
          const serviceConfig = SERVICE_OPTIONS.find(
            (s) => s.id === appointment.service_type,
          );
          const sub = serviceConfig?.subServices.find((s) => s.label === label);
          if (sub) foundSubService = sub.id;
          notesClean = notesClean.substring(endIndex + 1).trim();
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
        notes: notesClean,
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
    // Re-attach technical data to notes before saving
    let finalNotes = data.notes;
    // Add SubService Tag if selected
    if (data.sub_service) {
      const serviceConfig = SERVICE_OPTIONS.find(
        (s) => s.id === data.service_type,
      );
      const subServiceLabel = serviceConfig?.subServices.find(
        (sub) => sub.id === data.sub_service,
      )?.label;
      if (subServiceLabel) {
        finalNotes = `[${subServiceLabel}] ${finalNotes}`;
      }
    }
    // Add Pref Tag if exists (from state, not editable)
    if (contactPref) {
      finalNotes = `${finalNotes} (Pref: ${contactPref})`;
    }

    const payload = { ...data, notes: finalNotes.trim() };
    delete payload.sub_service; // clean up temp field

    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, payload);
        toast({ title: "Успешно", description: "Терминот е ажуриран" });
        setIsDialogOpen(false);
      } else {
        await createAppointment(payload);
        if (pendingRequestId) {
          await supabase
            .from("appointment_requests")
            .update({ status: "approved" })
            .eq("id", pendingRequestId);
        }
        toast({ title: "Успешно", description: "Терминот е додаден" });
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
      sub_service: formData.sub_service,
      appointment_date: formData.appointment_date,
      start_time: formData.start_time,
      duration_minutes: formData.duration_minutes,
      notes: formData.notes,
    };

    const hasOverlap = await checkOverlap(
      formData.appointment_date,
      formData.start_time,
      formData.duration_minutes,
      formData.service_type as "hair" | "nails" | "waxing" | "makeup",
      editingAppointment?.id,
    );

    if (hasOverlap) {
      setPendingSubmission(submissionData);
      setIsOverlapAlertOpen(true);
      return;
    }
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
      toast({ title: "Успешно", description: "Терминот е избришан" });
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

  const sendSMS = () => {
    if (!formData.client_phone) return;
    const message = generateConfirmationMessage(formData);
    let phone = formData.client_phone.replace(/\s/g, "");
    if (phone.startsWith("0")) phone = "389" + phone.substring(1);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `sms:${phone}&body=${encodeURIComponent(message)}`
      : `sms:${phone}?body=${encodeURIComponent(message)}`;

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
    window.open(url, "_blank");
  };

  const ConfirmationButtons = () => (
    <div className="space-y-3 pt-2">
      <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
        Испрати Потврда
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 border-purple-200 hover:bg-purple-50 hover:text-purple-600 dark:border-purple-900"
          onClick={sendViber}
        >
          <Phone className="w-4 h-4" /> Viber
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 border-green-200 hover:bg-green-50 hover:text-green-600 dark:border-green-900"
          onClick={sendWhatsApp}
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-blue-900"
          onClick={sendSMS}
        >
          <Smartphone className="w-4 h-4" /> SMS
        </Button>
      </div>
    </div>
  );

  const handleAddNonWorkingDay = async () => {
    try {
      await addNonWorkingDay(
        new Date(nwdFormData.date),
        nwdFormData.reason,
        nwdFormData.type,
        nwdFormData.type === "CATEGORY" ? nwdFormData.category_id : undefined
      );
      toast({ title: "Успешно", description: "Неработниот ден е додаден" });
      setNwdFormData({ date: format(new Date(), "yyyy-MM-dd"), reason: "", type: "FULL_DAY", category_id: "hair" });
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Датумот веќе постои или се случи грешка.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveNonWorkingDay = async (id: string) => {
    try {
      await removeNonWorkingDay(id);
      toast({ title: "Успешно", description: "Неработниот ден е отстранет" });
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Се случи грешка при отстранување.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Се вчитува...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6 overflow-x-hidden">
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
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2 mx-auto sm:mx-0">
            <TabsTrigger value="appointments">Термини</TabsTrigger>
            <TabsTrigger value="notes">Белешки</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appointments" className="space-y-4 outline-none">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl font-semibold text-foreground">Термини</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsNonWorkingDaysDialogOpen(true)}
                  variant="outline"
                  className="shadow-sm"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Неработни денови</span>
                  <span className="sm:hidden">Слободни</span>
                </Button>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-accent hover:bg-accent/90 shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Додај термин</span>
                  <span className="sm:hidden">Додај</span>
                </Button>
              </div>
            </div>
            <WeekCalendar
              appointments={appointments}
              nonWorkingDays={nonWorkingDays}
              onSlotClick={handleSlotClick}
              onAppointmentClick={handleOpenDialog}
            />
          </TabsContent>

          <TabsContent value="notes" className="outline-none">
            <NotesSection />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card w-[95vw] max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showSuccessView
                ? "Успешно Креирано"
                : editingAppointment
                  ? "Уреди термин"
                  : "Додај нов термин"}
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
                  Терминот за <strong>{formData.customer_name}</strong> е
                  успешно зачуван.
                </p>
              </div>
              <div className="w-full bg-muted/30 p-4 rounded-lg border border-border/50">
                <ConfirmationButtons />
              </div>
              <Button className="w-full" onClick={() => setIsDialogOpen(false)}>
                Затвори
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Име на клиент</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customer_name: e.target.value,
                        })
                      }
                      placeholder="Внесете име..."
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Телефон</Label>
                      {contactPref && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border ${contactPref.toLowerCase().includes("viber") ? "bg-purple-100 text-purple-700 border-purple-200" : contactPref.toLowerCase().includes("whatsapp") ? "bg-green-100 text-green-700 border-green-200" : "bg-blue-100 text-blue-700 border-blue-200"}`}
                        >
                          {contactPref}
                        </span>
                      )}
                    </div>
                    <Input
                      value={formData.client_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          client_phone: e.target.value,
                        })
                      }
                      placeholder="070..."
                      className="h-10"
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
                          service_type: v as any,
                          sub_service: "",
                        })
                      }
                    >
                      <SelectTrigger className="h-10">
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
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Избери..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_OPTIONS.find(
                          (s) => s.id === formData.service_type,
                        )?.subServices.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Датум</Label>
                    <Popover open={isApptDateOpen} onOpenChange={setIsApptDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full h-10 justify-start text-left font-normal border-input bg-background hover:bg-accent hover:text-accent-foreground",
                            !formData.appointment_date && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.appointment_date ? format(new Date(formData.appointment_date), "dd.MM.yyyy") : <span>Избери датум</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.appointment_date ? new Date(formData.appointment_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, appointment_date: format(date, "yyyy-MM-dd") });
                              setIsApptDateOpen(false);
                            }
                          }}
                          locale={mk}
                          initialFocus
                          modifiers={{
                            closed: (date) => isSunday(date) || isNonWorkingDay(date, nonWorkingDays),
                          }}
                          modifiersClassNames={{
                            closed: "line-through opacity-40 text-destructive",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Време</Label>
                    <Select
                      value={formData.start_time.slice(0, 5)}
                      onValueChange={(v) =>
                        setFormData({ ...formData, start_time: v })
                      }
                    >
                      <SelectTrigger className="h-10">
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

                {/* Inline warning: category is blocked on the selected date. Admin can still save (manual override). */}
                {formData.appointment_date && (isSunday(new Date(formData.appointment_date)) || isNonWorkingDay(new Date(formData.appointment_date), nonWorkingDays, formData.service_type)) && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Оваа категорија е блокирана на избраниот датум (неработен ден). Можете да закажете рачно, но клиентот нема да може да го направи тоа преку апликацијата.
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Траење</Label>
                  <Select
                    value={formData.duration_minutes.toString()}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(v),
                      })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value.toString()}
                        >
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
                    className="bg-background min-h-[80px]"
                  />
                </div>

                {editingAppointment && formData.client_phone && (
                  <div className="pt-2 border-t border-border mt-2">
                    <ConfirmationButtons />
                  </div>
                )}
                {editingAppointment && (
                  <div className="pt-2 border-t border-border mt-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full h-10"
                      onClick={() => confirmDelete(editingAppointment.id)}
                    >
                      Избриши термин
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-card pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-10"
                >
                  Откажи
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-accent hover:bg-accent/90 h-10"
                >
                  {editingAppointment ? "Зачувај промени" : "Креирај термин"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Дали сте сигурни?</AlertDialogTitle>
            <AlertDialogDescription>
              Оваа акција е неповратна. Терминот ќе биде трајно избришан од
              системот.
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

      <Dialog open={isNonWorkingDaysDialogOpen} onOpenChange={setIsNonWorkingDaysDialogOpen}>
        <DialogContent className="bg-card w-[95vw] max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Менаџирај неработни денови</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Add New Section */}
            <div className="space-y-4 bg-secondary/30 p-4 rounded-lg border border-border/50">
              <h3 className="text-sm font-medium text-foreground">Додај нов датум</h3>

              {/* Type toggle */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Тип на блокирање</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNwdFormData({ ...nwdFormData, type: "FULL_DAY" })}
                    className={`h-9 text-sm rounded-md border transition-colors ${nwdFormData.type === "FULL_DAY"
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-input bg-background hover:bg-accent/10"
                      }`}
                  >
                    🚫 Цел салон
                  </button>
                  <button
                    type="button"
                    onClick={() => setNwdFormData({ ...nwdFormData, type: "CATEGORY" })}
                    className={`h-9 text-sm rounded-md border transition-colors ${nwdFormData.type === "CATEGORY"
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-input bg-background hover:bg-accent/10"
                      }`}
                  >
                    ✂️ Категорија
                  </button>
                </div>
              </div>

              {/* Category dropdown — only shown for CATEGORY type */}
              {nwdFormData.type === "CATEGORY" && (
                <div className="space-y-2">
                  <Label>Категорија</Label>
                  <Select
                    value={nwdFormData.category_id}
                    onValueChange={(v) => setNwdFormData({ ...nwdFormData, category_id: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Датум</Label>
                  <Popover open={isNwdDateOpen} onOpenChange={setIsNwdDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal border-input bg-background hover:bg-accent hover:text-accent-foreground",
                          !nwdFormData.date && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {nwdFormData.date ? format(new Date(nwdFormData.date), "dd.MM.yyyy") : <span>Избери датум</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={nwdFormData.date ? new Date(nwdFormData.date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setNwdFormData({ ...nwdFormData, date: format(date, "yyyy-MM-dd") });
                            setIsNwdDateOpen(false);
                          }
                        }}
                        locale={mk}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Причина (опционално)</Label>
                  <Input
                    type="text"
                    placeholder="Пр: Годишен одмор"
                    value={nwdFormData.reason}
                    onChange={(e) => setNwdFormData({ ...nwdFormData, reason: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
              <Button onClick={handleAddNonWorkingDay} className="w-full h-10 bg-accent hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" /> Додај
              </Button>
            </div>

            {/* List Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Постоечки неработни денови</h3>
              {nonWorkingDays.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Немате додадено неработни денови.</p>
              ) : (
                <ul className="space-y-2">
                  {nonWorkingDays.map((nwd) => (
                    <li key={nwd.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(nwd.date), "dd.MM.yyyy")}
                          </p>
                          {nwd.type === "CATEGORY" && nwd.category_id ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
                              ✂️ {serviceLabels[nwd.category_id] || nwd.category_id}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 font-semibold">
                              🚫 Цел салон
                            </span>
                          )}
                        </div>
                        {nwd.reason && (
                          <p className="text-xs text-muted-foreground">{nwd.reason}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNonWorkingDay(nwd.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Избриши
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNonWorkingDaysDialogOpen(false)}>Затвори</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={isOverlapAlertOpen}
        onOpenChange={setIsOverlapAlertOpen}
      >
        <AlertDialogContent className="w-[90vw] max-w-md rounded-xl border-amber-500/50">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle className="text-amber-500">
                Внимание: Преклопување
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-foreground">
              Веќе постои термин во ова време за избраната категорија.
              <br />
              <br />
              Дали сте сигурни дека сакате да го додадете овој термин секако?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmission(null)}>
              Откажи
            </AlertDialogCancel>
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
