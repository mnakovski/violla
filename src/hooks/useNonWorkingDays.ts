import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface NonWorkingDay {
    id: string;
    date: string;
    reason: string | null;
    type: "FULL_DAY" | "CATEGORY";
    category_id: string | null;
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

    const addNonWorkingDay = async (
        date: Date,
        reason?: string,
        type: "FULL_DAY" | "CATEGORY" = "FULL_DAY",
        category_id?: string
    ) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const { error } = await supabase.from("non_working_days").insert({
            date: dateStr,
            reason: reason || null,
            type,
            category_id: type === "CATEGORY" ? (category_id || null) : null,
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

/**
 * Check if a date is closed/blocked.
 *
 * @param date         The date to check
 * @param nonWorkingDays  Full list from the hook
 * @param serviceType  Optional. When provided, returns true if FULL_DAY entry
 *                     exists OR a CATEGORY entry matching this serviceType exists.
 *                     When omitted, returns true only for FULL_DAY entries
 *                     (used by date-pickers and calendar modifiers).
 */
export const isNonWorkingDay = (
    date: Date,
    nonWorkingDays: NonWorkingDay[],
    serviceType?: string
): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayEntries = nonWorkingDays.filter((nwd) => nwd.date === dateStr);

    // Always block if there's a FULL_DAY entry
    if (dayEntries.some((nwd) => nwd.type === "FULL_DAY")) return true;

    // If a specific service is being checked, also block for matching CATEGORY entries
    if (serviceType) {
        return dayEntries.some(
            (nwd) => nwd.type === "CATEGORY" && nwd.category_id === serviceType
        );
    }

    return false;
};
