import { z } from 'zod';

// ==========================================
// 1. TYPESCRIPT INTERFACES
// ==========================================
export const SUPPORTED_LANGUAGE_CODES = ['en', 'zh', 'ms', 'ta', 'hok', 'hi', 'bn', 'te', 'mr', 'gu'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export interface LanguageInfo {
    name: string;
    region: 'Singapore' | 'India' | 'Singapore/India';
}

// ==========================================
// 2. ZOD VALIDATION SCHEMAS
// ==========================================
export const TranslateSchema = z.object({
    text: z.string().min(1, "Text to translate cannot be empty"),
    target_lang: z.enum(SUPPORTED_LANGUAGE_CODES),
    source_lang: z.enum(SUPPORTED_LANGUAGE_CODES).optional()
});

export const DetectSchema = z.object({
    text: z.string().min(1, "Text to detect cannot be empty")
});

// Infer TypeScript types directly from Zod (prevents duplicating work)
export type TranslateInput = z.infer<typeof TranslateSchema>;
export type DetectInput = z.infer<typeof DetectSchema>;