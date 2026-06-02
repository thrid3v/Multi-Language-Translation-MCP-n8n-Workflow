import { translate } from 'google-translate-api-x';
import type { LanguageCode, LanguageInfo } from './types.js';

// ==========================================
// 1. LANGUAGE MATRIX
// ==========================================
export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageInfo> = {
    // Singapore
    'en': { name: 'English', region: 'Singapore' },
    'zh': { name: 'Mandarin Chinese', region: 'Singapore' },
    'ms': { name: 'Malay', region: 'Singapore' },
    'ta': { name: 'Tamil', region: 'Singapore/India' },
    'hok': { name: 'Hokkien', region: 'Singapore' }, // Note: Standard APIs may fallback to Traditional Chinese
    // India
    'hi': { name: 'Hindi', region: 'India' },
    'bn': { name: 'Bengali', region: 'India' },
    'te': { name: 'Telugu', region: 'India' },
    'mr': { name: 'Marathi', region: 'India' },
    'gu': { name: 'Gujarati', region: 'India' }
};

const LANGUAGE_CODE_TO_API_CODE: Record<LanguageCode, string> = {
    en: 'en',
    zh: 'zh-CN',
    ms: 'ms',
    ta: 'ta',
    hok: 'zh-TW',
    hi: 'hi',
    bn: 'bn',
    te: 'te',
    mr: 'mr',
    gu: 'gu'
};

const LANGUAGE_CODE_NORMALIZATION: Record<string, LanguageCode> = {
    'en-us': 'en',
    'en-gb': 'en',
    'en-au': 'en',
    'en-ca': 'en',
    'en-in': 'en',
    'zh-cn': 'zh',
    'zh-sg': 'zh',
    'zh-tw': 'zh',
    'zh-hk': 'zh',
    'zh-mo': 'zh',
    'hi-in': 'hi',
    'bn-in': 'bn',
    'te-in': 'te',
    'mr-in': 'mr',
    'gu-in': 'gu'
};

function normalizeLanguageCode(code: string): LanguageCode | null {
    const lower = code.trim().toLowerCase();
    if (lower in SUPPORTED_LANGUAGES) {
        return lower as LanguageCode;
    }
    if (lower in LANGUAGE_CODE_NORMALIZATION) {
        const mapped = LANGUAGE_CODE_NORMALIZATION[lower];
        return mapped ?? null;
    }

    const [base] = lower.split(/[-_]/);
    if (base && base in SUPPORTED_LANGUAGES) {
        return base as LanguageCode;
    }

    return null;
}

function mapLanguageCodeForApi(code: LanguageCode): string {
    return LANGUAGE_CODE_TO_API_CODE[code] || code;
}

export function getLanguageName(code: string): string | null {
    const normalized = normalizeLanguageCode(code);
    return normalized ? SUPPORTED_LANGUAGES[normalized]?.name || null : null;
}

// ==========================================
// 2. REAL API FUNCTIONS
// ==========================================

export async function detectLanguageReal(text: string) {
    try {
        // We translate the text to English just to trigger the API's auto-detect feature
        const response = await translate(text, { to: 'en' });
        const rawCode = response.from.language.iso;
        const normalizedCode = normalizeLanguageCode(rawCode);
        
        const code = normalizedCode ?? rawCode;
        const name = normalizedCode ? SUPPORTED_LANGUAGES[normalizedCode].name : 'Unknown / External Language';
        
        return { code, name };
    } catch (error) {
        throw new Error(`Failed to detect language: ${error}`);
    }
}

export async function translateTextReal(text: string, targetLangCode: string, sourceLangCode?: string) {
    try {
        const normalizedTarget = normalizeLanguageCode(targetLangCode);
        if (!normalizedTarget) {
            throw new Error(`Unsupported target language: ${targetLangCode}`);
        }

        const options: { to: string; from?: string } = {
            to: mapLanguageCodeForApi(normalizedTarget)
        };

        if (sourceLangCode) {
            const normalizedSource = normalizeLanguageCode(sourceLangCode);
            if (normalizedSource) {
                options.from = mapLanguageCodeForApi(normalizedSource);
            }
        }

        const response = await translate(text, options);
        return response.text;
    } catch (error) {
        throw new Error(`Translation API failed: ${error}`);
    }
}