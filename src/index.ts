import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import from our new local modules
import { TranslateSchema, DetectSchema, SUPPORTED_LANGUAGE_CODES } from './types.js';
import { SUPPORTED_LANGUAGES, getLanguageName, detectLanguageReal, translateTextReal } from './languages.js';
// Logger Utility
const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data ? JSON.stringify(data) : ''),
    error: (msg: string, err: unknown) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
};

// Initialize MCP Server
const server = new Server(
    { name: 'multi-lang-translator-ts', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

// Register Tools
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
                    target_lang: { type: 'string', description: 'ISO code of target language (e.g., en, hi, zh)', enum: SUPPORTED_LANGUAGE_CODES },
                    source_lang: { type: 'string', description: 'Optional ISO code of source language', enum: SUPPORTED_LANGUAGE_CODES }
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
            return { content: [{ type: 'text', text: JSON.stringify(SUPPORTED_LANGUAGES, null, 2) }] };
        }

        if (request.params.name === 'detect_language') {
            const { text } = DetectSchema.parse(request.params.arguments);
            
            // Call the real API and wait for the response
            const detected = await detectLanguageReal(text);
            
            return { 
                content: [{ type: 'text', text: `Detected Language: ${detected.name} (${detected.code}).` }] 
            };
        }

        if (request.params.name === 'translate_text') {
            const { text, target_lang, source_lang } = TranslateSchema.parse(request.params.arguments);
            
            if (!getLanguageName(target_lang)) {
                throw new McpError(ErrorCode.InvalidParams, `Language code '${target_lang}' is not supported.`);
            }

            // Call the real API and wait for the response
            const translation = await translateTextReal(text, target_lang, source_lang);
            
            return { 
                content: [{ type: 'text', text: translation }] 
            };
        }

        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${request.params.name}`);

    } catch (error) {
        if (error instanceof z.ZodError) {
            const zodError = error as z.ZodError;
            const errorMsg = `Validation Error: ${zodError.issues.map((issue) => issue.message).join(', ')}`;
            logger.error(errorMsg, zodError);
            throw new McpError(ErrorCode.InvalidParams, errorMsg);
        }
        logger.error(`Tool execution error`, error);
        throw error;
    }
});

// Express & SSE Setup
const app = express();
app.use(cors());
//app.use(express.json());

let transport: SSEServerTransport | null = null;

app.get('/sse', async (req, res) => {
    transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
    logger.info('SSE Connection established.');
});

app.post('/messages', async (req, res) => {
    if (!transport) {
        res.status(400).send('SSE transport not initialized.');
        return;
    }
    await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Modular MCP Server running on http://localhost:${PORT}`);
    logger.info(`SSE Endpoint for n8n: http://localhost:${PORT}/sse`);
});