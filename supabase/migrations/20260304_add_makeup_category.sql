-- ============================================================
-- Migration: Add 'makeup' to service_type enum
-- Date: 2026-03-04
-- Environment: Staging FIRST, then Production after approval
-- ============================================================
-- Adds a new "Шминка" (Makeup) category with the enum value 'makeup'.
-- This is safe — PostgreSQL supports adding values to existing enums.
-- Existing rows are unaffected.
-- ============================================================

ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'makeup';
