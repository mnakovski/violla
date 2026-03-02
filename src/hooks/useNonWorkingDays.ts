import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface NonWorkingDay {
    id: string;
    date: string;
    reason: string | null;
    created_at: string;
}

export const useNonWorkingDays = () => {
    const [nonWorkingDays, setNonWorkingDays] = useState<NonWorkingDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchNonWorkingDays = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("non_working_days")
                .select("*")
                .order("date", { ascending: true });

            if (error) throw error;
            setNonWorkingDays(data || []);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addNonWorkingDay = async (date: Date, reason?: string) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const { error } = await supabase.from("non_working_days").insert({
            date: dateStr,
            reason: reason || null,
        });

        if (error) {
            console.error("Error adding non-working day:", error);
            throw error;
        }
        await fetchNonWorkingDays();
    };

    const removeNonWorkingDay = async (id: string) => {
        const { error } = await supabase
            .from("non_working_days")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error removing non-working day:", error);
            throw error;
        }
        await fetchNonWorkingDays();
    };

    useEffect(() => {
        fetchNonWorkingDays();

        // Subscribe to realtime changes
        const channel = supabase
            .channel("non-working-days-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "non_working_days",
                },
                () => {
                    fetchNonWorkingDays();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchNonWorkingDays]);

    return {
        nonWorkingDays,
        loading,
        error,
        refetch: fetchNonWorkingDays,
        addNonWorkingDay,
        removeNonWorkingDay,
    };
};

// Helper: check if a Date is a non-working day according to fetched list
export const isNonWorkingDay = (
    date: Date,
    nonWorkingDays: NonWorkingDay[]
): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return nonWorkingDays.some((nwd) => nwd.date === dateStr);
};
