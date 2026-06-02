import { LanguageInfo } from './types.js';

// ==========================================
// 1. LANGUAGE MATRIX
// ==========================================
export const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
    // Singapore
    'en': { name: 'English', region: 'Singapore' },
    'zh': { name: 'Mandarin Chinese', region: 'Singapore' },
    'ms': { name: 'Malay', region: 'Singapore' },
    'ta': { name: 'Tamil', region: 'Singapore/India' },
    'hok': { name: 'Hokkien', region: 'Singapore' },
    // India
    'hi': { name: 'Hindi', region: 'India' },
    'bn': { name: 'Bengali', region: 'India' },
    'te': { name: 'Telugu', region: 'India' },
    'mr': { name: 'Marathi', region: 'India' },
    'gu': { name: 'Gujarati', region: 'India' }
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
export function getLanguageName(code: string): string | null {
    return SUPPORTED_LANGUAGES[code]?.name || null;
}

export function detectLanguageMock(text: string) {
    // Basic mock logic: assume English if standard ASCII, else assume Hindi
    const isAscii = /^[\x00-\x7F]*$/.test(text);
    return isAscii ? { code: 'en', name: 'English' } : { code: 'hi', name: 'Hindi' };
}

export function translateMock(text: string, targetLangCode: string): string {
    const langName = getLanguageName(targetLangCode);
    return `[Translated to ${langName}]: ${text}`;
}