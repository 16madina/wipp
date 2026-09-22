/**
 * Public Supabase project config for WIPP.
 * Safe to expose: URL + anon/publishable key only.
 */
export const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://sdaulxbcksusojcbsucr.supabase.co";

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkYXVseGJja3N1c29qY2JzdWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDc3NzIsImV4cCI6MjEwNTY4Mzc3Mn0.DvTB8RM3IU5qr_gWqQK3P9FlRz66t7zPyWpqOoDA5rg";

export const SUPABASE_PROJECT_REF = "sdaulxbcksusojcbsucr";
