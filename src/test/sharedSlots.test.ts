import { describe, it, expect } from "vitest";
import {
    getSharedSlotPartners,
    getOccupiedSlotsForCustomer,
    SHARED_SLOT_SERVICES,
    type PublicAppointment,
} from "@/hooks/useAppointments";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = new Date("2026-03-10"); // A Monday, salon is open

const makeApt = (
    service_type: PublicAppointment["service_type"],
    start_time: string,
    duration_minutes: number
): PublicAppointment => ({
    id: `${service_type}-${start_time}`,
    service_type,
    appointment_date: "2026-03-10",
    start_time,
    duration_minutes,
});

// ---------------------------------------------------------------------------
// SHARED_SLOT_SERVICES constant
// ---------------------------------------------------------------------------

describe("SHARED_SLOT_SERVICES", () => {
    it("includes nails, waxing, makeup", () => {
        expect(SHARED_SLOT_SERVICES.has("nails")).toBe(true);
        expect(SHARED_SLOT_SERVICES.has("waxing")).toBe(true);
        expect(SHARED_SLOT_SERVICES.has("makeup")).toBe(true);
    });

    it("does NOT include hair", () => {
        expect(SHARED_SLOT_SERVICES.has("hair")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getSharedSlotPartners
// ---------------------------------------------------------------------------

describe("getSharedSlotPartners", () => {
    it("returns waxing + makeup when called with nails", () => {
        const partners = getSharedSlotPartners("nails");
        expect(partners).toHaveLength(2);
        expect(partners).toContain("waxing");
        expect(partners).toContain("makeup");
        expect(partners).not.toContain("nails");
    });

    it("returns nails + makeup when called with waxing", () => {
        const partners = getSharedSlotPartners("waxing");
        expect(partners).toContain("nails");
        expect(partners).toContain("makeup");
        expect(partners).not.toContain("waxing");
    });

    it("returns nails + waxing when called with makeup", () => {
        const partners = getSharedSlotPartners("makeup");
        expect(partners).toContain("nails");
        expect(partners).toContain("waxing");
        expect(partners).not.toContain("makeup");
    });

    it("returns empty array for hair (independent)", () => {
        expect(getSharedSlotPartners("hair")).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// getOccupiedSlotsForCustomer
// ---------------------------------------------------------------------------

describe("getOccupiedSlotsForCustomer", () => {
    const appointments: PublicAppointment[] = [
        makeApt("nails", "14:00:00", 30), // blocks 14:00 and 14:15
        makeApt("hair", "10:00:00", 30),  // blocks 10:00 and 10:15 (hair-only)
    ];

    it("viewing nails: own nails booking is blocked", () => {
        const slots = getOccupiedSlotsForCustomer(appointments, DATE, "nails");
        expect(slots.has("14:00")).toBe(true);
        expect(slots.has("14:15")).toBe(true);
    });

    it("viewing waxing: nails booking cross-blocks the same slots", () => {
        const slots = getOccupiedSlotsForCustomer(appointments, DATE, "waxing");
        expect(slots.has("14:00")).toBe(true);
        expect(slots.has("14:15")).toBe(true);
    });

    it("viewing makeup: nails booking cross-blocks the same slots", () => {
        const slots = getOccupiedSlotsForCustomer(appointments, DATE, "makeup");
        expect(slots.has("14:00")).toBe(true);
        expect(slots.has("14:15")).toBe(true);
    });

    it("hair booking does NOT bleed into nails", () => {
        const slots = getOccupiedSlotsForCustomer(appointments, DATE, "nails");
        expect(slots.has("10:00")).toBe(false);
        expect(slots.has("10:15")).toBe(false);
    });

    it("hair booking does NOT bleed into waxing", () => {
        const slots = getOccupiedSlotsForCustomer(appointments, DATE, "waxing");
        expect(slots.has("10:00")).toBe(false);
    });

    it("viewing hair: own hair booking is blocked, nails booking is NOT", () => {
        const slots = getOccupiedSlotsForCustomer(appointments, DATE, "hair");
        expect(slots.has("10:00")).toBe(true);   // hair slot blocked for hair ✓
        expect(slots.has("14:00")).toBe(false);  // nails slot does not bleed into hair ✓
    });

    it("returns empty set when no appointments", () => {
        const slots = getOccupiedSlotsForCustomer([], DATE, "nails");
        expect(slots.size).toBe(0);
    });

    it("waxing booking blocks nails and makeup viewing", () => {
        const waxingApts: PublicAppointment[] = [makeApt("waxing", "16:00:00", 15)];
        expect(getOccupiedSlotsForCustomer(waxingApts, DATE, "nails").has("16:00")).toBe(true);
        expect(getOccupiedSlotsForCustomer(waxingApts, DATE, "makeup").has("16:00")).toBe(true);
        expect(getOccupiedSlotsForCustomer(waxingApts, DATE, "hair").has("16:00")).toBe(false);
    });
});
