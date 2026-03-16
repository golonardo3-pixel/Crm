import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import fetch from 'node-fetch';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy Firebase Admin initialization
let db;
function getDb() {
    if (db) return db;
    try {
        const configPath = path.join(__dirname, 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
            const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log(`Initializing Firebase Admin for project: ${firebaseConfig.projectId}, database: ${firebaseConfig.firestoreDatabaseId}`);
            
            const options = {
                projectId: firebaseConfig.projectId
            };

            // Try to use application default credentials if available
            try {
                options.credential = applicationDefault();
            } catch (e) {
                console.warn("Application Default Credentials not found, falling back to project ID only");
            }

            initializeApp(options);
            db = getFirestore(firebaseConfig.firestoreDatabaseId);
            console.log("Firebase Admin initialized successfully");
            return db;
        } else {
            console.error("firebase-applet-config.json not found at:", configPath);
        }
    } catch (error) {
        console.error("Error initializing Firebase Admin:", error);
    }
    return null;
}

const app = express();
const PORT = 3000;

// Persistent storage for shared sites
const DEMOS_DIR = path.join(__dirname, 'demos');
if (!fs.existsSync(DEMOS_DIR)) {
    fs.mkdirSync(DEMOS_DIR, { recursive: true });
}

// Check for API keys at startup
if (!process.env.GEMINI_API_KEY) {
    console.error("API KEY não configurada. Verifique as variáveis de ambiente.");
}
if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error("API KEY não configurada. Verifique as variáveis de ambiente.");
}

app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
});

// ==========================================
// PUBLIC ROUTES AUDIT
// The following routes are explicitly public and 
// bypass all authentication/session checks.
// ==========================================
app.get('/api/config', (req, res) => {
    res.json({
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasGoogleMapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
        baseUrl: process.env.APP_URL || ''
    });
});

// Middleware to ensure all /api requests return JSON
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.post('/api/share-site', async (req, res) => {
    // This route is public to allow site generation
    // but could be protected in the future if needed.
    const { html, slug, variations, metadata } = req.body;
    if (!html) return res.status(400).json({ error: "HTML content is required" });

    const primaryId = slug ? slug.toLowerCase().replace(/[^a-z0-9]/g, '-') : Math.random().toString(36).substring(2, 15);
    const allIds = Array.isArray(variations) ? variations.map(v => v.toLowerCase().replace(/[^a-z0-9]/g, '-')) : [primaryId];
    
    // Ensure primaryId is in allIds
    if (!allIds.includes(primaryId)) allIds.push(primaryId);

    try {
        const firestore = getDb();
        if (!firestore) {
            console.error("Firestore not initialized during share-site request");
            throw new Error("Database not initialized");
        }

        // Save to Firestore
        const demoData = {
            html,
            slug: primaryId,
            businessName: metadata?.businessName || primaryId,
            category: metadata?.category || '',
            images: metadata?.images || [],
            services: metadata?.services || [],
            phone: metadata?.phone || '',
            address: metadata?.address || '',
            createdAt: FieldValue.serverTimestamp(),
            leadId: metadata?.leadId || '',
            variations: allIds
        };

        // Save for all IDs (slug and variations) in parallel
        const savePromises = allIds.map(id => 
            firestore.collection('demos').doc(id).set({
                ...demoData,
                slug: id // Each doc has its own slug
            })
        );
        
        await Promise.all(savePromises);
        
        console.log(`Demo site saved to Firestore with IDs: ${allIds.join(', ')}`);
        res.json({ id: primaryId, variations: allIds });
    } catch (error) {
        console.error("Error saving demo site to Firestore:", error);
        res.status(500).json({ 
            error: "Failed to save demo site to database",
            details: error.message 
        });
    }
});

// PUBLIC DEMO ROUTE
// Serves generated HTML sites directly.
// Bypasses all authentication, sessions, and cookies.
app.get(['/share/:id', '/demo/:id'], async (req, res) => {
    const { id } = req.params;
    
    // Public test route
    if (id === 'test-demo') {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Test Demo</title></head>
            <body style="font-family: sans-serif; display: flex; items-center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5;">
                <div style="text-align: center; padding: 40px; background: white; border-radius: 20px; shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h1>✅ Public Route Test Success</h1>
                    <p>This route is fully public and accessible anonymously.</p>
                    <p>ID: ${id}</p>
                    <p>Time: ${new Date().toISOString()}</p>
                </div>
            </body>
            </html>
        `);
    }

    try {
        const docId = id.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const firestore = getDb();
        
        if (firestore) {
            const doc = await firestore.collection('demos').doc(docId).get();

            if (doc.exists) {
                const data = doc.data();
                return res.send(data.html);
            }
        }

        // Fallback to local filesystem if not in Firestore (for legacy demos or if DB fails)
        const filePath = path.join(DEMOS_DIR, `${docId}.html`);
        if (fs.existsSync(filePath)) {
            const html = fs.readFileSync(filePath, 'utf8');
            return res.send(html);
        }
        return res.status(404).send('<h1>Site não encontrado ou expirado</h1><p>O link de demonstração pode ter sido removido ou o ID está incorreto.</p>');
    } catch (error) {
        console.error("Error fetching demo site from Firestore:", error);
        res.status(500).send('<h1>Erro ao carregar demonstração</h1>');
    }
});

app.get('/api/verify-keys', async (req, res) => {
    const results = {
        gemini: { status: 'pending', message: '' },
        googleMaps: { status: 'pending', message: '' }
    };

    const clientMapsKey = req.headers['x-goog-api-key'];
    let mapsKey = (clientMapsKey && clientMapsKey.trim().length > 5) ? clientMapsKey.trim() : process.env.GOOGLE_MAPS_API_KEY;
    if (mapsKey) mapsKey = mapsKey.replace(/["']/g, '').trim();

    const clientGeminiKey = req.headers['x-gemini-api-key'];
    let geminiKey = (clientGeminiKey && clientGeminiKey.trim().length > 5) ? clientGeminiKey.trim() : process.env.GEMINI_API_KEY;
    if (geminiKey) geminiKey = geminiKey.replace(/["']/g, '').trim();

    // Test Gemini
    try {
        if (!geminiKey) {
            results.gemini = { status: 'error', message: 'Chave Gemini não configurada (Ambiente ou Header).' };
        } else {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: "Diga 'OK'"
            });
            if (response.text) {
                results.gemini = { status: 'success', message: 'Chave Gemini válida e funcionando.' };
            } else {
                results.gemini = { status: 'error', message: 'Resposta vazia do Gemini.' };
            }
        }
    } catch (error) {
        results.gemini = { status: 'error', message: `Erro Gemini: ${error.message}` };
    }

    // Test Google Maps
    try {
        if (!mapsKey) {
            results.googleMaps = { status: 'error', message: 'Chave Google Maps não encontrada (Ambiente ou Local).' };
        } else {
            // Using the new Places API for verification
            const url = 'https://places.googleapis.com/v1/places:searchText';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': mapsKey,
                    'X-Goog-FieldMask': 'places.id'
                },
                body: JSON.stringify({
                    textQuery: 'Campinas',
                    maxResultCount: 1
                })
            });
            clearTimeout(timeout);
            
            const data = await response.json();
            if (response.ok) {
                results.googleMaps = { status: 'success', message: 'Chave Google Maps válida (Places API New OK).' };
            } else {
                let msg = data.error?.message || response.statusText;
                if (response.status === 403) {
                    if (msg.includes('API key not valid')) msg = "Chave de API inválida.";
                    else if (msg.includes('Places API (New) has not been used')) msg = "Ative a 'Places API (New)' no Google Cloud Console.";
                    else if (msg.includes('restricted')) msg = "Chave com restrição de IP ou Referer incorreta.";
                    else msg = "Acesso negado. Verifique o faturamento (Billing) e as permissões.";
                } else if (response.status === 429) {
                    msg = "Cota excedida ou faturamento não configurado.";
                }
                results.googleMaps = { status: 'error', message: `Erro Google Maps: ${msg}` };
            }
        }
    } catch (error) {
        results.googleMaps = { status: 'error', message: `Erro Google Maps: ${error.name === 'AbortError' ? 'Timeout na conexão' : error.message}` };
    }

    res.json(results);
});

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    const clientGeminiKey = req.headers['x-gemini-api-key'];
    let apiKey = (clientGeminiKey && clientGeminiKey.trim().length > 5) ? clientGeminiKey.trim() : process.env.GEMINI_API_KEY;
    if (apiKey) apiKey = apiKey.replace(/["']/g, '').trim();

    if (!apiKey) {
        console.error("Gemini API KEY não configurada.");
        return res.status(500).json({ error: "Gemini API KEY não configurada. Verifique as variáveis de ambiente ou configurações." });
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const chat = ai.chats.create({
            model: "gemini-3-flash-preview",
            config: {
                systemInstruction: "Você é um assistente especializado em prospecção de leads para agências de marketing em Campinas. Seu objetivo é ajudar o usuário a encontrar melhores leads, criar mensagens de prospecção e organizar o CRM. Seja direto, profissional e use emojis ocasionalmente."
            },
            history: history || []
        });

        const result = await chat.sendMessage({ message });
        res.json({ text: result.text });
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: "Erro ao processar mensagem no servidor." });
    }
});

app.post('/api/demo-chat', async (req, res) => {
    const { message, history, businessName, niche, city } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 5) {
        console.error("Gemini API KEY não configurada no servidor para demo-chat.");
        return res.status(500).json({ error: "Gemini API KEY não configurada no servidor." });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey.replace(/["']/g, '').trim() });
        const chat = ai.chats.create({
            model: "gemini-3-flash-preview",
            config: {
                systemInstruction: `Você é um assistente virtual de atendimento ao cliente para a empresa "${businessName}". 
                O nicho da empresa é "${niche}" e ela está localizada em "${city || 'sua região'}". 
                Seu objetivo é ser gentil, prestativo e converter o visitante em cliente. 
                Fale sobre os serviços típicos de ${niche}. 
                Sempre que apropriado, sugira que o cliente fale no WhatsApp ou agende uma visita usando os botões disponíveis no site. 
                Se o usuário perguntar quem é você, diga: "Olá! Este é o site de demonstração da empresa ${businessName}. Se desejar mais informações ou agendar atendimento, clique no botão de WhatsApp."
                Não invente informações específicas que você não tem (como preços exatos ou horários específicos se não foram ditos), foque no que uma empresa de ${niche} normalmente oferece de melhor.
                Mantenha as respostas curtas, amigáveis e em português do Brasil.`
            },
            history: history || []
        });

        const result = await chat.sendMessage({ message });
        if (result && result.text) {
            res.json({ text: result.text });
        } else {
            throw new Error("Resposta vazia do Gemini");
        }
    } catch (error) {
        console.error("Demo Chat error:", error);
        res.status(500).json({ error: "Erro ao processar mensagem no chat demo." });
    }
});

// Diagnostic Route: Gemini API
app.get('/api/diagnosticar-gemini', async (req, res) => {
    console.log("Backend: /api/diagnosticar-gemini hit");
    const clientGeminiKey = req.headers['x-gemini-api-key'];
    let geminiKey = (clientGeminiKey && clientGeminiKey.trim().length > 5) ? clientGeminiKey.trim() : process.env.GEMINI_API_KEY;
    if (geminiKey) geminiKey = geminiKey.replace(/["']/g, '').trim();

    if (!geminiKey) {
        return res.status(500).json({ 
            httpStatus: 500,
            message: "Chave Gemini não encontrada (Ambiente ou Header)",
            cause: "env_var_missing"
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Diga 'OK'"
        });
        
        if (response.text) {
            return res.status(200).json({
                httpStatus: 200,
                message: "Gemini AI funcionando corretamente!",
                cause: "success"
            });
        } else {
            return res.status(500).json({
                httpStatus: 500,
                message: "Resposta vazia do Gemini.",
                cause: "empty_response"
            });
        }
    } catch (error) {
        return res.status(500).json({
            httpStatus: 500,
            message: `Erro Gemini: ${error.message}`,
            cause: "gemini_error"
        });
    }
});

// Diagnostic Route: Google Maps API
app.get('/api/diagnosticar-google-maps', async (req, res) => {
    console.log("Backend: /api/diagnosticar-google-maps hit");
    const clientMapsKey = req.headers['x-goog-api-key'];
    let mapsKey = (clientMapsKey && clientMapsKey.trim().length > 5) ? clientMapsKey.trim() : process.env.GOOGLE_MAPS_API_KEY;
    if (mapsKey) mapsKey = mapsKey.replace(/["']/g, '').trim();

    if (!mapsKey) {
        return res.status(500).json({ 
            httpStatus: 500,
            message: "Chave não encontrada (Ambiente ou Header)",
            cause: "env_var_missing"
        });
    }

    try {
        const url = 'https://places.googleapis.com/v1/places:searchText';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': mapsKey,
                'X-Goog-FieldMask': 'places.id'
            },
            body: JSON.stringify({
                textQuery: 'Campinas',
                maxResultCount: 1
            })
        });
        clearTimeout(timeout);

        const status = response.status;
        const data = await response.json();

        let friendlyMessage = "API funcionando corretamente!";
        let cause = "success";

        if (!response.ok) {
            const googleError = data.error || {};
            const msg = googleError.message || "";
            
            if (status === 403) {
                if (msg.includes('API key not valid')) {
                    friendlyMessage = "Chave inválida. Verifique se copiou corretamente.";
                    cause = "invalid_key";
                } else if (msg.includes('Places API (New) has not been used')) {
                    friendlyMessage = "API não habilitada. Ative a 'Places API (New)' no Google Cloud Console.";
                    cause = "api_not_enabled";
                } else if (msg.toLowerCase().includes('blocked')) {
                    friendlyMessage = "Esta chave de API está bloqueada para a 'Places API (New)'. Verifique as restrições da chave no console do Google Cloud.";
                    cause = "api_blocked";
                } else if (msg.includes('restricted')) {
                    friendlyMessage = "Chave com restrição incorreta (IP ou Referer). Remova as restrições para testar.";
                    cause = "restriction_mismatch";
                } else {
                    friendlyMessage = "Acesso negado. Verifique se o faturamento (billing) está ativo.";
                    cause = "billing_or_permission";
                }
            } else if (status === 429) {
                friendlyMessage = "Cota excedida ou faturamento não configurado.";
                cause = "quota_exceeded";
            } else if (status === 400) {
                friendlyMessage = `Requisição inválida (400): ${msg || "Verifique os parâmetros ou FieldMask"}`;
                cause = "bad_request";
            } else {
                friendlyMessage = `Erro do Google (${status}): ${msg}`;
                cause = "google_error";
            }
        }

        return res.status(status === 200 ? 200 : status).json({
            httpStatus: status,
            responseBody: response.ok ? data : null,
            errorBody: !response.ok ? data : null,
            message: friendlyMessage,
            cause: cause,
            endpoint: "Places API (New) - searchText"
        });
    } catch (error) {
        return res.status(500).json({
            httpStatus: 500,
            message: `Erro interno ao testar API: ${error.message}`,
            cause: "internal_error"
        });
    }
});

app.post('/api/mine', async (req, res) => {
    try {
        const { textQuery, query, location, radius, maxResultCount, pageToken } = req.body;
        const clientMapsKey = req.headers['x-goog-api-key'];
        let apiKey = (clientMapsKey && clientMapsKey.trim().length > 5) ? clientMapsKey.trim() : process.env.GOOGLE_MAPS_API_KEY;
        
        if (apiKey) apiKey = apiKey.replace(/["']/g, '').replace(/\s/g, '');

        if (!apiKey) {
            return res.status(400).json({ error: "Chave de API do Google Maps não configurada." });
        }

        const finalQuery = textQuery || query;
        if (!finalQuery) {
            return res.status(400).json({ error: "O parâmetro 'textQuery' ou 'query' é obrigatório." });
        }

        console.log(`Mining request: query="${finalQuery}", location="${location}"`);

        const url = 'https://places.googleapis.com/v1/places:searchText';
        
        const body = {
            textQuery: finalQuery,
            maxResultCount: maxResultCount || 20
        };

        if (location && radius) {
            const coords = location.split(',');
            if (coords.length === 2) {
                body.locationBias = {
                    circle: {
                        center: { 
                            latitude: parseFloat(coords[0]), 
                            longitude: parseFloat(coords[1]) 
                        },
                        radius: parseFloat(radius)
                    }
                };
            }
        }

        if (pageToken) {
            body.pageToken = pageToken;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,nextPageToken'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Google API Error:", data);
            return res.status(response.status).json({ 
                error: data.error?.message || "Erro na API do Google Places",
                details: data.error
            });
        }

        // Map to the format expected by the frontend
        const results = (data.places || []).map(place => ({
            place_id: place.id,
            name: place.displayName?.text || "Sem nome",
            formatted_address: place.formattedAddress || "Endereço não disponível",
            rating: place.rating || 0,
            user_ratings_total: place.userRatingCount || 0,
            website: place.websiteUri || "",
            formatted_phone_number: place.nationalPhoneNumber || "",
            vicinity: place.formattedAddress || ""
        }));

        res.json({
            status: "OK",
            results: results,
            next_page_token: data.nextPageToken
        });

    } catch (error) {
        console.error("Mining route error:", error);
        res.status(500).json({ 
            error: "Erro interno ao processar a mineração",
            message: error.message 
        });
    }
});

app.get('/api/details', async (req, res) => {
    const { placeId } = req.query;
    const clientMapsKey = req.headers['x-goog-api-key'];
    let apiKey = (clientMapsKey && clientMapsKey.trim().length > 5) ? clientMapsKey.trim() : process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) apiKey = apiKey.replace(/["']/g, '').replace(/\s/g, '');

    if (!apiKey || apiKey.length < 10 || apiKey === 'null' || apiKey === 'undefined') {
        console.error("API KEY não configurada ou inválida.");
        return res.status(500).json({ error: "API KEY do Google Maps não configurada ou inválida. Verifique as configurações." });
    }

    if (!placeId) {
        return res.status(400).json({ error: "placeId is required" });
    }

    try {
        const url = `https://places.googleapis.com/v1/places/${placeId}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,websiteUri,nationalPhoneNumber,internationalPhoneNumber,photos,types,editorialSummary'
            }
        });
        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
            const googleError = data.error || {};
            const msg = googleError.message || "";
            let friendlyMessage = `Erro ao buscar detalhes do local (Status ${response.status}).`;
            
            if (response.status === 403) {
                friendlyMessage = "Acesso negado aos detalhes do local (Verifique se a Places API New está ativa).";
            } else if (response.status === 400) {
                if (msg.includes('API key not valid')) {
                    friendlyMessage = "Chave de API do Google Maps inválida (Details 400).";
                } else {
                    friendlyMessage = `Requisição inválida (Details 400): ${msg}`;
                }
            }
            return res.status(response.status).json({ error: friendlyMessage, details: msg });
        }

        // Map back to legacy format
        const legacyResult = {
            place_id: data.id,
            name: data.displayName?.text,
            formatted_address: data.formattedAddress,
            rating: data.rating,
            user_ratings_total: data.userRatingCount,
            website: data.websiteUri,
            formatted_phone_number: data.internationalPhoneNumber || data.nationalPhoneNumber,
            international_phone_number: data.internationalPhoneNumber,
            vicinity: data.formattedAddress,
            photos: data.photos || [],
            types: data.types || [],
            description: data.editorialSummary?.text || ""
        };

        res.json(legacyResult);
    } catch (error) {
        console.error("Details error:", error);
        res.status(500).json({ error: "Erro ao acessar Google Place Details API (New)" });
    }
});

app.get('/api/geocode', async (req, res) => {
    const { address } = req.query;
    const clientMapsKey = req.headers['x-goog-api-key'];
    let apiKey = (clientMapsKey && clientMapsKey.trim().length > 5) ? clientMapsKey.trim() : process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) apiKey = apiKey.replace(/["']/g, '').replace(/\s/g, '');

    if (!apiKey || apiKey.length < 10 || apiKey === 'null' || apiKey === 'undefined') {
        return res.status(500).json({ error: "API KEY do Google Maps não configurada ou inválida." });
    }

    try {
        const url = 'https://places.googleapis.com/v1/places:searchText';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.location'
            },
            body: JSON.stringify({
                textQuery: address,
                maxResultCount: 1
            })
        });
        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
            const googleError = data.error || {};
            const msg = googleError.message || "";
            let friendlyMessage = `Erro na Places API (Geocode Status ${response.status}).`;
            
            if (response.status === 400 && msg.includes('API key not valid')) {
                friendlyMessage = "Chave de API do Google Maps inválida (Geocode 400).";
            }
            
            return res.status(response.status).json({ error: friendlyMessage, details: msg });
        }

        if (!data.places || data.places.length === 0) {
            return res.status(404).json({ error: "Local não encontrado" });
        }

        const location = data.places[0].location;
        res.json({
            lat: location.latitude,
            lng: location.longitude
        });
    } catch (error) {
        console.error("Geocode error:", error);
        res.status(500).json({ error: "Erro ao acessar Google Places API (New Geocode)" });
    }
});

app.get('/api/enrich', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        clearTimeout(timeoutId);

        const html = await response.text();
        
        // Basic extraction to avoid sending huge HTML
        const waLinks = html.match(/(wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)[^"'\s<>]+/g) || [];
        const igLinks = html.match(/(instagram\.com|instagr\.am)\/[a-zA-Z0-9._-]+/g) || [];
        
        // Try to find phone numbers in HTML (simple regex for BR format)
        const phones = html.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?9\d{4}[-\s]?\d{4}/g) || [];

        res.json({
            waLinks: [...new Set(waLinks)],
            igLinks: [...new Set(igLinks)],
            phones: [...new Set(phones)],
            hasContactPage: html.toLowerCase().includes('/contato') || html.toLowerCase().includes('fale-conosco')
        });
    } catch (error) {
        let msg = error.message;
        if (error.name === 'AbortError') msg = "Timeout na conexão (8s)";
        else if (msg.includes('ENOTFOUND')) msg = "Site não encontrado (DNS)";
        else if (msg.includes('EAI_AGAIN')) msg = "Erro de rede temporário";
        
        console.error(`Enrichment error for ${url}:`, msg);
        res.status(500).json({ error: msg });
    }
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Global error handler for API
app.use('/api', (err, req, res, next) => {
    console.error("API Error Handler:", err);
    res.status(err.status || 500).json({
        error: "Erro interno na API",
        message: err.message || "Ocorreu um erro inesperado no servidor."
    });
});

// API 404 handler
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Rota de API não encontrada: ${req.originalUrl}` });
});

// Fallback to index.html for SPA behavior
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler for everything else
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err);
    if (res.headersSent) {
        return next(err);
    }
    if (req.url.startsWith('/api')) {
        return res.status(err.status || 500).json({
            error: "Erro interno na API",
            message: err.message
        });
    }
    res.status(500).send('<h1>Erro Interno no Servidor</h1><p>' + err.message + '</p>');
});

// Always listen on port 3000 for AI Studio Build
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

export default app;
