import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { TranslateSchema, DetectSchema } from './types.js';
import { SUPPORTED_LANGUAGES, detectLanguageReal, translateTextReal } from './languages.js';

const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data ? JSON.stringify(data) : ''),
    error: (msg: string, err: unknown) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
};

function createServer(): McpServer {
    const server = new McpServer(
        { name: 'multi-lang-translator-ts', version: '1.0.0' }
    );

    server.registerTool('get_supported_languages', {
        description: 'Returns a list of all supported languages for translation.',
    }, async () => {
        return { content: [{ type: 'text' as const, text: JSON.stringify(SUPPORTED_LANGUAGES, null, 2) }] };
    });

    server.registerTool('detect_language', {
        description: 'Detects the language of a given text.',
        inputSchema: DetectSchema.shape,
    }, async ({ text }) => {
        logger.info('Tool called: detect_language');
        try {
            const detected = await detectLanguageReal(text);
            return {
                content: [{ type: 'text' as const, text: `Detected Language: ${detected.name} (${detected.code}).` }]
            };
        } catch (error) {
            logger.error('detect_language error', error);
            throw error;
        }
    });

    server.registerTool('translate_text', {
        description: 'Translates text to a target language. Supported codes: en, zh, ms, ta, hok, hi, bn, te, mr, gu.',
        inputSchema: TranslateSchema.shape,
    }, async ({ text, target_lang, source_lang }) => {
        logger.info('Tool called: translate_text');
        try {
            const translation = await translateTextReal(text, target_lang, source_lang);
            return {
                content: [{ type: 'text' as const, text: translation }]
            };
        } catch (error) {
            logger.error('translate_text error', error);
            throw error;
        }
    });

    return server;
}

// Express & Streamable HTTP Setup
const app = express();
app.use(cors());
app.use(express.json());

const transports = new Map<string, StreamableHTTPServerTransport>();

app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
        await transports.get(sessionId)!.handleRequest(req, res, req.body);
        return;
    }

    if (sessionId) {
        res.status(404).json({ error: 'Session not found.' });
        return;
    }

    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
            transports.set(id, transport);
            logger.info(`Session initialized: ${id}`);
        },
    });
    transport.onclose = () => {
        if (transport.sessionId) {
            transports.delete(transport.sessionId);
            logger.info(`Session closed: ${transport.sessionId}`);
        }
    };

    // Each session gets its own McpServer instance — a single server cannot connect to multiple transports.
    const server = createServer();
    await server.connect(transport as Parameters<typeof server.connect>[0]);
    await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: 'Invalid or missing session ID.' });
        return;
    }
    await transports.get(sessionId)!.handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: 'Invalid or missing session ID.' });
        return;
    }
    await transports.get(sessionId)!.handleRequest(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Modular MCP Server running on http://localhost:${PORT}`);
    logger.info(`MCP Endpoint: http://localhost:${PORT}/mcp`);
});
