import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// ==========================================
// 1. TYPES & DATA DICTIONARY
// ==========================================

interface LanguageInfo {
    name: string;
    region: 'Singapore' | 'India' | 'Singapore/India';
}

const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
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
// 2. INPUT VALIDATION SCHEMAS (Zod)
// ==========================================
const TranslateSchema = z.object({
    text: z.string().min(1, "Text to translate cannot be empty"),
    target_lang: z.string().min(2).max(3),
    source_lang: z.string().optional()
});

const DetectSchema = z.object({
    text: z.string().min(1, "Text to detect cannot be empty")
});

// ==========================================
// 3. LOGGER UTILITY
// ==========================================
const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data ? JSON.stringify(data) : ''),
    error: (msg: string, err: unknown) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
};

// ==========================================
// 4. INITIALIZE MCP SERVER
// ==========================================
const server = new Server(
    { name: 'multi-lang-translator-ts', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

// Register Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'get_supported_languages',
            description: 'Returns a list of all supported languages for translation.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'detect_language',
            description: 'Detects the language of a given text.',
            inputSchema: {
                type: 'object',
                properties: { text: { type: 'string', description: 'Text to analyze' } },
                required: ['text']
            }
        },
        {
            name: 'translate_text',
            description: 'Translates text to a target language. Supported codes: en, zh, ms, ta, hok, hi, bn, te, mr, gu.',
            inputSchema: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to translate' },
                    target_lang: { type: 'string', description: 'ISO code of target language (e.g., en, hi, zh)' },
                    source_lang: { type: 'string', description: 'Optional ISO code of source language' }
                },
                required: ['text', 'target_lang']
            }
        }
    ]
}));

// Handle Tool Executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.info(`Tool called: ${request.params.name}`);
    
    try {
        if (request.params.name === 'get_supported_languages') {
            return {
                content: [{ type: 'text', text: JSON.stringify(SUPPORTED_LANGUAGES, null, 2) }]
            };
        }

        if (request.params.name === 'detect_language') {
            // Zod parsing gives us strict types for the extracted arguments
            const { text } = DetectSchema.parse(request.params.arguments);
            
            // Mock detection logic
            const isAscii = /^[\x00-\x7F]*$/.test(text);
            const detected = isAscii ? { code: 'en', name: 'English' } : { code: 'hi', name: 'Hindi' };
            
            return {
                content: [{ type: 'text', text: `Detected Language: ${detected.name} (${detected.code}) with 95% confidence.` }]
            };
        }

        if (request.params.name === 'translate_text') {
            const { text, target_lang } = TranslateSchema.parse(request.params.arguments);
            
            if (!SUPPORTED_LANGUAGES[target_lang]) {
                throw new McpError(ErrorCode.InvalidParams, `Language code '${target_lang}' is not supported.`);
            }

            // Mock Translation response
            const mockTranslation = `[Translated to ${SUPPORTED_LANGUAGES[target_lang].name}]: ${text}`;
            
            return {
                content: [{ type: 'text', text: mockTranslation }]
            };
        }

        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${request.params.name}`);

    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMsg = `Validation Error: ${error.errors.map(e => e.message).join(', ')}`;
            logger.error(errorMsg, error);
            throw new McpError(ErrorCode.InvalidParams, errorMsg);
        }
        logger.error(`Tool execution error`, error);
        throw error;
    }
});

// ==========================================
// 5. EXPRESS APP & SSE TRANSPORT
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

let transport: SSEServerTransport | null = null;

// Endpoint for n8n to connect and establish the SSE stream
app.get('/sse', async (req, res) => {
    transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
    logger.info('SSE Connection established.');
});

// Endpoint for n8n to send tool execution requests
app.post('/messages', async (req, res) => {
    if (!transport) {
        res.status(400).send('SSE transport not initialized. Connect to /sse first.');
        return;
    }
    await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Translation MCP Server (TS) running on http://localhost:${PORT}`);
    logger.info(`SSE Endpoint for n8n: http://localhost:${PORT}/sse`);
});     