import { z } from 'zod';

// ==========================================
// 1. TYPESCRIPT INTERFACES
// ==========================================
export interface LanguageInfo {
    name: string;
    region: 'Singapore' | 'India' | 'Singapore/India';
}

// ==========================================
// 2. ZOD VALIDATION SCHEMAS
// ==========================================
export const TranslateSchema = z.object({
    text: z.string().min(1, "Text to translate cannot be empty"),
    target_lang: z.string().min(2).max(3),
    source_lang: z.string().optional()
});

export const DetectSchema = z.object({
    text: z.string().min(1, "Text to detect cannot be empty")
});

// Infer TypeScript types directly from Zod (prevents duplicating work)
export type TranslateInput = z.infer<typeof TranslateSchema>;
export type DetectInput = z.infer<typeof DetectSchema>;