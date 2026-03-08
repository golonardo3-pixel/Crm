import { GoogleGenAI } from "https://esm.run/@google/genai";

// script.js
// --- Configuration & Constants ---
const NICHES = [
    "Todos os Nichos", "Dentistas", "Oficinas Mecânicas", "Pet Shops", "Restaurantes", 
    "Academias", "Salões de Beleza", "Clínicas Médicas", "Padarias", 
    "Escolas de Idiomas", "Imobiliárias", "Vidraçarias", "Marmorarias"
];

const NICHE_VARIATIONS = {
    "Dentistas": ["dentista", "odontologia", "clínica odontológica", "ortodontia", "implantes dentários"],
    "Oficinas Mecânicas": ["oficina mecânica", "auto center", "mecânica automotiva", "troca de óleo", "alinhamento e balanceamento"],
    "Pet Shops": ["pet shop", "clínica veterinária", "banho e tosa", "veterinário", "ração"],
    "Restaurantes": ["restaurante", "lanchonete", "pizzaria", "hamburgueria", "comida caseira"],
    "Academias": ["academia", "musculação", "crossfit", "personal trainer", "academia 24h"],
    "Salões de Beleza": ["salão de beleza", "cabeleireiro", "barbearia", "estética", "manicure"],
    "Clínicas Médicas": ["clínica médica", "centro médico", "consultório médico", "saúde", "exames"],
    "Padarias": ["padaria", "panificadora", "confeitaria", "café", "pães"],
    "Escolas de Idiomas": ["escola de idiomas", "curso de inglês", "escola de inglês", "espanhol", "idiomas"],
    "Imobiliárias": ["imobiliária", "corretor de imóveis", "venda de casas", "aluguel de imóveis", "apartamentos"],
    "Vidraçarias": ["vidraçaria", "vidros", "box para banheiro", "espelhos", "vidraceiro"],
    "Marmorarias": ["marmoraria", "mármores e granitos", "bancadas de granito", "pedras decorativas", "marmorista"]
};

const CAMPINAS_ZONES = [
    "Centro", "Cambuí", "Barão Geraldo", "Taquaral", "Guanabara", 
    "Castelo", "Sousas", "Nova Campinas", "Bonfim", "Jardim Leonor",
    "Parque Prado", "Mansões Santo Antônio", "Swift", "Amoreiras", "Ouro Verde"
];

// --- State ---
let state = {
    loading: false,
    stopSearch: false,
    leads: JSON.parse(localStorage.getItem('crm_leads') || '[]'),
    error: null,
    view: 'home', // 'home' | 'dashboard' | 'campaigns'
    city: "Campinas",
    niche: NICHES[0],
    customNiche: "",
    currentZone: "",
    searchStrategy: 'no-site', // 'no-site' | 'poor-gmn'
    miningMode: 'simple', // 'simple' (3x3) | 'turbo' (5x5)
    maxLeadsPerRound: 300,
    miningStatus: {
        active: false,
        paused: false,
        currentPoint: 0,
        totalPoints: 0,
        currentQuery: 0,
        totalQueries: 0,
        found: 0,
        saved: 0,
        duplicates: 0,
        currentPage: 1
    },
    filterStatus: "Todos",
    filterType: "Todos",
    filterSocial: "Todos", // "Todos" | "WhatsApp" | "Instagram" | "Sem Site" | "Lead Quente"
    filterPriority: "Todos", // New filter for priority groups
    searchMode: "standard", // 'standard' or 'regional'
    regionalSearch: {
        keyword: "",
        city: "",
        radius: 10
    },
    enriching: false,
    enrichmentStatus: {
        active: false,
        current: 0,
        total: 0,
        foundWhatsApp: 0,
        foundInstagram: 0
    },
    onlyWeakProfiles: true,
    totalFound: 0,
    totalNoWebsite: 0,
    selectedLeadForSite: null,
    selectedLeadForAudit: null,
    selectedLeadForSmartProspecting: null,
    smartProspectingMessage: "",
    showAuditPanel: false,
    siteDraft: "",
    isGeneratingSite: false,
    showAssistant: false,
    selectedLeads: [], // IDs of leads selected for campaign
    demoLibrary: JSON.parse(localStorage.getItem('crm_demo_library') || localStorage.getItem('crm_demo_sites') || '[]'),
    rankingHistory: JSON.parse(localStorage.getItem('crm_ranking_history') || '{}'),
    rankingKeyword: "",
    showDemoLibrary: false,
    siteGenerationMode: 'auto', // 'auto' | 'template' | 'screenshot' | 'link'
    meetings: JSON.parse(localStorage.getItem('crm_meetings') || '[]'),
    filterAgenda: 'Hoje', // 'Hoje' | 'Amanhã' | 'Semana' | 'Todas'
    showMeetingModal: false,
    selectedLeadForMeeting: null,
    campaignMessage: "Olá {nome}, vi que sua empresa no Google Maps está sem site. Podemos conversar sobre como um site profissional pode aumentar seus clientes?",
    campaignLink: "",
    campaignImage: "",
    campaignPdf: "",
    campaignAudio: "",
    campaignIntervalMin: 15,
    campaignIntervalMax: 25,
    campaignRunning: false,
    campaignProgress: { sent: 0, total: 0, responded: 0 },
    showSettings: false,
    googleMapsKey: localStorage.getItem('google_maps_api_key') || "",
    geminiKey: localStorage.getItem('gemini_api_key') || "",
    keyVerificationResults: JSON.parse(localStorage.getItem('api_verification_results') || 'null'),
    isVerifyingKeys: false,
    apiStatusOk: false,
    assistantMessages: [
        { 
            role: 'model', 
            text: "Olá Hugo! Sou seu assistente do CRM Miner – Campinas Edition. Estou aqui para acelerar sua prospecção.\n\nMenu inicial:\n1) Buscar novos leads\n2) Analisar empresa (Google Maps)\n3) Criar mensagem de prospecção\n4) Organizar meus leads\n\nComo posso te ajudar agora?" 
        }
    ],
    assistantInput: "",
    isAssistantTyping: false,
    chatbotEnabled: JSON.parse(localStorage.getItem('crm_chatbot_enabled') || 'false'),
    chatbotSettings: JSON.parse(localStorage.getItem('crm_chatbot_settings') || JSON.stringify({
        greeting: "Olá 👋\n\nObrigado por entrar em contato.\n\nSou o assistente do Hugo Dias.\n\nPosso te ajudar com:\n\n1️⃣ Criar um site para meu negócio\n2️⃣ Melhorar meu perfil no Google\n3️⃣ Ver exemplo de site\n4️⃣ Falar diretamente com Hugo",
        options: {
            1: "Perfeito.\n\nUm site ajuda seu negócio a aparecer melhor no Google e facilita o contato com clientes pelo WhatsApp.\n\nOs sites incluem:\n\n• botão direto para WhatsApp\n• integração com Google\n• página rápida para celular\n• layout profissional\n\nQuer ver um exemplo?",
            2: "Trabalhamos com otimização do perfil no Google Maps para aumentar a visibilidade e atrair mais clientes na sua região.",
            4: "O Hugo continuará o atendimento assim que estiver disponível."
        }
    })),
    chatbotHistory: JSON.parse(localStorage.getItem('crm_chatbot_history') || '[]'),
    economyMode: JSON.parse(localStorage.getItem('crm_economy_mode') || 'false'),
    aiStatus: 'ok', // 'ok' | 'error' | 'quota_exceeded'
    aiErrorMessage: ""
};

// --- Helper Functions ---
function toggleEconomyMode(enabled) {
    state.economyMode = enabled;
    localStorage.setItem('crm_economy_mode', JSON.stringify(state.economyMode));
    showToast(state.economyMode ? "Modo Econômico ativado!" : "Modo Econômico desativado.", "info");
    render();
}

function getOpportunityColor(score) {
    if (score >= 80) return "border-emerald-500 text-emerald-600 bg-emerald-50";
    if (score >= 50) return "border-amber-500 text-amber-600 bg-amber-50";
    return "border-red-500 text-red-600 bg-red-50";
}

function updateMeetingStatus(meetingId, status) {
    const meeting = state.meetings.find(m => m.id === meetingId);
    if (meeting) {
        meeting.status = status;
        saveMeetings();
        render();
    }
}

// --- API Initialization ---
let hasGeminiKey = false;
let hasGoogleMapsKey = false;

async function initAI() {
    try {
        console.log("Fetching config from /api/config...");
        const response = await fetch('/api/config');
        const config = await response.json();
        
        // Keys from environment take precedence for the 'hasKey' flags
        hasGeminiKey = config.hasGeminiKey || !!state.geminiKey;
        hasGoogleMapsKey = config.hasGoogleMapsKey || !!state.googleMapsKey;
        
        // Mark as configured if keys exist
        state.apiStatusOk = hasGeminiKey && hasGoogleMapsKey;
        
        // If we have keys but no verification results, we can set a default "Configured" state
        if (!state.keyVerificationResults) {
            state.keyVerificationResults = {
                gemini: { status: hasGeminiKey ? 'pending' : 'error', message: hasGeminiKey ? 'Configurada' : 'Não configurada' },
                googleMaps: { status: hasGoogleMapsKey ? 'pending' : 'error', message: hasGoogleMapsKey ? 'Configurada' : 'Não configurada' }
            };
        }
        
        render();
    } catch (err) {
        console.error("Failed to fetch config from server:", err);
    }
}

function saveSettings() {
    console.log("Action: saveSettings triggered");
    const mapsKeyInput = document.getElementById('settings-maps-key');
    const geminiKeyInput = document.getElementById('settings-gemini-key');
    
    if (mapsKeyInput && geminiKeyInput) {
        let newMapsKey = mapsKeyInput.value.trim().replace(/["']/g, '').replace(/\s/g, '');
        let newGeminiKey = geminiKeyInput.value.trim().replace(/["']/g, '').replace(/\s/g, '');
        
        // Only clear results if keys actually changed
        if (newMapsKey !== state.googleMapsKey || newGeminiKey !== state.geminiKey) {
            state.keyVerificationResults = null;
            localStorage.removeItem('api_verification_results');
        }

        if (newMapsKey && newGeminiKey && newMapsKey === newGeminiKey) {
            state.error = "⚠️ Atenção: Você usou a mesma chave para Gemini e Maps. Verifique se não colou errado.";
        } else if (newMapsKey && newMapsKey.length < 30) {
            state.error = "⚠️ A chave do Maps parece muito curta. Verifique se copiou ela inteira.";
        }

        state.googleMapsKey = newMapsKey;
        state.geminiKey = newGeminiKey;
        
        localStorage.setItem('google_maps_api_key', state.googleMapsKey);
        localStorage.setItem('gemini_api_key', state.geminiKey);
        
        state.showSettings = false;
        hasGoogleMapsKey = !!state.googleMapsKey || hasGoogleMapsKey;
        hasGeminiKey = !!state.geminiKey || hasGeminiKey;
        state.apiStatusOk = hasGeminiKey && hasGoogleMapsKey;
        
        state.error = "Configurações salvas com sucesso!";
        render();
    }
}

async function diagnoseMapsAPI(event) {
    if (event) event.preventDefault();
    console.log("Action: diagnoseMapsAPI triggered");
    
    const btn = event ? event.currentTarget : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Diagnosticando Maps...';
    }
    
    const keyInput = document.getElementById('settings-maps-key');
    const tempKey = keyInput ? keyInput.value.trim().replace(/["']/g, '').replace(/\s/g, '') : state.googleMapsKey;
    
    state.isVerifyingKeys = true;

    try {
        const headers = {};
        if (tempKey) headers['x-goog-api-key'] = tempKey;
        
        const response = await fetch('/api/diagnosticar-google-maps', { headers });
        const data = await response.json();
        
        if (!state.keyVerificationResults) {
            state.keyVerificationResults = {
                gemini: { status: 'pending', message: 'Não testado' },
                googleMaps: { status: 'pending', message: '' }
            };
        }

        state.keyVerificationResults.googleMaps = { 
            status: data.httpStatus === 200 && data.cause === 'success' ? 'success' : 'error',
            message: data.message
        };

        localStorage.setItem('api_verification_results', JSON.stringify(state.keyVerificationResults));

        if (data.httpStatus === 200 && data.cause === 'success') {
            state.error = "✅ Google Maps API: Funcionando!";
            state.googleMapsKey = tempKey;
            localStorage.setItem('google_maps_api_key', state.googleMapsKey);
            hasGoogleMapsKey = true;
        } else {
            state.error = `❌ Erro Maps: ${data.message}`;
        }
    } catch (err) {
        console.error("Diagnostic error:", err);
        state.error = "Erro ao diagnosticar Google Maps API.";
    } finally {
        state.isVerifyingKeys = false;
        render();
    }
}

async function diagnoseGeminiAPI(event) {
    if (event) event.preventDefault();
    console.log("Action: diagnoseGeminiAPI triggered");
    
    const btn = event ? event.currentTarget : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Diagnosticando Gemini...';
    }
    
    const keyInput = document.getElementById('settings-gemini-key');
    const tempKey = keyInput ? keyInput.value.trim().replace(/["']/g, '').replace(/\s/g, '') : state.geminiKey;
    
    state.isVerifyingKeys = true;

    try {
        const headers = {};
        if (tempKey) headers['x-gemini-api-key'] = tempKey;
        
        const response = await fetch('/api/diagnosticar-gemini', { headers });
        const data = await response.json();
        
        if (!state.keyVerificationResults) {
            state.keyVerificationResults = {
                gemini: { status: 'pending', message: '' },
                googleMaps: { status: 'pending', message: 'Não testado' }
            };
        }

        state.keyVerificationResults.gemini = { 
            status: data.httpStatus === 200 && data.cause === 'success' ? 'success' : 'error',
            message: data.message
        };

        localStorage.setItem('api_verification_results', JSON.stringify(state.keyVerificationResults));

        if (data.httpStatus === 200 && data.cause === 'success') {
            state.error = "✅ Gemini API: Funcionando!";
            state.geminiKey = tempKey;
            localStorage.setItem('gemini_api_key', state.geminiKey);
            hasGeminiKey = true;
        } else {
            state.error = `❌ Erro Gemini: ${data.message}`;
        }
    } catch (err) {
        console.error("Diagnostic error:", err);
        state.error = "Erro ao diagnosticar Gemini API.";
    } finally {
        state.isVerifyingKeys = false;
        render();
    }
}

async function verifyKeys(event) {
    if (event) event.preventDefault();
    console.log("Action: verifyKeys triggered");
    
    const btn = event ? event.currentTarget : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Verificando Tudo...';
    }

    const mapsKeyInput = document.getElementById('settings-maps-key');
    const geminiKeyInput = document.getElementById('settings-gemini-key');
    
    const tempMapsKey = mapsKeyInput ? mapsKeyInput.value.trim().replace(/["']/g, '').replace(/\s/g, '') : state.googleMapsKey;
    const tempGeminiKey = geminiKeyInput ? geminiKeyInput.value.trim().replace(/["']/g, '').replace(/\s/g, '') : state.geminiKey;
    
    state.isVerifyingKeys = true;

    try {
        const headers = {};
        if (tempMapsKey) headers['x-goog-api-key'] = tempMapsKey;
        if (tempGeminiKey) headers['x-gemini-api-key'] = tempGeminiKey;
        
        const response = await fetch('/api/verify-keys', { headers });
        
        if (!response.ok) {
            const text = await response.text();
            let errorMsg = `Erro na verificação (${response.status})`;
            try {
                const errorData = JSON.parse(text);
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                if (text.includes('<html')) {
                    errorMsg = "O servidor retornou HTML em vez de JSON.";
                }
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        state.keyVerificationResults = data;
        localStorage.setItem('api_verification_results', JSON.stringify(state.keyVerificationResults));
    } catch (err) {
        console.error("Verification error:", err);
        state.error = "Erro ao verificar chaves. Tente novamente.";
    } finally {
        state.isVerifyingKeys = false;
        render();
    }
}

function getSettingsModalHTML() {
    if (!state.showSettings) return "";
    
    const results = state.keyVerificationResults;
    
    return `
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
            <div class="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
                <div class="p-8 bg-indigo-600 text-white flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-white/20 rounded-xl">
                            <i data-lucide="settings" class="w-5 h-5"></i>
                        </div>
                        <h2 class="text-xl font-black tracking-tight">Configurações de API</h2>
                    </div>
                    <button type="button" onclick="state.showSettings = false; render();" class="p-3 hover:bg-white/10 rounded-xl transition-all active:scale-90 cursor-pointer">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    <!-- Gemini Section -->
                    <div class="space-y-3">
                        <label class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Gemini AI API Key</label>
                        <div class="relative group">
                            <input 
                                id="settings-gemini-key"
                                type="password" 
                                value="${state.geminiKey}" 
                                placeholder="Cole sua chave Gemini..." 
                                class="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all shadow-sm"
                            />
                            <i data-lucide="sparkles" class="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors"></i>
                        </div>
                        <button 
                            type="button"
                            onclick="window.diagnoseGeminiAPI(event)" 
                            class="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Diagnosticar Gemini
                        </button>
                    </div>

                    <!-- Maps Section -->
                    <div class="space-y-3">
                        <label class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Google Maps API Key</label>
                        <div class="relative group">
                            <input 
                                id="settings-maps-key"
                                type="password" 
                                value="${state.googleMapsKey}" 
                                placeholder="Cole sua chave Google Maps..." 
                                class="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all shadow-sm"
                            />
                            <i data-lucide="map-pin" class="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors"></i>
                        </div>
                        <p class="text-[9px] text-slate-400 leading-relaxed italic px-1">
                            * Importante: Ative as APIs <b>Places API (New)</b> e <b>Maps Embed API</b> no seu Google Cloud Console para que o mapa e as fotos apareçam corretamente.
                        </p>
                        <button 
                            type="button"
                            onclick="window.diagnoseMapsAPI(event)" 
                            class="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Diagnosticar Maps
                        </button>
                    </div>

                    ${results ? `
                        <div class="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Status das Chaves</span>
                                <button type="button" onclick="verifyKeys(event)" class="text-[10px] font-black text-indigo-600 uppercase hover:underline cursor-pointer active:scale-95 transition-all">Verificar Tudo</button>
                            </div>
                            
                            <div class="space-y-3">
                                <div class="flex items-start gap-3">
                                    <div class="mt-1 w-2 h-2 rounded-full ${results.gemini.status === 'success' ? 'bg-emerald-500' : (results.gemini.status === 'pending' ? 'bg-slate-300' : 'bg-red-500')}"></div>
                                    <div class="flex flex-col">
                                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-600">Gemini AI</span>
                                        <span class="text-[10px] font-medium ${results.gemini.status === 'success' ? 'text-emerald-600' : (results.gemini.status === 'pending' ? 'text-slate-400' : 'text-red-500')}">${results.gemini.message || 'Pendente'}</span>
                                    </div>
                                </div>
                                <div class="flex items-start gap-3">
                                    <div class="mt-1 w-2 h-2 rounded-full ${results.googleMaps.status === 'success' ? 'bg-emerald-500' : (results.googleMaps.status === 'pending' ? 'bg-slate-300' : 'bg-red-500')}"></div>
                                    <div class="flex flex-col">
                                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-600">Google Maps</span>
                                        <span class="text-[10px] font-medium ${results.googleMaps.status === 'success' ? 'text-emerald-600' : (results.googleMaps.status === 'pending' ? 'text-slate-400' : 'text-red-500')}">${results.googleMaps.message || 'Pendente'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Economy Mode Toggle -->
                    <div class="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
                                <i data-lucide="leaf" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h4 class="text-xs font-black text-indigo-900 uppercase tracking-widest">Modo Econômico</h4>
                                <p class="text-[10px] text-indigo-600 font-bold">Reduz uso de API e IA</p>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" class="sr-only peer" ${state.economyMode ? 'checked' : ''} onchange="toggleEconomyMode(this.checked)">
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    ${state.aiStatus !== 'ok' ? `
                        <div class="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                            <i data-lucide="alert-triangle" class="w-5 h-5 text-red-600"></i>
                            <div class="flex-1">
                                <p class="text-[10px] font-black text-red-600 uppercase tracking-widest">Limite de IA Atingido</p>
                                <p class="text-[10px] text-red-500 font-medium">${state.aiErrorMessage || 'O CRM continua funcionando normalmente.'}</p>
                            </div>
                            <button onclick="state.aiStatus = 'ok'; render();" class="p-2 bg-white text-red-600 rounded-lg shadow-sm">
                                <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                            </button>
                        </div>
                    ` : ''}

                    <div class="pt-4 flex gap-3">
                        <button type="button" onclick="state.showSettings = false; render();" class="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer">
                            Cancelar
                        </button>
                        <button type="button" onclick="saveSettings()" class="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 cursor-pointer">
                            Salvar Tudo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function sendMessageAssistant() {
    console.log("Action: sendMessageAssistant triggered");
    if (!state.assistantInput.trim() || state.isAssistantTyping) return;

    const userMessage = state.assistantInput.trim();
    state.assistantMessages.push({ role: 'user', text: userMessage });
    state.assistantInput = "";
    state.isAssistantTyping = true;
    render();

    if (!hasGeminiKey) {
        await initAI();
        if (!hasGeminiKey) {
            state.assistantMessages.push({ role: 'model', text: "Erro: API KEY não configurada. Verifique as variáveis de ambiente." });
            state.isAssistantTyping = false;
            render();
            return;
        }
    }

    try {
        // Map history to the format expected by Gemini API (if needed by server)
        // For now, we'll just send the messages as they are and let the server handle it
        // The server expects { message, history }
        // History should be [{ role: 'user'|'model', parts: [{ text: '...' }] }]
        const history = state.assistantMessages.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const headers = { 'Content-Type': 'application/json' };
        if (state.geminiKey) {
            headers['x-gemini-api-key'] = state.geminiKey;
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ message: userMessage, history })
        });

        if (!response.ok) {
            const text = await response.text();
            let errorMsg = `Erro no chat (${response.status})`;
            try {
                const errorData = JSON.parse(text);
                errorMsg = errorData.error || errorMsg;
            } catch (e) {}

            if (response.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                state.aiStatus = 'quota_exceeded';
                state.aiErrorMessage = "Limite de cota da API Gemini atingido.";
            } else {
                state.aiStatus = 'error';
                state.aiErrorMessage = errorMsg;
            }
            
            state.assistantMessages.push({ role: 'model', text: `⚠️ ${state.aiErrorMessage}\n\nO CRM continua funcionando, mas as funções de IA estão temporariamente limitadas.` });
            render();
            return;
        }

        const data = await response.json();
        state.assistantMessages.push({ role: 'model', text: data.text });
    } catch (err) {
        console.error("Chatbot error:", err);
        state.aiStatus = 'error';
        state.aiErrorMessage = "Falha na conexão com o serviço de IA.";
        state.assistantMessages.push({ role: 'model', text: "⚠️ Erro de conexão. Verifique sua internet ou tente novamente mais tarde." });
    } finally {
        state.isAssistantTyping = false;
        render();
        
        // Scroll to bottom
        const msgContainer = document.getElementById('assistant-messages');
        if (msgContainer) {
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    }
}

function getAssistantHTML() {
    return `
        <!-- AI Assistant Floating Button & Panel -->
        <div class="fixed bottom-6 right-6 z-50 pointer-events-auto">
            ${state.showAssistant ? `
                <div class="bg-white w-[calc(100vw-2rem)] sm:w-[350px] h-[500px] max-h-[calc(100vh-8rem)] rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-up">
                    <div class="p-5 bg-indigo-600 text-white flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-white/20 rounded-lg">
                                <i data-lucide="bot" class="w-4 h-4"></i>
                            </div>
                            <span class="font-bold text-sm">Assistente CRM Miner</span>
                        </div>
                    <button onclick="state.showAssistant = false; render();" class="p-2 hover:bg-white/10 rounded-lg transition-all active:scale-90 cursor-pointer">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                
                <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 no-scrollbar" id="assistant-messages">
                    ${state.assistantMessages.map(msg => `
                        <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
                            <div class="max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'}">
                                ${msg.text.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    `).join('')}
                    ${state.isAssistantTyping ? `
                        <div class="flex justify-start">
                            <div class="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                                <div class="flex gap-1">
                                    <span class="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                                    <span class="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span class="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="p-4 bg-white border-t border-slate-100">
                    <div class="relative">
                        <input 
                            id="assistant-input"
                            type="text" 
                            placeholder="Pergunte algo..." 
                            value="${state.assistantInput}"
                            class="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                            onkeydown="if(event.key === 'Enter') sendMessageAssistant()"
                            oninput="state.assistantInput = this.value"
                        />
                        <button onclick="sendMessageAssistant()" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-90 cursor-pointer">
                            <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            </div>
        ` : `
            <button onclick="state.showAssistant = true; render();" class="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all group cursor-pointer">
                <i data-lucide="bot" class="w-7 h-7 group-hover:animate-pulse"></i>
                <span class="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </button>
        `}
    </div>
    `;
}

// Initialize on load
initAI();

// --- Utilities ---
function generateGrid(lat, lng, size) {
    const points = [];
    const spacing = size === 5 ? 0.015 : 0.025; // turbo vs simple
    const offset = Math.floor(size / 2);

    for (let i = -offset; i <= offset; i++) {
        for (let j = -offset; j <= offset; j++) {
            points.push({
                lat: lat + (i * spacing),
                lng: lng + (j * spacing)
            });
        }
    }
    return points;
}

function getNicheVariations(niche) {
    return NICHE_VARIATIONS[niche] || [niche];
}

function cleanPhoneNumber(phone) {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    // If it's a BR number without 55, add it
    if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
        cleaned = '55' + cleaned;
    }
    return cleaned;
}

function isMobilePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    // BR mobile: 55 + DDD + 9 + 8 digits = 13 digits
    // Or DDD + 9 + 8 digits = 11 digits
    if (cleaned.length === 11) return cleaned[2] === '9';
    if (cleaned.length === 13) return cleaned[4] === '9';
    return false;
}

function getWhatsAppUrl(phone) {
    const cleaned = cleanPhoneNumber(phone);
    if (!cleaned) return "";
    return `https://wa.me/${cleaned}`;
}

function getLeadPriorityInfo(lead) {
    const hasWebsite = !!lead.website && lead.website !== "Sem site";
    const rating = lead.rating || 0;
    const reviews = lead.reviews || 0;
    const hasPhone = !!lead.phone && lead.phone !== "Sem telefone";
    
    // Priority for SITE
    if (!hasWebsite && rating >= 4.2 && reviews >= 20) {
        return {
            priorityGroup: "Alta prioridade para vender SITE",
            color: "text-emerald-600 bg-emerald-50 border-emerald-100",
            icon: "globe"
        };
    }
    
    // Priority for GMN
    if (rating < 4.3 || reviews < 15 || lead.photosCount < 5) {
        return {
            priorityGroup: "Alta prioridade para vender GMN",
            color: "text-amber-600 bg-amber-50 border-amber-100",
            icon: "map-pin"
        };
    }
    
    return {
        priorityGroup: "Outros leads",
        color: "text-slate-400 bg-slate-50 border-slate-100",
        icon: "layers"
    };
}

function showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-8 right-8 px-6 py-4 rounded-2xl font-black text-sm shadow-2xl z-[9999] animate-slide-up flex items-center gap-3 border ${
        type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
        type === 'error' ? 'bg-red-600 text-white border-red-500' :
        'bg-slate-900 text-white border-slate-800'
    }`;
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i> ${message}`;
    
    document.body.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add('animate-slide-down');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function calculateOpportunityScore(lead) {
    let score = 0;
    const reasons = [];

    // Sem site → +40 (Critical)
    if (!lead.website || lead.website === "Sem site") {
        score += 40;
        reasons.push("Sem Website: Oportunidade crítica de venda de site.");
    }

    // Menos de 20 avaliações → +20
    if ((lead.reviews || 0) < 20) {
        score += 20;
        reasons.push("Poucas Avaliações: Aumentar a quantidade de avaliações pode fortalecer a confiança.");
    }

    // Nota abaixo de 4.4 → +20
    if ((lead.rating || 0) < 4.4) {
        score += 20;
        reasons.push("Nota Baixa: Melhorar a média de avaliações ajudará no posicionamento.");
    }

    // WhatsApp Priority Enhancement
    if (lead.phone && lead.phone !== "Sem telefone") {
        score += 15;
        reasons.push("WhatsApp Disponível: Contato direto facilita o fechamento.");
    }

    // Ranking abaixo do top 10 → +15
    if (lead.ranking && lead.ranking > 10) {
        score += 15;
        reasons.push("Baixo Ranking: A empresa não aparece no Top 10 para as buscas locais.");
    }

    return { score: Math.min(score, 100), reasons };
}

function getLeadPriorityBadge(lead) {
    const info = getLeadPriorityInfo(lead);
    const { score } = calculateOpportunityScore(lead);
    
    let badges = '';
    
    if (info.priorityGroup !== "Outros leads") {
        badges += `
            <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${info.color} flex items-center gap-1">
                <i data-lucide="${info.icon}" class="w-2 h-2"></i>
                ${info.priorityGroup.split('vender ')[1] || 'PRIORIDADE'}
            </span>
        `;
    }

    if (score >= 70) badges += `<span class="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">🔥 Lead quente</span>`;
    else if (score >= 40) badges += `<span class="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest">🟡 Lead médio</span>`;
    else badges += `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest">🟢 Lead frio</span>`;

    return `<div class="flex flex-wrap gap-1">${badges}</div>`;
}

function getOpportunityLabel(score) {
    if (score >= 80) return "Alta Oportunidade";
    if (score >= 50) return "Média Oportunidade";
    return "Baixa Oportunidade";
}

function startSmartProspecting(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;

    state.selectedLeadForSmartProspecting = lead;
    state.smartProspectingMessage = generateSmartMessage(lead);
    
    // Automatically start site generation if no draft exists
    if (!state.siteDraft) {
        generateDemoSite(leadId, 'auto', null, Math.floor(Math.random() * 3) + 1);
    }
    
    render();
}

function generateSmartMessage(lead) {
    const { reasons } = calculateOpportunityScore(lead);
    const firstName = lead.name.split(' ')[0];
    
    let message = `Olá, tudo bem?\n\nEstava analisando o perfil da *${lead.name}* no Google e identifiquei algumas oportunidades interessantes para melhorar sua presença online.\n\n`;
    
    if (!lead.website || lead.website === "Sem site") {
        message += `Notei que vocês ainda não possuem um site oficial vinculado ao perfil. Isso é fundamental para passar confiança e converter mais clientes.\n\n`;
        message += `Inclusive, tomei a liberdade de gerar um *modelo de site profissional* para sua empresa baseado nas suas informações públicas. Posso te mostrar?\n\n`;
    } else {
        message += `Notei que vocês já têm um site, mas vi que podemos otimizar alguns pontos no seu Perfil de Empresa para atrair mais cliques.\n\n`;
    }
    
    if (lead.rating < 4.6 || lead.reviews < 20) {
        message += `Também vi que podemos trabalhar na gestão das suas avaliações para melhorar sua nota e autoridade local.\n\n`;
    }
    
    message += `O que acha de conversarmos rapidinho sobre como implementar essas melhorias?`;
    
    return message;
}

function getSmartProspectingHTML() {
    if (!state.selectedLeadForSmartProspecting) return "";
    
    const lead = state.selectedLeadForSmartProspecting;
    
    return `
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-10 bg-slate-900/90 backdrop-blur-xl animate-fade-in pointer-events-auto">
            <div class="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[800px] animate-scale-up">
                <!-- Left Side: Status & Site -->
                <div class="flex-1 bg-slate-50 p-8 flex flex-col border-r border-slate-100 overflow-y-auto">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-4">
                            <div class="p-3 bg-indigo-600 text-white rounded-2xl">
                                <i data-lucide="zap" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-black tracking-tight">Prospecção Inteligente</h2>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${lead.name}</p>
                            </div>
                        </div>
                        <button onclick="state.selectedLeadForSmartProspecting = null; state.siteDraft = ''; render();" class="p-3 bg-white text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div class="space-y-6 flex-1">
                        <!-- Site Status -->
                        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">1. Site Demo</h3>
                                ${state.isGeneratingSite ? `
                                    <span class="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase">
                                        <i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Gerando...
                                    </span>
                                ` : (state.siteDraft ? `
                                    <span class="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                        <i data-lucide="check-circle" class="w-3 h-3"></i> Pronto
                                    </span>
                                ` : `
                                    <button onclick="generateDemoSite('${lead.id}', 'auto', null, 1)" class="text-[10px] font-black text-indigo-600 uppercase hover:underline">Gerar Agora</button>
                                `)}
                            </div>
                            
                            <div class="aspect-video bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
                                ${state.siteDraft ? `
                                    <iframe id="smart-preview-frame" class="w-full h-full border-none scale-[0.5] origin-top-left" style="width: 200%; height: 200%;"></iframe>
                                    <div class="absolute inset-0 bg-transparent cursor-pointer" onclick="openSiteGenerator('${lead.id}')"></div>
                                ` : `
                                    <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-2">
                                        <i data-lucide="layout" class="w-8 h-8 opacity-20"></i>
                                        <span class="text-[10px] font-bold uppercase tracking-widest">Aguardando Geração</span>
                                    </div>
                                `}
                            </div>
                            
                            ${state.siteDraft ? `
                                <div class="flex gap-2">
                                    <button onclick="copyDemoLink()" class="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copiar Link
                                    </button>
                                    <button onclick="openSiteGenerator('${lead.id}')" class="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                                        <i data-lucide="maximize" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Analysis -->
                        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                            <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">2. Análise de Oportunidade</h3>
                            <div class="space-y-2">
                                ${calculateOpportunityScore(lead).reasons.map(reason => `
                                    <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <i data-lucide="alert-circle" class="w-4 h-4 text-amber-500 mt-0.5"></i>
                                        <p class="text-[10px] font-medium text-slate-600 leading-relaxed">${reason}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Side: Message & Action -->
                <div class="w-full md:w-[400px] p-8 flex flex-col bg-white overflow-y-auto">
                    <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">3. Mensagem de Abordagem</h3>
                    
                    <div class="flex-1 relative mb-6">
                        <textarea 
                            id="smart-message-area"
                            oninput="state.smartProspectingMessage = this.value"
                            class="w-full h-full min-h-[300px] p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none resize-none leading-relaxed"
                        >${state.smartProspectingMessage}</textarea>
                        <button onclick="state.smartProspectingMessage = generateSmartMessage(state.selectedLeadForSmartProspecting); render();" class="absolute top-4 right-4 p-2 bg-white text-slate-400 rounded-lg hover:text-indigo-600 shadow-sm transition-all" title="Regerar Mensagem">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <div class="space-y-3">
                        <button onclick="navigator.clipboard.writeText(state.smartProspectingMessage); state.error = 'Mensagem copiada!'; render();" class="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                            Copiar Mensagem
                        </button>
                        <button onclick="window.open('${lead.whatsapp_url}', '_blank')" class="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2">
                            <i data-lucide="message-circle" class="w-5 h-5"></i>
                            ABRIR WHATSAPP
                        </button>
                        <p class="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest">O link da demo será enviado na mensagem</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.startSmartProspecting = startSmartProspecting;

async function checkRanking(leadId, keyword) {
    if (!keyword) return;
    
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;

    lead.isCheckingRanking = true;
    render();

    try {
        const headers = {};
        const cleanMapsKey = (state.googleMapsKey || "").trim().replace(/["']/g, '').replace(/\s/g, '');
        if (cleanMapsKey) {
            headers['x-goog-api-key'] = cleanMapsKey;
        }

        // Use a broader search for ranking
        const response = await fetch('/api/mine', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: keyword,
                location: lead.city,
                radius: 10000
            })
        });
        const data = await response.json();

        if (data.results) {
            const position = data.results.findIndex(r => r.place_id === lead.placeId || r.name.toLowerCase() === lead.name.toLowerCase());
            const rank = position === -1 ? null : position + 1;
            
            lead.ranking = {
                keyword,
                position: rank,
                date: new Date().toISOString()
            };

            // Save to history
            if (!state.rankingHistory[lead.placeId]) state.rankingHistory[lead.placeId] = [];
            state.rankingHistory[lead.placeId].push(lead.ranking);
            localStorage.setItem('crm_ranking_history', JSON.stringify(state.rankingHistory));
        }
    } catch (err) {
        console.error("Ranking check error:", err);
    } finally {
        lead.isCheckingRanking = false;
        saveLeads();
        render();
    }
}

function getRankingBadge(ranking) {
    if (!ranking) return "";
    
    let color = "bg-slate-100 text-slate-500";
    let label = "Fora dos principais resultados";
    
    if (ranking.position !== null) {
        if (ranking.position <= 3) {
            color = "bg-emerald-100 text-emerald-700";
            label = "Excelente presença";
        } else if (ranking.position <= 10) {
            color = "bg-blue-100 text-blue-700";
            label = "Boa presença";
        } else {
            color = "bg-amber-100 text-amber-700";
            label = "Baixa visibilidade";
        }
    }

    return `
        <div class="flex items-center gap-1.5 px-2 py-0.5 ${color} rounded text-[8px] font-black uppercase tracking-widest" title="Posição para: ${ranking.keyword}">
            <i data-lucide="trending-up" class="w-2.5 h-2.5"></i>
            ${ranking.position ? `#${ranking.position}` : 'N/A'} - ${label}
        </div>
    `;
}

function getOpportunity(lead) {
    const { score } = calculateOpportunityScore(lead);
    const label = getOpportunityLabel(score);
    return `${score}% - ${label}`;
}

function saveLeads() {
    localStorage.setItem('crm_leads', JSON.stringify(state.leads));
}

function saveDemoLibrary() {
    localStorage.setItem('crm_demo_library', JSON.stringify(state.demoLibrary));
}

function saveMeetings() {
    localStorage.setItem('crm_meetings', JSON.stringify(state.meetings));
}

// --- Core Logic ---
async function startRegionalSearch() {
    const niche = document.getElementById('regional-niche').value;
    const city = document.getElementById('regional-city').value;
    const radius = parseInt(document.getElementById('regional-radius').value) || 20;

    if (!niche || !city) {
        showToast("Por favor, preencha o nicho e a cidade.", "error");
        return;
    }

    state.regionalSearch = { keyword: niche, city, radius };
    state.loading = true;
    state.view = 'dashboard';
    render();

    try {
        // In a real scenario, we would use a geocoding API to get coordinates
        // and then perform multiple searches in a grid.
        // For this implementation, we'll simulate the "multiple calls" by doing 
        // a few variations of the search query.
        
        const queries = [
            `${niche} em ${city}`,
            `${niche} centro ${city}`,
            `${niche} bairros ${city}`
        ];

        let allLeads = [];
        
        for (const query of queries) {
            if (state.stopSearch) break;
            
            const response = await fetch('/api/mine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textQuery: query, maxResultCount: 20 })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.leads) {
                    allLeads = [...allLeads, ...data.leads];
                }
            }
        }

        // Deduplicate by formattedAddress or displayName
        const uniqueLeads = [];
        const seen = new Set();
        
        for (const lead of allLeads) {
            const id = lead.formattedAddress || lead.displayName;
            if (!seen.has(id)) {
                seen.add(id);
                uniqueLeads.push(lead);
            }
        }

        state.leads = [...uniqueLeads, ...state.leads].slice(0, 1000);
        localStorage.setItem('crm_leads', JSON.stringify(state.leads));
        showToast(`${uniqueLeads.length} leads encontrados na região!`, "success");
    } catch (error) {
        console.error("Regional search error:", error);
        showToast("Erro na busca regional.", "error");
    } finally {
        state.loading = false;
        render();
    }
}

async function startSmartProspectingMode(type) {
    state.loading = true;
    state.view = 'dashboard';
    render();

    try {
        let query = "";
        if (type === 'site') {
            query = "empresas bem avaliadas sem site em Campinas";
        } else {
            query = "empresas com poucas avaliações em Campinas";
        }

        const response = await fetch('/api/mine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textQuery: query, maxResultCount: 30 })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.leads) {
                // Apply smart filters
                let filtered = data.leads;
                if (type === 'site') {
                    filtered = data.leads.filter(l => (!l.website || l.website === "Sem site") && (l.rating || 0) >= 4.0);
                } else {
                    filtered = data.leads.filter(l => (l.rating || 0) < 4.3 || (l.reviews || 0) < 15);
                }

                state.leads = [...filtered, ...state.leads].slice(0, 1000);
                localStorage.setItem('crm_leads', JSON.stringify(state.leads));
                showToast(`${filtered.length} leads qualificados encontrados!`, "success");
            }
        }
    } catch (error) {
        console.error("Smart prospecting error:", error);
        showToast("Erro na prospecção inteligente.", "error");
    } finally {
        state.loading = false;
        render();
    }
}

async function searchLeads() {
    console.log("Action: searchLeads triggered");
    
    // Check if keys are configured (lightweight check)
    const isMapsConfigured = hasGoogleMapsKey || (state.googleMapsKey && state.googleMapsKey.replace(/["']\s/g, '').length > 10);
    const isGeminiConfigured = hasGeminiKey || (state.geminiKey && state.geminiKey.replace(/["']\s/g, '').length > 10);

    if (!isMapsConfigured || !isGeminiConfigured) {
        state.error = "⚠️ API Keys não configuradas corretamente. Por favor, adicione as chaves nas configurações.";
        state.showSettings = true;
        render();
        return;
    }

    // Check last verification results
    if (state.keyVerificationResults?.googleMaps?.status === 'error') {
        state.error = `⚠️ A última verificação da chave Maps falhou: ${state.keyVerificationResults.googleMaps.message}. Verifique nas configurações.`;
        state.showSettings = true;
        render();
        return;
    }

    // Format check
    let currentMapsKey = (state.googleMapsKey || "").trim().replace(/["']/g, '').replace(/\s/g, '');
    if (currentMapsKey && !currentMapsKey.startsWith('AIza')) {
        state.error = "⚠️ A chave do Google Maps parece inválida (deve começar com 'AIza'). Verifique nas configurações.";
        state.showSettings = true;
        render();
        return;
    }

    if (!state.city || !state.niche) {
        state.error = "Por favor, preencha o nicho e a cidade.";
        render();
        return;
    }

    const query = state.niche === "Todos os Nichos" ? "comércio local" : state.niche;

    // Reset mining status
    state.miningStatus = {
        active: true,
        paused: false,
        currentPoint: 0,
        totalPoints: 0,
        currentQuery: 0,
        totalQueries: 0,
        found: 0,
        saved: 0,
        duplicates: 0,
        currentPage: 1
    };
    state.loading = true;
    state.stopSearch = false;
    state.error = null;
    state.view = 'dashboard';
    render();

    // 1. Get Center Coordinates (Geocoding)
    let centerLat = -22.9064;
    let centerLng = -47.0616;
    
    try {
        const headers = {};
        if (state.googleMapsKey) {
            headers['x-goog-api-key'] = state.googleMapsKey;
        }
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(state.city)}`, { headers });
        if (geoRes.ok) {
            const coords = await geoRes.json();
            centerLat = coords.lat;
            centerLng = coords.lng;
        } else {
            console.warn("Geocoding failed, using default coordinates for Campinas.");
        }
    } catch (err) {
        console.error("Geocoding error:", err);
    }
    
    // 2. Generate Grid
    const gridSize = state.economyMode ? 1 : (state.miningMode === 'turbo' ? 5 : 3);
    const gridPoints = generateGrid(centerLat, centerLng, gridSize);
    state.miningStatus.totalPoints = gridPoints.length;

    // 3. Get Queries
    let queries = [];
    if (state.niche === "Todos os Nichos") {
        // Collect first variation of each niche to avoid too many queries
        NICHES.filter(n => n !== "Todos os Nichos").forEach(n => {
            const vars = getNicheVariations(n);
            if (vars.length > 0) queries.push(vars[0]);
        });
        if (state.economyMode) queries = queries.slice(0, 3);
    } else {
        const targetNiche = state.customNiche || state.niche;
        queries = getNicheVariations(targetNiche).slice(0, state.economyMode ? 2 : 5);
    }
    state.miningStatus.totalQueries = queries.length;

    const seenPlaceIds = new Set(state.leads.map(l => l.placeId).filter(Boolean));
    const seenFallbacks = new Set(state.leads.map(l => `${l.name.toLowerCase()}|${l.address.toLowerCase()}`));

    try {
        for (let qIdx = 0; qIdx < queries.length; qIdx++) {
            if (state.stopSearch) break;
            state.miningStatus.currentQuery = qIdx + 1;
            const query = queries[qIdx];

            for (let pIdx = 0; pIdx < gridPoints.length; pIdx++) {
                if (state.stopSearch) break;
                
                // Pause handling
                while (state.miningStatus.paused && !state.stopSearch) {
                    await new Promise(r => setTimeout(r, 500));
                }
                if (state.stopSearch) break;

                state.miningStatus.currentPoint = pIdx + 1;
                const point = gridPoints[pIdx];
                const location = `${point.lat},${point.lng}`;
                const radius = state.miningMode === 'turbo' ? 1500 : 2500;

                let pageToken = null;
                let hasNextPage = true;
                state.miningStatus.currentPage = 1;

                while (hasNextPage && !state.stopSearch) {
                    // Pause handling inside pagination
                    while (state.miningStatus.paused && !state.stopSearch) {
                        await new Promise(r => setTimeout(r, 500));
                    }
                    if (state.stopSearch) break;

                    render();

                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    const cleanMapsKey = (state.googleMapsKey || "").trim().replace(/["']/g, '').replace(/\s/g, '');
                    if (cleanMapsKey) {
                        headers['x-goog-api-key'] = cleanMapsKey;
                    }

                    const response = await fetch('/api/mine', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            query,
                            location,
                            radius,
                            pageToken
                        })
                    });
                    
                    const contentType = response.headers.get("content-type");
                    if (!response.ok) {
                        let errorMsg = `Erro no servidor (${response.status})`;
                        if (contentType && contentType.includes("application/json")) {
                            const errorData = await response.json();
                            errorMsg = errorData.error || errorMsg;
                        } else {
                            const text = await response.text();
                            console.error("Server returned non-JSON error:", text);
                            if (text.includes('<html')) {
                                errorMsg = "O servidor retornou uma página de erro HTML (404 ou 500). Isso pode indicar que a rota /api/mine não foi encontrada ou o servidor caiu. Verifique os logs do console.";
                            } else {
                                errorMsg = "O servidor retornou uma resposta inválida: " + text.substring(0, 100);
                            }
                        }
                        throw new Error(errorMsg);
                    }

                    if (!contentType || !contentType.includes("application/json")) {
                        const text = await response.text();
                        console.error("Expected JSON but got:", text);
                        throw new Error("O servidor retornou uma resposta inválida (não-JSON). Verifique se o servidor está rodando corretamente.");
                    }

                    const data = await response.json();

                    if (data.error) {
                        console.error("API Error:", data.error);
                        state.error = `Erro na API: ${data.error}. Verifique se sua chave está correta nas configurações e use o botão 'Diagnosticar'.`;
                        
                        // If it's an auth error, update the status
                        if (data.error.toLowerCase().includes('chave') || data.error.toLowerCase().includes('api key') || data.error.toLowerCase().includes('inválida') || data.error.toLowerCase().includes('negado')) {
                            if (state.keyVerificationResults) {
                                state.keyVerificationResults.googleMaps = { status: 'error', message: data.error };
                                localStorage.setItem('api_verification_results', JSON.stringify(state.keyVerificationResults));
                            }
                        }
                        
                        state.stopSearch = true; // Stop everything on API error
                        render();
                        break;
                    }

                    const results = data.results || [];
                    state.miningStatus.found += results.length;

                    for (const item of results) {
                        const placeId = item.place_id;
                        const fallbackKey = `${item.name.toLowerCase()}|${(item.formatted_address || item.vicinity || "").toLowerCase()}`;

                        if (placeId && seenPlaceIds.has(placeId)) {
                            state.miningStatus.duplicates++;
                            continue;
                        }
                        if (!placeId && seenFallbacks.has(fallbackKey)) {
                            state.miningStatus.duplicates++;
                            continue;
                        }

                        // Deduplication passed
                        if (placeId) seenPlaceIds.add(placeId);
                        seenFallbacks.add(fallbackKey);

                        // Fetch Place Details for more accurate data
                        let website = item.website || item.url || "";
                        let phone = cleanPhoneNumber(item.formatted_phone_number || "");
                        let siteConfirmado = false;

                        if (placeId) {
                            try {
                                const headers = {};
                                if (state.googleMapsKey) {
                                    headers['x-goog-api-key'] = state.googleMapsKey;
                                }
                                const detailsRes = await fetch(`/api/details?placeId=${placeId}`, { headers });
                                if (detailsRes.ok) {
                                    const details = await detailsRes.json();
                                    if (details.website) {
                                        website = details.website;
                                        siteConfirmado = true;
                                    }
                                    if (details.formatted_phone_number || details.international_phone_number) {
                                        phone = cleanPhoneNumber(details.international_phone_number || details.formatted_phone_number);
                                    }
                                }
                            } catch (err) {
                                console.error("Error fetching details for", item.name, err);
                            }
                        }

                        const hasWebsite = !!website;
                        const hasWhatsApp = isMobilePhone(phone);
                        const reviews = item.user_ratings_total || 0;
                        
                        state.leads.push({
                            id: Math.random().toString(36).substr(2, 9),
                            placeId: item.place_id,
                            name: item.name || "N/A",
                            address: item.formatted_address || item.vicinity || "N/A",
                            city: state.city,
                            phone: phone,
                            rating: item.rating || 0,
                            reviews: reviews,
                            mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name || "")}&query_place_id=${item.place_id}`,
                            website: website || "Sem site",
                            site_confirmado: siteConfirmado,
                            photosCount: item.photos ? item.photos.length : 0,
                            photos: item.photos ? item.photos.map(p => p.name) : [],
                            photoName: item.photos && item.photos.length > 0 ? item.photos[0].name : null,
                            status: 'Novo lead',
                            value: 0,
                            type: hasWebsite ? 'Com Site' : 'Sem Site',
                            whatsapp_url: hasWhatsApp ? getWhatsAppUrl(phone) : "",
                            instagram_url: "",
                            tem_whatsapp: hasWhatsApp,
                            tem_instagram: false,
                            contato_principal: hasWhatsApp ? "whatsapp" : (phone ? "telefone" : "nenhum"),
                            lead_quente: !hasWebsite && hasWhatsApp && reviews <= 150,
                            niche: state.niche,
                            category: item.types && item.types.length > 0 ? item.types[0] : state.niche
                        });
                        state.miningStatus.saved++;
                        
                        // Small delay to avoid overwhelming the API and UI
                        if (state.miningStatus.saved % 5 === 0) {
                            saveLeads();
                            render();
                        }
                    }

                    saveLeads();
                    render();

                    if (state.miningStatus.saved >= state.maxLeadsPerRound) {
                        state.stopSearch = true;
                        break;
                    }

                    pageToken = data.next_page_token;
                    hasNextPage = !!pageToken;

                    if (hasNextPage) {
                        state.miningStatus.currentPage++;
                        // Google requires ~2s wait for next_page_token to become valid
                        await new Promise(r => setTimeout(r, 2100));
                    }
                }
                
                // Small delay between grid points
                await new Promise(r => setTimeout(r, 500));
            }
        }
    } catch (err) {
        state.error = `Erro na mineração: ${err.message || "Falha na comunicação com o servidor."}`;
        console.error("Mining error:", err);
    } finally {
        state.loading = false;
        state.miningStatus.active = false;
        state.stopSearch = false;
        render();
    }
}

async function enrichLeads() {
    console.log("Action: enrichLeads triggered");
    const leadsToEnrich = state.leads.filter(l => l.website && l.website !== "Sem site" && !l.tem_instagram).slice(0, 100);
    if (leadsToEnrich.length === 0) {
        state.error = "Nenhum lead com site para enriquecer ou limite atingido.";
        render();
        return;
    }

    state.enrichmentStatus = {
        active: true,
        current: 0,
        total: leadsToEnrich.length,
        foundWhatsApp: 0,
        foundInstagram: 0
    };
    render();

    for (let i = 0; i < leadsToEnrich.length; i++) {
        const lead = leadsToEnrich[i];
        state.enrichmentStatus.current = i + 1;
        render();

        try {
            const url = `/api/enrich?url=${encodeURIComponent(lead.website)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const text = await response.text();
                let errorMsg = `Erro no enriquecimento (${response.status})`;
                try {
                    const errorData = JSON.parse(text);
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    if (text.includes('<html')) {
                        errorMsg = "O servidor retornou HTML em vez de JSON.";
                    }
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            if (data.waLinks && data.waLinks.length > 0) {
                let waUrl = data.waLinks[0];
                if (!waUrl.startsWith('http')) waUrl = 'https://' + waUrl;
                lead.whatsapp_url = waUrl;
                lead.tem_whatsapp = true;
                state.enrichmentStatus.foundWhatsApp++;
            }

            if (data.igLinks && data.igLinks.length > 0) {
                let igUrl = data.igLinks[0];
                if (!igUrl.startsWith('http')) igUrl = 'https://' + igUrl;
                lead.instagram_url = igUrl;
                lead.tem_instagram = true;
                state.enrichmentStatus.foundInstagram++;
            }

            // Update contact priority
            if (lead.tem_whatsapp) lead.contato_principal = "whatsapp";
            else if (lead.tem_instagram) lead.contato_principal = "instagram";
            
            // Re-check lead quente
            lead.lead_quente = (!lead.website || lead.website === "Sem site") && lead.tem_whatsapp && lead.reviews <= 150;

        } catch (err) {
            console.error(`Error enriching ${lead.name}:`, err);
            lead.enrichment_failed = true;
            lead.enrichment_error = err.message;
        }

        // Delay between requests
        await new Promise(r => setTimeout(r, Math.random() * 500 + 300));
    }

    state.enrichmentStatus.active = false;
    saveLeads();
    render();
}

function copyProspectingMessage(lead) {
    const message = `Oi, tudo bem? Vi a ${lead.name} no Google e notei que ainda não tem site. Eu crio um site simples com botão do WhatsApp por R$147 e você paga só na entrega. Posso te mostrar um modelo?`;
    navigator.clipboard.writeText(message).then(() => {
        state.error = "Mensagem copiada para a área de transferência!";
        render();
    });
}

function downloadCSV() {
    console.log("Action: downloadCSV triggered");
    if (state.leads.length === 0) return;
    
    const headers = ["Nome", "Cidade", "Telefone", "Rating", "Reviews", "Website", "Qualidade GMN", "Oportunidade", "Status", "Valor"];
    const rows = state.leads.map(l => [
        l.name, l.city, l.phone, l.rating, l.reviews, l.website || "Sem site",
        getGMNQuality(l), getOpportunity(l), l.status, l.value || 0
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_${state.city}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Rendering ---
function render() {
    try {
        const hasGoogleMapsKey = !!(state.googleMapsKey || localStorage.getItem('google_maps_api_key'));
        const hasGeminiKey = !!(state.geminiKey || localStorage.getItem('gemini_api_key'));

        // Migration for maps links to use robust format
        state.leads.forEach(l => {
            if (l.mapsLink && l.mapsLink.includes('place_id:') && !l.mapsLink.includes('query_place_id=')) {
                l.mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.name || "")}&query_place_id=${l.placeId}`;
            }
        });

        const app = document.getElementById('app');
        if (!app) return;

        if (state.view === 'home') {
            renderHome(app);
        } else if (state.view === 'dashboard') {
            renderDashboard(app);
        } else if (state.view === 'campaigns') {
            renderCampaigns(app);
        } else if (state.view === 'agenda') {
            renderAgenda(app);
        } else if (state.view === 'chatbot') {
            renderChatbot(app);
        }
        
        // Render Modals & Assistant in a dedicated container to avoid duplication and z-index issues
        let overlayContainer = document.getElementById('overlay-container');
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.id = "overlay-container";
            document.body.appendChild(overlayContainer);
        }
        
        // Overlay container is always pointer-events-none to let clicks pass through to the app below.
        // Individual modals and the assistant panel will have pointer-events-auto.
        overlayContainer.className = `fixed inset-0 z-[100] pointer-events-none`;
        
        // Debug: Uncomment to see the overlay container
        // overlayContainer.style.border = "2px solid rgba(255,0,0,0.1)";
        
        // Modals and Assistant handle their own pointer-events
        overlayContainer.innerHTML = `
            ${getSettingsModalHTML()}
            ${getMeetingModalHTML()}
            ${getDemoModalHTML()}
            ${getSmartProspectingHTML()}
            ${getAuditPanelHTML()}
            ${getDemoLibraryHTML()}
            ${getAssistantHTML()}
        `;

        // Update Header Status Indicator
        const mapsDot = document.getElementById('status-dot-maps');
        const geminiDot = document.getElementById('status-dot-gemini');
        const statusContainer = document.getElementById('api-status-indicator');
        
        if (statusContainer) {
            statusContainer.classList.remove('hidden');
            statusContainer.onclick = () => { state.showSettings = true; render(); };
            statusContainer.style.cursor = 'pointer';
            
            if (mapsDot) {
                const mapsStatus = state.keyVerificationResults?.googleMaps?.status;
                let dotClass = 'bg-slate-300'; // Default: Not configured
                if (mapsStatus === 'success') dotClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                else if (mapsStatus === 'error') dotClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
                else if (hasGoogleMapsKey) dotClass = 'bg-indigo-400'; // Configured but not verified
                
                mapsDot.className = `w-2 h-2 rounded-full transition-all duration-500 ${dotClass}`;
            }
            if (geminiDot) {
                const geminiStatus = state.keyVerificationResults?.gemini?.status;
                let dotClass = 'bg-slate-300'; // Default: Not configured
                if (geminiStatus === 'success') dotClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                else if (geminiStatus === 'error') dotClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
                else if (hasGeminiKey) dotClass = 'bg-indigo-400'; // Configured but not verified
                
                geminiDot.className = `w-2 h-2 rounded-full transition-all duration-500 ${dotClass}`;
            }
        }

        // Clear existing errors
        const existingErrors = document.querySelectorAll('.system-error');
        existingErrors.forEach(el => el.remove());

        // Render error if exists
        if (state.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = "system-error fixed bottom-6 left-6 z-[200] animate-slide-up";
            errorDiv.innerHTML = `
                <div class="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
                    <i data-lucide="alert-circle" class="w-5 h-5 text-red-500"></i>
                    <div class="flex flex-col">
                        <span class="text-sm font-bold">${state.error}</span>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            document.body.appendChild(errorDiv);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentElement) errorDiv.remove();
            }, 5000);
        }

        // Initialize Lucide icons after render
        if (window.lucide) {
            lucide.createIcons();
        }
    } catch (err) {
        console.error("Render error:", err);
    }
}

function getMeetingModalHTML() {
    if (!state.showMeetingModal) return "";
    
    const lead = state.selectedLeadForMeeting;
    const today = new Date().toISOString().split('T')[0];
    
    return `
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
            <div class="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
                <div class="p-8 bg-indigo-600 text-white flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-white/20 rounded-xl">
                            <i data-lucide="calendar-plus" class="w-5 h-5"></i>
                        </div>
                        <h2 class="text-xl font-black tracking-tight">Agendar Reunião</h2>
                    </div>
                    <button onclick="state.showMeetingModal = false; state.selectedLeadForMeeting = null; render();" class="p-3 hover:bg-white/10 rounded-xl transition-all active:scale-90 cursor-pointer">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <form onsubmit="saveMeeting(event)" class="p-8 space-y-6">
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Empresa / Lead</label>
                            <input name="nome" type="text" value="${lead ? lead.name : ''}" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</label>
                            <input name="whatsapp" type="text" value="${lead ? lead.phone : ''}" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Data</label>
                                <input name="data" type="date" value="${today}" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" />
                            </div>
                            <div class="space-y-2">
                                <label class="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Hora</label>
                                <input name="hora" type="time" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" />
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Reunião</label>
                            <select name="tipo" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Ligação">Ligação</option>
                                <option value="Google Meet">Google Meet</option>
                                <option value="Presencial">Presencial</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Observações</label>
                            <textarea name="observacoes" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium min-h-[80px] outline-none focus:border-indigo-500 transition-all"></textarea>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <button type="button" onclick="state.showMeetingModal = false; state.selectedLeadForMeeting = null; render();" class="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer">
                            Cancelar
                        </button>
                        <button type="submit" class="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 cursor-pointer">
                            Salvar Reunião
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderChatbot(container) {
    container.innerHTML = `
        <div class="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-slate-50">
            <!-- Sidebar -->
            <aside class="lg:col-span-3 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 space-y-8 overflow-y-auto lg:h-screen lg:sticky lg:top-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 cursor-pointer active:scale-95 transition-all" id="logo-btn">
                        <div class="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <i data-lucide="triangle" class="w-5 h-5 text-white fill-white"></i>
                        </div>
                        <h1 class="font-black text-xl tracking-tight">CRM Miner</h1>
                    </div>
                    <button id="home-btn" class="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-90 cursor-pointer text-slate-400">
                        <i data-lucide="layout" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="space-y-6">
                    <nav class="space-y-1">
                        <button id="nav-dash-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                            Dashboard
                        </button>
                        <button id="nav-agenda-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="calendar" class="w-5 h-5"></i>
                            Agenda
                        </button>
                        <button id="nav-campaign-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="send" class="w-5 h-5"></i>
                            Campanhas
                        </button>
                        <button id="nav-chatbot-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-600 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="bot" class="w-5 h-5"></i>
                            Chatbot
                        </button>
                    </nav>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="lg:col-span-9 p-6 space-y-6">
                <!-- Header -->
                <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-3xl font-black tracking-tight text-slate-900">Assistente Chatbot</h2>
                        <p class="text-slate-500 font-medium">Automação de atendimento para novos leads.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Status:</span>
                            <div class="flex items-center gap-1.5">
                                <div class="w-2 h-2 rounded-full ${state.chatbotEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}"></div>
                                <span class="text-[10px] font-black uppercase tracking-widest ${state.chatbotEnabled ? 'text-emerald-600' : 'text-slate-400'}">
                                    ${state.chatbotEnabled ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                        <button onclick="toggleChatbot()" class="px-6 py-4 ${state.chatbotEnabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'} rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-xl ${state.chatbotEnabled ? 'shadow-red-100' : 'shadow-indigo-200'}">
                            ${state.chatbotEnabled ? 'Desativar Chatbot' : 'Ativar Chatbot'}
                        </button>
                    </div>
                </header>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Settings -->
                    <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
                        <div class="flex items-center gap-4">
                            <div class="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <i data-lucide="message-square" class="w-6 h-6"></i>
                            </div>
                            <h3 class="text-xl font-black tracking-tight text-slate-900">Configurações de Resposta</h3>
                        </div>

                        <div class="space-y-6">
                            <div class="space-y-3">
                                <label class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Mensagem de Saudação</label>
                                <textarea 
                                    id="chatbot-greeting"
                                    class="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all min-h-[150px]"
                                    placeholder="Olá 👋..."
                                >${state.chatbotSettings.greeting}</textarea>
                            </div>

                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <h4 class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Fluxos de Opções</h4>
                                    <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Automático</span>
                                </div>
                                
                                <div class="space-y-4">
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                        <div class="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                            <span class="w-5 h-5 bg-white rounded-lg flex items-center justify-center border border-slate-200">1</span>
                                            Opção Website
                                        </div>
                                        <p class="text-xs text-slate-500 font-medium leading-relaxed">${state.chatbotSettings.options[1].substring(0, 100)}...</p>
                                    </div>
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                        <div class="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                            <span class="w-5 h-5 bg-white rounded-lg flex items-center justify-center border border-slate-200">2</span>
                                            Opção Google Maps
                                        </div>
                                        <p class="text-xs text-slate-500 font-medium leading-relaxed">${state.chatbotSettings.options[2]}</p>
                                    </div>
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                        <div class="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                            <span class="w-5 h-5 bg-white rounded-lg flex items-center justify-center border border-slate-200">3</span>
                                            Opção Exemplo
                                        </div>
                                        <p class="text-xs text-slate-500 font-medium leading-relaxed">Envia automaticamente um link de demonstração gerado pela IA.</p>
                                    </div>
                                </div>
                            </div>

                            <button onclick="saveChatbotSettings()" class="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shadow-xl shadow-slate-200">
                                Salvar Configurações
                            </button>
                        </div>
                    </div>

                    <!-- History / Simulation -->
                    <div class="flex flex-col gap-6">
                        <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex-1 flex flex-col">
                            <div class="flex items-center justify-between mb-8">
                                <div class="flex items-center gap-4">
                                    <div class="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                        <i data-lucide="history" class="w-6 h-6"></i>
                                    </div>
                                    <h3 class="text-xl font-black tracking-tight text-slate-900">Histórico Recente</h3>
                                </div>
                                <button onclick="simulateChatbotMessage()" class="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90 cursor-pointer" title="Simular Nova Mensagem">
                                    <i data-lucide="play" class="w-5 h-5"></i>
                                </button>
                            </div>

                            <div class="flex-1 overflow-y-auto space-y-4 no-scrollbar max-h-[400px]">
                                ${state.chatbotHistory.length === 0 ? `
                                    <div class="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                        <i data-lucide="message-circle" class="w-12 h-12"></i>
                                        <p class="text-sm font-bold uppercase tracking-widest">Nenhuma interação ainda</p>
                                    </div>
                                ` : state.chatbotHistory.map(h => `
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <div class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">
                                                    ${h.phone.substring(h.phone.length - 2)}
                                                </div>
                                                <div class="flex flex-col">
                                                    <span class="text-xs font-black text-slate-900">${h.phone}</span>
                                                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                                                </div>
                                            </div>
                                            <span class="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                                                Auto-Respondido
                                            </span>
                                        </div>
                                        <div class="text-[10px] font-medium text-slate-600 bg-white p-3 rounded-xl border border-slate-100 italic">
                                            "${h.lastMessage}"
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Protection Info -->
                        <div class="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white space-y-4">
                            <div class="flex items-center gap-3">
                                <i data-lucide="shield-check" class="w-6 h-6"></i>
                                <h4 class="text-lg font-black tracking-tight">Proteção Ativa</h4>
                            </div>
                            <p class="text-indigo-100 text-sm font-medium leading-relaxed">
                                O chatbot ignora automaticamente números que já estão no seu CRM ou na sua lista de contatos para evitar interrupções em negociações em andamento.
                            </p>
                            <div class="flex items-center gap-4 pt-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                    <span class="text-[10px] font-black uppercase tracking-widest">Loop Protection</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                    <span class="text-[10px] font-black uppercase tracking-widest">AI Fallback</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;

    // Attach events
    document.getElementById('logo-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('home-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('nav-dash-btn').onclick = () => { state.view = 'dashboard'; render(); };
    document.getElementById('nav-agenda-btn').onclick = () => { state.view = 'agenda'; render(); };
    document.getElementById('nav-campaign-btn').onclick = () => { state.view = 'campaigns'; render(); };
    document.getElementById('nav-chatbot-btn').onclick = () => { state.view = 'chatbot'; render(); };

    if (window.lucide) lucide.createIcons();
}

function toggleChatbot() {
    state.chatbotEnabled = !state.chatbotEnabled;
    localStorage.setItem('crm_chatbot_enabled', JSON.stringify(state.chatbotEnabled));
    showToast(state.chatbotEnabled ? "Chatbot ativado com sucesso!" : "Chatbot desativado.", state.chatbotEnabled ? "success" : "info");
    render();
}

function saveChatbotSettings() {
    const greeting = document.getElementById('chatbot-greeting').value;
    state.chatbotSettings.greeting = greeting;
    localStorage.setItem('crm_chatbot_settings', JSON.stringify(state.chatbotSettings));
    showToast("Configurações do chatbot salvas!", "success");
    render();
}

function simulateChatbotMessage() {
    if (!state.chatbotEnabled) {
        showToast("Ative o chatbot para simular mensagens.", "error");
        return;
    }

    const randomPhone = `+55 19 9${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    // Check if phone exists in CRM
    const exists = state.leads.some(l => l.phone === randomPhone);
    if (exists) {
        showToast("Simulação: Número já existe no CRM. Chatbot ignorou.", "info");
        return;
    }

    // Simulate incoming message
    const interaction = {
        id: Date.now().toString(),
        phone: randomPhone,
        timestamp: new Date().toISOString(),
        lastMessage: "Olá, gostaria de saber mais sobre seus serviços."
    };

    state.chatbotHistory.unshift(interaction);
    if (state.chatbotHistory.length > 20) state.chatbotHistory.pop();
    localStorage.setItem('crm_chatbot_history', JSON.stringify(state.chatbotHistory));

    // Create lead automatically
    const newLead = {
        id: Date.now().toString(),
        name: `Lead Chatbot ${randomPhone.substring(randomPhone.length - 4)}`,
        phone: randomPhone,
        status: "Lead respondeu",
        category: "Chatbot",
        date: new Date().toISOString(),
        score: 50,
        reasons: ["Interação via Chatbot"],
        lead_quente: true,
        tem_whatsapp: true,
        conversa_ativa: true
    };

    state.leads.unshift(newLead);
    saveLeads();
    
    showToast(`Novo lead via Chatbot: ${randomPhone}`, "success");
    render();
}

function renderAgenda(container) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];
    
    // Week range
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const filteredMeetings = state.meetings.filter(m => {
        if (state.filterAgenda === 'Hoje') return m.data === today;
        if (state.filterAgenda === 'Amanhã') return m.data === tomorrow;
        if (state.filterAgenda === 'Semana') return m.data >= today && m.data <= weekEndStr;
        return true;
    }).sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.hora}`);
        const dateB = new Date(`${b.data}T${b.hora}`);
        return dateA - dateB;
    });

    container.innerHTML = `
        <div class="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-slate-50">
            <!-- Sidebar -->
            <aside class="lg:col-span-3 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 space-y-8 overflow-y-auto lg:h-screen lg:sticky lg:top-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 cursor-pointer active:scale-95 transition-all" id="logo-btn">
                        <div class="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <i data-lucide="triangle" class="w-5 h-5 text-white fill-white"></i>
                        </div>
                        <h1 class="font-black text-xl tracking-tight">CRM Miner</h1>
                    </div>
                    <button id="home-btn" class="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-90 cursor-pointer text-slate-400">
                        <i data-lucide="layout" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="space-y-6">
                    <nav class="space-y-1">
                        <button id="nav-dash-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                            Dashboard
                        </button>
                        <button id="nav-agenda-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-600 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="calendar" class="w-5 h-5"></i>
                            Agenda
                        </button>
                        <button id="nav-campaign-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="send" class="w-5 h-5"></i>
                            Campanhas
                        </button>
                        <button id="nav-chatbot-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="bot" class="w-5 h-5"></i>
                            Chatbot
                        </button>
                    </nav>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="lg:col-span-9 p-6 space-y-6">
                <!-- Header -->
                <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-3xl font-black tracking-tight text-slate-900">Agenda de Reuniões</h2>
                        <p class="text-slate-500 font-medium">Organize seus compromissos e fechamentos.</p>
                    </div>
                    <button onclick="state.showMeetingModal = true; render();" class="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer shadow-xl shadow-indigo-200 flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        Nova Reunião
                    </button>
                </header>

                <!-- Filters -->
                <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    ${['Hoje', 'Amanhã', 'Semana', 'Todas'].map(f => `
                        <button onclick="state.filterAgenda = '${f}'; render();" class="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer whitespace-nowrap ${state.filterAgenda === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}">
                            ${f}
                        </button>
                    `).join('')}
                </div>

                <!-- Meeting List -->
                <div class="space-y-4">
                    ${filteredMeetings.length > 0 ? filteredMeetings.map(m => `
                        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-indigo-200 transition-all">
                            <div class="flex items-start gap-5">
                                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center min-w-[80px]">
                                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${m.data.split('-')[2]}/${m.data.split('-')[1]}</span>
                                    <span class="text-xl font-black text-slate-900">${m.hora}</span>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-3">
                                        <h3 class="text-lg font-black text-slate-900">${m.nome}</h3>
                                        <span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">${m.tipo}</span>
                                    </div>
                                    <div class="flex items-center gap-4 text-xs font-bold text-slate-400">
                                        <a href="https://wa.me/${m.whatsapp}" target="_blank" class="flex items-center gap-1.5 hover:text-emerald-600 transition-colors">
                                            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                                            ${m.whatsapp}
                                        </a>
                                        <span class="flex items-center gap-1.5">
                                            <i data-lucide="info" class="w-3.5 h-3.5"></i>
                                            ${m.observacoes || 'Sem observações'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                                <select onchange="updateMeetingStatus('${m.id}', this.value)" class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer">
                                    <option value="marcada" ${m.status === 'marcada' ? 'selected' : ''}>Marcada</option>
                                    <option value="realizada" ${m.status === 'realizada' ? 'selected' : ''}>Realizada</option>
                                    <option value="cancelada" ${m.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                                </select>
                                <button onclick="deleteMeeting('${m.id}')" class="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all active:scale-90 cursor-pointer">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="bg-white rounded-[2.5rem] border border-slate-200 border-dashed p-20 flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                            <div class="p-6 bg-slate-50 rounded-full">
                                <i data-lucide="calendar" class="w-12 h-12 text-slate-300"></i>
                            </div>
                            <div class="space-y-1">
                                <h3 class="text-xl font-black text-slate-900">Nenhuma reunião encontrada</h3>
                                <p class="text-sm font-medium text-slate-500">Você não tem compromissos agendados para este período.</p>
                            </div>
                            <button onclick="state.showMeetingModal = true; render();" class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 cursor-pointer">
                                Agendar agora
                            </button>
                        </div>
                    `}
                </div>
            </main>
        </div>
    `;

    // Event Listeners
    document.getElementById('logo-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('home-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('nav-dash-btn').onclick = () => { state.view = 'dashboard'; render(); };
    document.getElementById('nav-agenda-btn').onclick = () => { state.view = 'agenda'; render(); };
    document.getElementById('nav-campaign-btn').onclick = () => { state.view = 'campaigns'; render(); };
    
    if (window.lucide) lucide.createIcons();
}

function renderHome(container) {
    container.innerHTML = `
        <div class="min-h-screen bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-700 overflow-x-hidden">
            <!-- Background Pattern -->
            <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
                <div class="absolute inset-0 bg-radial-at-t from-indigo-50/50 via-transparent to-transparent"></div>
            </div>

            <!-- Navigation -->
            <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div class="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div class="flex items-center gap-2.5 group cursor-pointer" onclick="location.reload()">
                        <div class="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                            <i data-lucide="triangle" class="w-5 h-5 text-white fill-white"></i>
                        </div>
                        <span class="font-black text-2xl tracking-tight">CRM Miner <span class="text-indigo-600">v2.0</span></span>
                    </div>
                    <div class="hidden md:flex items-center gap-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <a href="#" class="hover:text-indigo-600 transition-colors">Tecnologia</a>
                        <a href="#" class="hover:text-indigo-600 transition-colors">Metodologia</a>
                        <a href="#" class="hover:text-indigo-600 transition-colors">Preços</a>
                    </div>
                    <div class="flex items-center gap-4">
                        <div id="api-status-indicator" class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                            <div class="w-2 h-2 rounded-full ${
                                state.keyVerificationResults?.googleMaps?.status === 'success' ? 'bg-emerald-500' : 
                                (state.keyVerificationResults?.googleMaps?.status === 'error' ? 'bg-red-500' : 
                                (hasGoogleMapsKey ? 'bg-indigo-400' : 'bg-slate-300'))
                            }" id="status-dot-maps"></div>
                            <span class="text-[10px] font-black uppercase tracking-widest ${hasGoogleMapsKey ? 'text-slate-600' : 'text-slate-400'}">Maps</span>
                            
                            <div class="w-[1px] h-3 bg-slate-200 mx-1"></div>
                            
                            <div class="w-2 h-2 rounded-full ${
                                state.keyVerificationResults?.gemini?.status === 'success' ? 'bg-emerald-500' : 
                                (state.keyVerificationResults?.gemini?.status === 'error' ? 'bg-red-500' : 
                                (hasGeminiKey ? 'bg-indigo-400' : 'bg-slate-300'))
                            }" id="status-dot-gemini"></div>
                            <span class="text-[10px] font-black uppercase tracking-widest ${hasGeminiKey ? 'text-slate-600' : 'text-slate-400'}">IA</span>
                        </div>
                        <button onclick="state.showSettings = true; render();" class="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90 cursor-pointer">
                            <i data-lucide="settings" class="w-5 h-5"></i>
                        </button>
                        ${state.leads.length > 0 ? `
                            <button id="nav-crm-btn" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest active:scale-95 cursor-pointer">
                                ABRIR MEU CRM
                            </button>
                        ` : `
                            <button id="nav-crm-btn" class="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black hover:bg-indigo-100 transition-all uppercase tracking-widest active:scale-95 cursor-pointer">
                                ENTRAR
                            </button>
                        `}
                    </div>
                </div>
            </nav>

            <!-- Hero Section -->
            <section class="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center space-y-10 animate-fade-in relative z-10">
                <div class="inline-flex items-center gap-3 px-4 py-2 bg-white text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-indigo-100 shadow-xl shadow-indigo-500/5">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                    </span>
                    AI-POWERED LEAD GENERATION
                </div>
                
                <h1 class="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.95] max-w-4xl mx-auto">
                    CRM Miner <span class="text-indigo-600">v2.0</span>
                </h1>
                
                <p class="max-w-2xl mx-auto text-xl md:text-2xl text-slate-500 font-medium leading-relaxed">
                    Encontre empresas com baixo desempenho no Google prontas para contratar serviços de marketing.
                </p>

                <div class="flex flex-wrap items-center justify-center gap-12 pt-6">
                    <div class="text-center group">
                        <div class="text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tighter">+3.200</div>
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">Empresas Analisadas</div>
                    </div>
                    <div class="h-12 w-px bg-slate-200 hidden md:block"></div>
                    <div class="text-center group">
                        <div class="text-4xl font-black text-indigo-600 tracking-tighter">+1.100</div>
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">Leads Qualificados</div>
                    </div>
                </div>

                <!-- Trust Bar -->
                <div class="flex flex-wrap items-center justify-center gap-10 pt-10 opacity-30 grayscale">
                    <div class="flex items-center gap-2 font-black text-sm tracking-widest uppercase"><i data-lucide="shield-check" class="w-4 h-4"></i> Verificado</div>
                    <div class="flex items-center gap-2 font-black text-sm tracking-widest uppercase"><i data-lucide="zap" class="w-4 h-4"></i> Instantâneo</div>
                    <div class="flex items-center gap-2 font-black text-sm tracking-widest uppercase"><i data-lucide="database" class="w-4 h-4"></i> Big Data</div>
                </div>

                <!-- Search Form -->
                <div class="max-w-6xl mx-auto mt-20 space-y-8">
                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- Standard Search -->
                        <div class="p-8 bg-white rounded-[3rem] border border-slate-200 shadow-2xl space-y-6 text-left">
                            <div class="flex items-center gap-4 mb-2">
                                <div class="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <i data-lucide="search" class="w-6 h-6"></i>
                                </div>
                                <h3 class="text-xl font-black">Mineração Padrão</h3>
                            </div>
                            <div class="space-y-4">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">O que você procura?</label>
                                    <div class="relative group">
                                        <i data-lucide="search" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
                                        <input 
                                            type="text" 
                                            id="search-input"
                                            placeholder="Ex: Dentistas em Campinas" 
                                            class="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                                <button onclick="state.searchMode = 'standard'; searchLeads()" class="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-3">
                                    <i data-lucide="zap" class="w-5 h-5"></i>
                                    INICIAR MINERAÇÃO
                                </button>
                            </div>
                        </div>

                        <!-- Regional Search -->
                        <div class="p-8 bg-white rounded-[3rem] border border-slate-200 shadow-2xl space-y-6 text-left">
                            <div class="flex items-center gap-4 mb-2">
                                <div class="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <i data-lucide="map" class="w-6 h-6"></i>
                                </div>
                                <h3 class="text-xl font-black">Modo Região</h3>
                            </div>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nicho</label>
                                    <div class="relative group">
                                        <i data-lucide="tag" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
                                        <input 
                                            type="text" 
                                            id="regional-niche"
                                            placeholder="Ex: Salão de Beleza" 
                                            class="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cidade Base</label>
                                        <div class="relative group">
                                            <i data-lucide="map-pin" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
                                            <input 
                                                type="text" 
                                                id="regional-city"
                                                placeholder="Cidade" 
                                                class="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Raio (km)</label>
                                        <div class="relative group">
                                            <i data-lucide="maximize" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
                                            <input 
                                                type="number" 
                                                id="regional-radius"
                                                placeholder="Raio" 
                                                value="20"
                                                class="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button onclick="startRegionalSearch()" class="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-1 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-3">
                                    <i data-lucide="radar" class="w-5 h-5"></i>
                                    EXPLORAR REGIÃO
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Smart Prospecting Buttons -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button onclick="startSmartProspectingMode('site')" class="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[3rem] shadow-xl hover:scale-[1.02] transition-all group text-left relative overflow-hidden">
                            <div class="relative z-10 space-y-4">
                                <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <i data-lucide="globe" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <h4 class="text-xl font-black">BUSCAR CLIENTES PARA SITE</h4>
                                    <p class="text-indigo-100 text-sm font-medium opacity-80">Foca em empresas com boa reputação mas sem presença web oficial.</p>
                                </div>
                                <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1 rounded-full">
                                    <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    Alta Conversão
                                </div>
                            </div>
                            <i data-lucide="globe" class="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12"></i>
                        </button>

                        <button onclick="startSmartProspectingMode('gmn')" class="p-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-[3rem] shadow-xl hover:scale-[1.02] transition-all group text-left relative overflow-hidden">
                            <div class="relative z-10 space-y-4">
                                <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <i data-lucide="map-pin" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <h4 class="text-xl font-black">BUSCAR CLIENTES PARA GMN</h4>
                                    <p class="text-orange-50 text-sm font-medium opacity-80">Foca em perfis fracos, poucas fotos ou avaliações baixas no Google.</p>
                                </div>
                                <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1 rounded-full">
                                    <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                    Otimização Urgente
                                </div>
                            </div>
                            <i data-lucide="map-pin" class="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 -rotate-12"></i>
                        </button>
                    </div>
                </div>
            </section>

            <!-- Features Grid -->
            <section class="bg-slate-50/50 py-32 border-y border-slate-100 relative overflow-hidden">
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)]"></div>
                <div class="max-w-7xl mx-auto px-6 relative z-10">
                    <div class="text-center mb-20 space-y-4">
                        <div class="text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">Automação Inteligente</div>
                        <h2 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">O que o sistema encontra automaticamente?</h2>
                        <p class="text-slate-500 font-medium text-lg max-w-2xl mx-auto">Nossa IA analisa centenas de pontos de dados para filtrar os melhores leads em segundos.</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
                        <div class="bg-white p-8 rounded-[2rem] shadow-saas border border-slate-100 space-y-6 shadow-saas-hover transition-all group">
                            <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-500 transition-colors duration-500">
                                <i data-lucide="globe" class="w-7 h-7 text-red-500 group-hover:text-white transition-colors duration-500"></i>
                            </div>
                            <h3 class="font-black text-base leading-tight">Empresas sem site</h3>
                        </div>
                        <div class="bg-white p-8 rounded-[2rem] shadow-saas border border-slate-100 space-y-6 shadow-saas-hover transition-all group">
                            <div class="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 transition-colors duration-500">
                                <i data-lucide="star" class="w-7 h-7 text-amber-500 group-hover:text-white transition-colors duration-500"></i>
                            </div>
                            <h3 class="font-black text-base leading-tight">Perfis com poucas avaliações</h3>
                        </div>
                        <div class="bg-white p-8 rounded-[2rem] shadow-saas border border-slate-100 space-y-6 shadow-saas-hover transition-all group">
                            <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 transition-colors duration-500">
                                <i data-lucide="trending-down" class="w-7 h-7 text-indigo-500 group-hover:text-white transition-colors duration-500"></i>
                            </div>
                            <h3 class="font-black text-base leading-tight">Negócios mal posicionados</h3>
                        </div>
                        <div class="bg-white p-8 rounded-[2rem] shadow-saas border border-slate-100 space-y-6 shadow-saas-hover transition-all group">
                            <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-500">
                                <i data-lucide="message-circle" class="w-7 h-7 text-emerald-500 group-hover:text-white transition-colors duration-500"></i>
                            </div>
                            <h3 class="font-black text-base leading-tight">Contato direto no WhatsApp</h3>
                        </div>
                        <div class="bg-white p-8 rounded-[2rem] shadow-saas border border-slate-100 space-y-6 shadow-saas-hover transition-all group">
                            <div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-500">
                                <i data-lucide="camera-off" class="w-7 h-7 text-blue-500 group-hover:text-white transition-colors duration-500"></i>
                            </div>
                            <h3 class="font-black text-base leading-tight">Falta de fotos ou informações</h3>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Example Section -->
            <section class="max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-2 gap-20 items-center">
                <div class="space-y-10">
                    <div class="space-y-4">
                        <div class="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-emerald-100">
                            Exemplo de lead encontrado
                        </div>
                        <h2 class="text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                            Visualize a oportunidade antes mesmo de entrar em contato.
                        </h2>
                    </div>
                    
                    <p class="text-xl text-slate-500 font-medium leading-relaxed">
                        Nossa interface entrega todos os dados necessários para uma prospecção de alta conversão. Saiba exatamente onde a empresa está falhando e ofereça a solução certa.
                    </p>
                    
                    <div class="grid grid-cols-1 gap-6">
                        <div class="flex items-center gap-5 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div class="p-3 bg-white rounded-2xl shadow-sm">
                                <i data-lucide="check" class="w-6 h-6 text-emerald-600"></i>
                            </div>
                            <div>
                                <h4 class="font-black text-slate-900 text-lg">Filtros Inteligentes</h4>
                                <p class="text-slate-500 font-medium">Foque apenas em quem realmente precisa do seu serviço.</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-5 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div class="p-3 bg-white rounded-2xl shadow-sm">
                                <i data-lucide="download" class="w-6 h-6 text-indigo-600"></i>
                            </div>
                            <div>
                                <h4 class="font-black text-slate-900 text-lg">Exportação em um clique</h4>
                                <p class="text-slate-500 font-medium">Leve seus leads para qualquer CRM ou planilha instantaneamente.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="relative group">
                    <div class="absolute -inset-10 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div class="relative bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 space-y-8 transform group-hover:scale-[1.02] transition-transform duration-500">
                        <div class="flex items-center justify-between">
                            <div class="space-y-2">
                                <h3 class="text-2xl font-black text-slate-900">Clínica Odonto Campinas</h3>
                                <div class="flex items-center gap-2">
                                    <div class="flex items-center gap-0.5">
                                        <i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>
                                        <i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>
                                        <i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>
                                        <i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>
                                        <i data-lucide="star" class="w-4 h-4 text-slate-200 fill-slate-200"></i>
                                    </div>
                                    <span class="text-sm font-bold text-slate-400">3.9 (12 avaliações)</span>
                                </div>
                            </div>
                            <div class="px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">GMN Fraco</div>
                        </div>

                        <div class="grid grid-cols-1 gap-4">
                            <div class="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center justify-between">
                                <div class="space-y-1">
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</div>
                                    <div class="text-sm font-bold text-red-500 flex items-center gap-2">
                                        <i data-lucide="x-circle" class="w-4 h-4"></i> Sem site
                                    </div>
                                </div>
                                <i data-lucide="globe" class="w-5 h-5 text-slate-200"></i>
                            </div>
                            <div class="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center justify-between">
                                <div class="space-y-1">
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</div>
                                    <div class="text-sm font-bold text-emerald-600 flex items-center gap-2">
                                        <i data-lucide="check-circle" class="w-4 h-4"></i> WhatsApp disponível
                                    </div>
                                </div>
                                <i data-lucide="message-circle" class="w-5 h-5 text-slate-200"></i>
                            </div>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-4 pt-2">
                            <button class="flex-1 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 transition-all">
                                <i data-lucide="message-circle" class="w-5 h-5"></i> Abrir WhatsApp
                            </button>
                            <button class="flex-1 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-slate-100 transition-all">
                                <i data-lucide="map" class="w-5 h-5"></i> Ver no Maps
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stats Section -->
            <section class="bg-indigo-600 py-24 text-white relative overflow-hidden">
                <div class="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div class="max-w-7xl mx-auto px-6 relative z-10">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-16">
                        <div class="space-y-6 text-center md:text-left max-w-md">
                            <div class="inline-block px-4 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">Estatísticas Reais</div>
                            <h2 class="text-4xl md:text-5xl font-black tracking-tight leading-tight">Dentistas em Campinas</h2>
                            <p class="text-indigo-100 text-lg font-medium">Exemplo de mineração realizada recentemente em nossa base de dados.</p>
                        </div>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-20 w-full md:w-auto">
                            <div class="text-center md:text-left space-y-2">
                                <div class="text-6xl font-black tracking-tighter">420</div>
                                <div class="text-[11px] font-black text-indigo-200 uppercase tracking-[0.2em]">Empresas Encontradas</div>
                            </div>
                            <div class="text-center md:text-left space-y-2">
                                <div class="text-6xl font-black tracking-tighter">310</div>
                                <div class="text-[11px] font-black text-indigo-200 uppercase tracking-[0.2em]">Perfis Fracos</div>
                            </div>
                            <div class="text-center md:text-left space-y-2">
                                <div class="text-6xl font-black tracking-tighter">180</div>
                                <div class="text-[11px] font-black text-indigo-200 uppercase tracking-[0.2em]">Sem Website</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer class="max-w-7xl mx-auto px-6 py-16 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
                <div class="flex flex-col items-center md:items-start gap-4">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-slate-900 rounded-xl">
                            <i data-lucide="triangle" class="w-5 h-5 text-white fill-white"></i>
                        </div>
                        <span class="font-black text-xl tracking-tight">CRM Miner</span>
                    </div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">© 2026 CRM Miner v2.0 • Prospecção Inteligente</p>
                </div>
                
                <div class="flex flex-wrap justify-center gap-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <a href="#" class="hover:text-indigo-600 transition-colors">Tecnologia</a>
                    <a href="#" class="hover:text-indigo-600 transition-colors">Segurança</a>
                    <a href="#" class="hover:text-indigo-600 transition-colors">Termos</a>
                    <a href="#" class="hover:text-indigo-600 transition-colors">Privacidade</a>
                </div>
            </footer>
        </div>
    `;

    // Event Listeners
    const navCrmBtn = document.getElementById('nav-crm-btn');
    if (navCrmBtn) {
        console.log("Attaching listener to nav-crm-btn");
        navCrmBtn.onclick = (e) => { 
            console.log("nav-crm-btn clicked");
            e.preventDefault();
            state.view = 'dashboard'; 
            render(); 
        };
    }

    const nicheSelect = document.getElementById('niche-select');
    if (nicheSelect) nicheSelect.onchange = (e) => { state.niche = e.target.value; };
    
    const cityInput = document.getElementById('city-input');
    if (cityInput) cityInput.oninput = (e) => { state.city = e.target.value; };
    
    const weakToggle = document.getElementById('weak-toggle');
    if (weakToggle) weakToggle.onchange = (e) => { state.onlyWeakProfiles = e.target.checked; };
    
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.onclick = async (e) => {
            e.preventDefault();
            if (state.loading) return;
            console.log("Search button clicked");
            await searchLeads();
        };
    }
    
    if (window.lucide) lucide.createIcons();
}

function renderCampaigns(container) {
    const selectedLeadsList = state.leads.filter(l => state.selectedLeads.includes(l.id));
    
    container.innerHTML = `
        <div class="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-slate-50">
            <!-- Sidebar (Same as Dashboard) -->
            <aside class="lg:col-span-3 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 space-y-8 overflow-y-auto lg:h-screen lg:sticky lg:top-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 cursor-pointer active:scale-95 transition-all" id="logo-btn">
                        <div class="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <i data-lucide="triangle" class="w-5 h-5 text-white fill-white"></i>
                        </div>
                        <h1 class="font-black text-xl tracking-tight">CRM Miner</h1>
                    </div>
                    <button id="home-btn" class="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-90 cursor-pointer text-slate-400">
                        <i data-lucide="layout" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="space-y-6">
                    <nav class="space-y-1">
                        <button id="nav-dash-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                            Dashboard
                        </button>
                        <button id="nav-agenda-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="calendar" class="w-5 h-5"></i>
                            Agenda
                        </button>
                        <button id="nav-campaign-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-600 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="send" class="w-5 h-5"></i>
                            Campanhas
                        </button>
                        <button id="nav-chatbot-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="bot" class="w-5 h-5"></i>
                            Chatbot
                        </button>
                    </nav>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="lg:col-span-9 p-6 space-y-6">
                <div class="grid lg:grid-cols-3 gap-6">
                    <!-- Campaign Settings -->
                    <div class="lg:col-span-2 space-y-6">
                        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <i data-lucide="settings" class="w-5 h-5"></i>
                                </div>
                                <h2 class="text-xl font-black tracking-tight">Configuração da Campanha</h2>
                            </div>

                            <div class="space-y-4">
                                <div class="space-y-2">
                                    <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Mensagem Personalizada</label>
                                    <textarea id="campaign-msg" class="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium min-h-[120px] focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" placeholder="Use {nome} para personalizar...">${state.campaignMessage}</textarea>
                                    <p class="text-[10px] text-slate-400 font-bold italic">Dica: Use {nome} para inserir o nome da empresa automaticamente.</p>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Link Adicional</label>
                                        <input id="campaign-link" type="text" value="${state.campaignLink}" placeholder="https://seusite.com" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Imagem (URL)</label>
                                        <input id="campaign-image" type="text" value="${state.campaignImage}" placeholder="https://.../imagem.jpg" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">PDF (URL)</label>
                                        <input id="campaign-pdf" type="text" value="${state.campaignPdf}" placeholder="https://.../proposta.pdf" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Áudio (URL)</label>
                                        <input id="campaign-audio" type="text" value="${state.campaignAudio}" placeholder="https://.../audio.mp3" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Intervalo Mín (seg)</label>
                                        <input id="campaign-interval-min" type="number" value="${state.campaignIntervalMin}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Intervalo Máx (seg)</label>
                                        <input id="campaign-interval-max" type="number" value="${state.campaignIntervalMax}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                </div>

                                <div class="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                                    <div class="flex items-center gap-2 text-amber-600">
                                        <i data-lucide="info" class="w-4 h-4"></i>
                                        <span class="text-[10px] font-black uppercase tracking-widest">Dica de Envio</span>
                                    </div>
                                    <p class="text-[10px] text-amber-700 font-medium leading-relaxed">
                                        O WhatsApp abrirá com o texto personalizado. Para enviar imagens, PDFs ou áudios, use o ícone de anexo (📎) diretamente na conversa do WhatsApp. Os links de mídia configurados acima serão incluídos na mensagem para facilitar o acesso.
                                    </p>
                                </div>

                                <button id="start-campaign-btn" class="w-full py-5 ${state.campaignRunning ? 'bg-red-500' : 'bg-indigo-600'} text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50" ${selectedLeadsList.length === 0 ? 'disabled' : ''}>
                                    ${state.campaignRunning ? '<i data-lucide="square" class="w-5 h-5"></i> PARAR CAMPANHA' : '<i data-lucide="play" class="w-5 h-5"></i> INICIAR CAMPANHA'}
                                </button>
                                ${selectedLeadsList.length === 0 ? '<p class="text-center text-xs font-bold text-red-500">Selecione leads no Dashboard para iniciar.</p>' : ''}
                            </div>
                        </div>

                        <!-- Progress Stats -->
                        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                            <div class="grid grid-cols-4 gap-4">
                                <div class="text-center space-y-1">
                                    <div class="text-2xl font-black text-slate-900">${selectedLeadsList.length}</div>
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</div>
                                </div>
                                <div class="text-center space-y-1">
                                    <div class="text-2xl font-black text-emerald-600">${state.campaignProgress.sent}</div>
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enviados</div>
                                </div>
                                <div class="text-center space-y-1">
                                    <div class="text-2xl font-black text-indigo-600">${selectedLeadsList.length - state.campaignProgress.sent}</div>
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pendentes</div>
                                </div>
                                <div class="text-center space-y-1">
                                    <div class="text-2xl font-black text-amber-500">${state.leads.filter(l => l.status === 'Respondido').length}</div>
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Respondidos</div>
                                </div>
                            </div>
                            
                            ${state.campaignRunning ? `
                                <div class="mt-8 space-y-2">
                                    <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Progresso</span>
                                        <span>${Math.round((state.campaignProgress.sent / selectedLeadsList.length) * 100)}%</span>
                                    </div>
                                    <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div class="h-full bg-indigo-600 transition-all duration-500" style="width: ${(state.campaignProgress.sent / selectedLeadsList.length) * 100}%"></div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Selected Leads List -->
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 class="font-black text-sm uppercase tracking-widest text-slate-400">Leads Selecionados</h3>
                            <span class="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">${selectedLeadsList.length}</span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-3">
                            ${selectedLeadsList.length > 0 ? selectedLeadsList.map(lead => `
                                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                    <div class="space-y-0.5">
                                        <div class="text-sm font-bold text-slate-900">${lead.name}</div>
                                        <div class="text-[10px] font-mono text-slate-400">${lead.phone}</div>
                                    </div>
                                    <button onclick="toggleLeadSelection('${lead.id}')" class="p-2 text-slate-300 hover:text-red-500 transition-all active:scale-90 cursor-pointer">
                                        <i data-lucide="x" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            `).join('') : `
                                <div class="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                                    <i data-lucide="users" class="w-10 h-10 mb-2"></i>
                                    <p class="text-xs font-bold">Nenhum lead selecionado</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;

    // Event Listeners
    document.getElementById('logo-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('home-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('nav-dash-btn').onclick = () => { state.view = 'dashboard'; render(); };
    document.getElementById('nav-agenda-btn').onclick = () => { state.view = 'agenda'; render(); };
    document.getElementById('nav-campaign-btn').onclick = () => { state.view = 'campaigns'; render(); };
    
    if (window.lucide) lucide.createIcons();
    
    document.getElementById('campaign-msg').oninput = (e) => state.campaignMessage = e.target.value;
    document.getElementById('campaign-link').oninput = (e) => state.campaignLink = e.target.value;
    document.getElementById('campaign-image').oninput = (e) => state.campaignImage = e.target.value;
    document.getElementById('campaign-pdf').oninput = (e) => state.campaignPdf = e.target.value;
    document.getElementById('campaign-audio').oninput = (e) => state.campaignAudio = e.target.value;
    document.getElementById('campaign-interval-min').oninput = (e) => state.campaignIntervalMin = parseInt(e.target.value) || 0;
    document.getElementById('campaign-interval-max').oninput = (e) => state.campaignIntervalMax = parseInt(e.target.value) || 0;
    
    document.getElementById('start-campaign-btn').onclick = () => {
        if (state.campaignRunning) stopCampaign();
        else startCampaign();
    };
}

window.toggleLeadSelection = (id) => {
    const index = state.selectedLeads.indexOf(id);
    if (index === -1) state.selectedLeads.push(id);
    else state.selectedLeads.splice(index, 1);
    render();
};

window.toggleAllLeads = (checked) => {
    if (checked) {
        // Select all currently filtered leads
        const filteredIds = state.leads.filter(l => {
            const statusMatch = state.filterStatus === "Todos" || l.status === state.filterStatus;
            const typeMatch = state.filterType === "Todos" || l.type === state.filterType;
            return statusMatch && typeMatch;
        }).map(l => l.id);
        
        state.selectedLeads = [...new Set([...state.selectedLeads, ...filteredIds])];
    } else {
        state.selectedLeads = [];
    }
    render();
};

async function startCampaign() {
    if (state.selectedLeads.length === 0) return;
    
    state.campaignRunning = true;
    state.campaignProgress.sent = 0;
    state.campaignProgress.total = state.selectedLeads.length;
    render();

    const leadsToMessage = state.leads.filter(l => state.selectedLeads.includes(l.id));
    
    for (const lead of leadsToMessage) {
        if (!state.campaignRunning) break;
        
        let message = state.campaignMessage.replace(/{nome}/g, lead.name);
        
        // Add Media Links
        if (state.campaignLink) message += `\n\n🔗 Link: ${state.campaignLink}`;
        if (state.campaignImage) message += `\n\n🖼️ Imagem: ${state.campaignImage}`;
        if (state.campaignPdf) message += `\n\n📄 PDF: ${state.campaignPdf}`;
        if (state.campaignAudio) message += `\n\n🎵 Áudio: ${state.campaignAudio}`;
        
        const phone = lead.phone;
        
        if (phone) {
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            
            // Update status to "Em contato"
            lead.status = "Em contato";
            saveLeads();
            
            state.campaignProgress.sent++;
            render();
            
            // Wait for random interval between min and max
            if (state.campaignProgress.sent < leadsToMessage.length) {
                const min = state.campaignIntervalMin || 15;
                const max = state.campaignIntervalMax || 25;
                const waitTime = Math.floor(Math.random() * (max - min + 1) + min);
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            }
        } else {
            state.campaignProgress.sent++;
            render();
        }
    }
    
    state.campaignRunning = false;
    state.error = "Campanha finalizada com sucesso!";
    render();
}

function stopCampaign() {
    state.campaignRunning = false;
    render();
}
// --- Helper for Action Buttons ---
function getActionButtonHTML(icon, label, tooltip, colorClasses, onclick, href = null) {
    return `
        <div class="flex flex-col items-center gap-1 group/btn min-w-[44px]">
            ${href ? `
                <a href="${href}" target="_blank" class="p-2.5 ${colorClasses} rounded-xl transition-all active:scale-90 cursor-pointer shadow-sm hover:shadow-md flex items-center justify-center" title="${tooltip}">
                    <i data-lucide="${icon}" class="w-4 h-4"></i>
                </a>
            ` : `
                <button onclick="${onclick}" class="p-2.5 ${colorClasses} rounded-xl transition-all active:scale-90 cursor-pointer shadow-sm hover:shadow-md flex items-center justify-center" title="${tooltip}">
                    <i data-lucide="${icon}" class="w-4 h-4"></i>
                </button>
            `}
            <span class="text-[8px] font-black uppercase tracking-tighter text-slate-400 group-hover/btn:text-slate-600 transition-colors whitespace-nowrap">${label}</span>
        </div>
    `;
}

function renderDashboard(container) {
    // Priority Sorting
    const sortedLeads = [...state.leads].sort((a, b) => {
        // 1. Lead Quente first
        if (a.lead_quente !== b.lead_quente) return a.lead_quente ? -1 : 1;

        // 2. Sem site first
        const aHasSite = !!a.website && a.website !== "Sem site";
        const bHasSite = !!b.website && b.website !== "Sem site";
        if (aHasSite !== bHasSite) return aHasSite ? 1 : -1;

        // 3. Tem WhatsApp first
        if (a.tem_whatsapp !== b.tem_whatsapp) return a.tem_whatsapp ? -1 : 1;

        // 4. Menos reviews (<=150)
        const aLowReviews = (a.reviews || 0) <= 150;
        const bLowReviews = (b.reviews || 0) <= 150;
        if (aLowReviews !== bLowReviews) return aLowReviews ? -1 : 1;

        return 0;
    });

    const filteredLeads = sortedLeads.filter(l => {
        if (state.filterStatus !== "Todos" && l.status !== state.filterStatus) return false;
        if (state.filterType !== "Todos" && l.type !== state.filterType) return false;
        
        if (state.filterPriority !== "Todos") {
            const { priorityGroup } = getLeadPriorityInfo(l);
            if (state.filterPriority !== priorityGroup) return false;
        }

        if (state.filterSocial !== "Todos") {
            if (state.filterSocial === "WhatsApp" && !l.tem_whatsapp) return false;
            if (state.filterSocial === "Instagram" && !l.tem_instagram) return false;
            if (state.filterSocial === "Sem Site" && l.website && l.website !== "Sem site") return false;
            if (state.filterSocial === "Lead Quente" && !l.lead_quente) return false;
        }
        
        return true;
    });

    container.innerHTML = `
        <div class="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-slate-50">
            <!-- Sidebar -->
            <aside class="lg:col-span-3 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 space-y-8 overflow-y-auto lg:h-screen lg:sticky lg:top-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 cursor-pointer" id="logo-btn">
                        <div class="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <i data-lucide="triangle" class="w-5 h-5 text-white fill-white"></i>
                        </div>
                        <h1 class="font-black text-xl tracking-tight">CRM Miner</h1>
                    </div>
                    <button id="home-btn" class="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <i data-lucide="layout" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="space-y-6">
                    <div class="flex items-center gap-2 mb-2">
                        <button onclick="state.showSettings = true; render();" class="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90 cursor-pointer" title="Configurações">
                            <i data-lucide="settings" class="w-5 h-5"></i>
                        </button>
                        <button onclick="state.showDemoLibrary = true; render();" class="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90 cursor-pointer" title="Biblioteca de Demos">
                            <i data-lucide="library" class="w-5 h-5"></i>
                        </button>
                        <div id="api-status-indicator" class="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                            <div class="w-1.5 h-1.5 rounded-full ${
                                state.keyVerificationResults?.googleMaps?.status === 'success' ? 'bg-emerald-500' : 
                                (state.keyVerificationResults?.googleMaps?.status === 'error' ? 'bg-red-500' : 
                                (hasGoogleMapsKey ? 'bg-indigo-400' : 'bg-slate-300'))
                            }" id="status-dot-maps"></div>
                            <span class="text-[8px] font-black uppercase tracking-widest ${hasGoogleMapsKey ? 'text-slate-600' : 'text-slate-400'}">Maps</span>
                            
                            <div class="w-1.5 h-1.5 rounded-full ${
                                state.keyVerificationResults?.gemini?.status === 'success' ? 'bg-emerald-500' : 
                                (state.keyVerificationResults?.gemini?.status === 'error' ? 'bg-red-500' : 
                                (hasGeminiKey ? 'bg-indigo-400' : 'bg-slate-300'))
                            }" id="status-dot-gemini"></div>
                            <span class="text-[8px] font-black uppercase tracking-widest ${hasGeminiKey ? 'text-slate-600' : 'text-slate-400'}">IA</span>
                        </div>
                    </div>
                    <nav class="space-y-1">
                        <button id="nav-dash-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-600 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                            Dashboard
                        </button>
                        <button id="nav-agenda-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="calendar" class="w-5 h-5"></i>
                            Agenda
                        </button>
                        <button id="nav-campaign-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="send" class="w-5 h-5"></i>
                            Campanhas
                        </button>
                        <button id="nav-chatbot-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                            <i data-lucide="bot" class="w-5 h-5"></i>
                            Chatbot
                        </button>
                    </nav>

                    <div class="pt-6 border-t border-slate-100 space-y-6">
                        <div>
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Enriquecimento</h3>
                            ${state.enrichmentStatus.active ? `
                                <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-black text-emerald-600 uppercase">Processando</span>
                                        <i data-lucide="loader-2" class="w-3 h-3 animate-spin text-emerald-600"></i>
                                    </div>
                                    <div class="space-y-1">
                                        <div class="flex justify-between text-[10px] font-bold text-slate-500">
                                            <span>Progresso: ${state.enrichmentStatus.current}/${state.enrichmentStatus.total}</span>
                                        </div>
                                        <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                            <div class="bg-emerald-600 h-full transition-all duration-500" style="width: ${(state.enrichmentStatus.current / state.enrichmentStatus.total) * 100}%"></div>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 pt-2">
                                        <div class="text-center p-2 bg-white rounded-lg border border-emerald-100">
                                            <div class="text-xs font-black text-emerald-600">${state.enrichmentStatus.foundWhatsApp}</div>
                                            <div class="text-[8px] font-bold text-slate-400 uppercase">Whats</div>
                                        </div>
                                        <div class="text-center p-2 bg-white rounded-lg border border-emerald-100">
                                            <div class="text-xs font-black text-indigo-600">${state.enrichmentStatus.foundInstagram}</div>
                                            <div class="text-[8px] font-bold text-slate-400 uppercase">Insta</div>
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <button onclick="enrichLeads()" class="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                                    ENRIQUECER LEADS
                                </button>
                            `}
                        </div>

                        <div>
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mineração Ativa</h3>
                            ${state.miningStatus.active ? `
                            <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-black text-indigo-600 uppercase">Status</span>
                                    <span class="flex h-2 w-2">
                                        <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                                    </span>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>Grid: ${state.miningStatus.currentPoint}/${state.miningStatus.totalPoints}</span>
                                        <span>Query: ${state.miningStatus.currentQuery}/${state.miningStatus.totalQueries}</span>
                                    </div>
                                    <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                        <div class="bg-indigo-600 h-full transition-all duration-500" style="width: ${(state.miningStatus.currentPoint / state.miningStatus.totalPoints) * 100}%"></div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2 pt-2">
                                    <div class="text-center p-2 bg-white rounded-lg border border-indigo-100">
                                        <div class="text-xs font-black text-indigo-600">${state.miningStatus.saved}</div>
                                        <div class="text-[8px] font-bold text-slate-400 uppercase">Salvos</div>
                                    </div>
                                    <div class="text-center p-2 bg-white rounded-lg border border-indigo-100">
                                        <div class="text-xs font-black text-slate-400">${state.miningStatus.duplicates}</div>
                                        <div class="text-[8px] font-bold text-slate-400 uppercase">Dupes</div>
                                    </div>
                                </div>
                                <div class="flex gap-2 pt-2">
                                    <button onclick="state.miningStatus.paused = !state.miningStatus.paused; render();" class="flex-1 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 transition-all">
                                        ${state.miningStatus.paused ? 'Continuar' : 'Pausar'}
                                    </button>
                                    <button onclick="state.stopSearch = true; render();" class="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-all">
                                        Parar
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <button onclick="searchLeads()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                                <i data-lucide="zap" class="w-4 h-4"></i>
                                NOVA MINERAÇÃO
                            </button>
                        `}
                    </div>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="lg:col-span-9 p-6 space-y-6">
                <!-- Header -->
                <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-3xl font-black tracking-tight text-slate-900">Meus Leads</h2>
                        <p class="text-slate-500 font-medium">Gerencie e qualifique suas oportunidades de negócio.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="downloadCSV()" class="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer flex items-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            EXPORTAR CSV
                        </button>
                        <button onclick="if(confirm('Limpar todos os leads e parar mineração ativa?')) { 
                            state.stopSearch = true;
                            state.leads = []; 
                            state.selectedLeads = [];
                            state.miningStatus = {
                                active: false,
                                paused: false,
                                currentPoint: 0,
                                totalPoints: 0,
                                currentQuery: 0,
                                totalQueries: 0,
                                found: 0,
                                saved: 0,
                                duplicates: 0,
                                currentPage: 1
                            };
                            saveLeads(); 
                            render(); 
                        }" class="px-5 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-black hover:bg-red-100 transition-all active:scale-95 cursor-pointer flex items-center gap-2">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                            LIMPAR TUDO
                        </button>
                    </div>
                </header>

                <!-- Stats Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Leads</div>
                        <div class="text-3xl font-black text-slate-900">${state.leads.length}</div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem Website</div>
                        <div class="text-3xl font-black text-red-500">${state.leads.filter(l => !l.website || l.website === "Sem site").length}</div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobertura Regional</div>
                        <div class="flex items-center gap-2">
                            <div class="text-3xl font-black text-emerald-600">${state.regionalSearch.city ? 'Ativa' : 'Padrão'}</div>
                            ${state.regionalSearch.city ? `
                                <div class="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase">
                                    ${state.regionalSearch.radius}km
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Potencial</div>
                        <div class="text-3xl font-black text-emerald-500">R$ ${state.leads.reduce((acc, l) => acc + (l.value || 0), 0).toLocaleString()}</div>
                    </div>
                </div>

                ${state.regionalSearch.city ? `
                    <div class="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                <i data-lucide="map" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h4 class="font-black text-slate-900">Busca Regional Ativa: ${state.regionalSearch.keyword}</h4>
                                <p class="text-xs font-medium text-slate-500">Cidades próximas em ${state.regionalSearch.radius}km de ${state.regionalSearch.city}: Valinhos, Vinhedo, Sumaré, Hortolândia, Paulínia.</p>
                            </div>
                        </div>
                        <button onclick="state.regionalSearch = {keyword: '', city: '', radius: 10}; render();" class="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700">Limpar</button>
                    </div>
                ` : ''}

                <!-- Ranking Checker Section -->
                <div class="bg-indigo-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div class="space-y-2 text-center md:text-left">
                        <h3 class="text-2xl font-black tracking-tight">Verificador de Ranking Google</h3>
                        <p class="text-indigo-200 font-medium">Descubra a posição real dos seus leads no Google Maps.</p>
                    </div>
                    <div class="flex w-full md:w-auto gap-3">
                        <input 
                            type="text" 
                            placeholder="Ex: salão de beleza campinas" 
                            value="${state.rankingKeyword || ''}"
                            onchange="state.rankingKeyword = this.value; render();"
                            class="flex-1 md:w-80 px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-white/40 font-bold outline-none focus:bg-white/20 transition-all"
                        />
                        <button onclick="checkRanking(null, state.rankingKeyword)" class="px-8 py-4 bg-white text-indigo-900 rounded-2xl font-black shadow-xl hover:scale-105 transition-all active:scale-95">
                            TESTAR RANKING
                        </button>
                    </div>
                </div>

                <!-- Filters & Table -->
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div class="flex flex-wrap items-center gap-3">
                            <select onchange="state.filterStatus = this.value; render();" class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                                <option value="Todos" ${state.filterStatus === 'Todos' ? 'selected' : ''}>Todos os Status</option>
                                <option value="Novo lead" ${state.filterStatus === 'Novo lead' ? 'selected' : ''}>Novo lead</option>
                                <option value="Em contato" ${state.filterStatus === 'Em contato' ? 'selected' : ''}>Em contato</option>
                                <option value="Reunião" ${state.filterStatus === 'Reunião' ? 'selected' : ''}>Reunião</option>
                                <option value="Respondido" ${state.filterStatus === 'Respondido' ? 'selected' : ''}>Respondido</option>
                                <option value="Fechado" ${state.filterStatus === 'Fechado' ? 'selected' : ''}>Fechado</option>
                            </select>
                            <select onchange="state.filterPriority = this.value; render();" class="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-bold outline-none">
                                <option value="Todos" ${state.filterPriority === 'Todos' ? 'selected' : ''}>Todas Prioridades</option>
                                <option value="Alta prioridade para vender SITE" ${state.filterPriority === 'Alta prioridade para vender SITE' ? 'selected' : ''}>Prioridade SITE</option>
                                <option value="Alta prioridade para vender GMN" ${state.filterPriority === 'Alta prioridade para vender GMN' ? 'selected' : ''}>Prioridade GMN</option>
                                <option value="Outros leads" ${state.filterPriority === 'Outros leads' ? 'selected' : ''}>Outros</option>
                            </select>
                            <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button onclick="state.filterType = 'Sem Site'; render();" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${state.filterType === 'Sem Site' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}">Sem Site</button>
                                <button onclick="state.filterSocial = 'WhatsApp'; render();" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${state.filterSocial === 'WhatsApp' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}">WhatsApp</button>
                                <button onclick="state.filterSocial = 'Lead Quente'; render();" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${state.filterSocial === 'Lead Quente' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}">Quentes</button>
                                <button onclick="state.filterStatus = 'Todos'; state.filterType = 'Todos'; state.filterSocial = 'Todos'; state.filterPriority = 'Todos'; render();" class="px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest">Limpar</button>
                            </div>
                        </div>
                        <div class="text-xs font-bold text-slate-400">
                            Mostrando ${filteredLeads.length} de ${state.leads.length} leads
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50">
                                    <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
                                    <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status GMN</th>
                                    <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Oportunidade</th>
                                    <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${filteredLeads.map(lead => {
                                    return `
                                    <tr class="hover:bg-slate-50/50 transition-colors group">
                                        <td class="px-6 py-5">
                                            <div class="flex items-center gap-4">
                                                <input type="checkbox" onchange="toggleLeadSelection('${lead.id}')" ${state.selectedLeads.includes(lead.id) ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                <div class="space-y-1">
                                                    <div class="flex items-center gap-2">
                                                        <span onclick="openAuditPanel('${lead.id}')" class="font-black text-slate-900 text-sm cursor-pointer hover:text-indigo-600 transition-colors">${lead.name}</span>
                                                        ${getLeadPriorityBadge(lead)}
                                                        ${getRankingBadge(lead.ranking)}
                                                    </div>
                                                    <div class="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                                        <i data-lucide="layers" class="w-3 h-3"></i>
                                                        ${getLeadPriorityInfo(lead).priorityGroup}
                                                    </div>
                                                    <div class="flex items-center gap-2 text-xs font-medium text-slate-400">
                                                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                                                        ${lead.address}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-5">
                                            <div class="space-y-1.5">
                                                <div class="flex items-center gap-1.5">
                                                    <div class="flex items-center gap-0.5">
                                                        ${Array(5).fill(0).map((_, i) => `
                                                            <i data-lucide="star" class="w-3 h-3 ${i < Math.floor(lead.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}"></i>
                                                        `).join('')}
                                                    </div>
                                                    <span class="text-xs font-bold text-slate-600">${lead.rating}</span>
                                                </div>
                                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    ${lead.reviews} avaliações • ${lead.photosCount} fotos
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-5">
                                            <div class="flex flex-col gap-2">
                                                <div class="flex items-center gap-2">
                                                    <span class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getOpportunityColor(calculateOpportunityScore(lead).score)}">
                                                        🔥 ${calculateOpportunityScore(lead).score} / 100
                                                    </span>
                                                </div>
                                                <div class="flex flex-wrap gap-1">
                                                    ${calculateOpportunityScore(lead).reasons.slice(0, 2).map(r => `<span class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1 rounded"># ${r.split(':')[0]}</span>`).join('')}
                                                    ${calculateOpportunityScore(lead).reasons.length > 2 ? `<span class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1 rounded">+${calculateOpportunityScore(lead).reasons.length - 2}</span>` : ''}
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-5">
                                            <div class="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 max-w-[300px] md:max-w-none">
                                                ${getActionButtonHTML('zap', 'Prospecção Rápida', 'Iniciar fluxo de prospecção inteligente com site e mensagem.', 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100', `startSmartProspecting('${lead.id}')`)}
                                                
                                                ${getActionButtonHTML('search', 'Ver Perfil', 'Visualizar o perfil completo da empresa.', 'bg-sky-50 text-sky-600 hover:bg-sky-100', `openAuditPanel('${lead.id}')`)}
                                                
                                                ${lead.tem_whatsapp ? 
                                                    getActionButtonHTML('message-circle', 'WhatsApp', 'Abrir conversa direta no WhatsApp com o lead.', 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', null, lead.whatsapp_url) 
                                                : ''}
                                                
                                                ${getActionButtonHTML('map', 'Abrir Maps', 'Abrir o perfil da empresa no Google Maps.', 'bg-indigo-900 text-white hover:bg-indigo-950', null, lead.mapsLink)}
                                                
                                                ${getActionButtonHTML('clipboard-list', 'Auditoria', 'Executar diagnóstico do perfil estilo Localo.', 'bg-amber-50 text-amber-600 hover:bg-amber-100', `openAuditPanel('${lead.id}')`)}
                                                
                                                ${getActionButtonHTML('calendar', 'Agendar', 'Criar lembrete de contato com o cliente.', 'bg-purple-50 text-purple-600 hover:bg-purple-100', `openMeetingModal('${lead.id}')`)}
                                                
                                                ${getActionButtonHTML('layout-template', 'Gerar Site', 'Criar site demo automático para esse lead.', 'bg-emerald-900 text-white hover:bg-emerald-950', `openSiteGenerator('${lead.id}')`)}
                                                
                                                ${getActionButtonHTML('copy', 'Copiar Dados', 'Copiar telefone, nome e endereço.', 'bg-slate-100 text-slate-600 hover:bg-slate-200', `copyProspectingMessage({name: '${lead.name.replace(/'/g, "\\'")}'})`)}
                                                
                                                ${getActionButtonHTML('trending-up', 'Ranking', 'Verificar posição no Google Maps.', 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100', `checkRanking('${lead.id}', state.rankingKeyword)`)}
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    `;

    // Event Listeners
    document.getElementById('logo-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('home-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('nav-dash-btn').onclick = () => { state.view = 'dashboard'; render(); };
    document.getElementById('nav-agenda-btn').onclick = () => { state.view = 'agenda'; render(); };
    document.getElementById('nav-campaign-btn').onclick = () => { state.view = 'campaigns'; render(); };
    
    if (window.lucide) lucide.createIcons();
}

// --- Global Actions for Inline Events ---
window.state = state;
window.render = render;
window.saveSettings = saveSettings;
window.saveLeads = saveLeads;
window.searchLeads = searchLeads;
window.enrichLeads = enrichLeads;
window.downloadCSV = downloadCSV;
window.copyProspectingMessage = copyProspectingMessage;
window.toggleLeadSelection = toggleLeadSelection;
window.sendMessageAssistant = sendMessageAssistant;
window.generateDemoSite = generateDemoSite;
window.downloadDemoHTML = downloadDemoHTML;
window.copyDemoLink = copyDemoLink;
window.openDemoInNewTab = openDemoInNewTab;
window.openAuditPanel = openAuditPanel;
window.generateProspectingMessage = generateProspectingMessage;
window.checkRanking = checkRanking;
window.updateMeetingStatus = updateMeetingStatus;
window.deleteMeeting = deleteMeeting;
window.getOpportunityColor = getOpportunityColor;
window.getOpportunityLabel = getOpportunityLabel;
window.previewLibrarySite = previewLibrarySite;
window.duplicateLibrarySite = duplicateLibrarySite;
window.deleteLibrarySite = deleteLibrarySite;
window.openSiteGenerator = (leadId) => {
    const lead = state.leads.find(l => l.id === leadId);
    if (lead) {
        state.selectedLeadForSite = lead;
        state.view = 'dashboard'; // Ensure we are on dashboard to show site gen
        render();
    }
};

const NICHE_TEMPLATES = {
    "Salão de Beleza": {
        primary: "#fda4af", // rose-300
        secondary: "#fff1f2", // rose-50
        accent: "#fafaf9", // stone-50 (soft beige)
        heroImages: [
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80"
        ],
        services: ["Corte Feminino", "Escova & Modelagem", "Coloração & Mechas", "Hidratação Capilar", "Manicure & Pedicure"],
        galleryImages: [
            "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=400&q=80"
        ]
    },
    "Barbearia": {
        primary: "#000000", // black
        secondary: "#111111", // dark gray
        accent: "#d4af37", // gold
        heroImages: [
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1621605815841-2dddb7a69e3d?auto=format&fit=crop&w=1200&q=80"
        ],
        services: ["Corte de Cabelo", "Barba Terapia", "Corte & Barba", "Pigmentação", "Sobrancelha"],
        galleryImages: [
            "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1621605815841-2dddb7a69e3d?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1593702295094-2825834931fb?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1599351431247-f5793384797d?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80"
        ]
    },
    "Clínica Estética": {
        primary: "#3b82f6", // blue-500
        secondary: "#ffffff", // white
        accent: "#eff6ff", // blue-50
        heroImages: [
            "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1200&q=80"
        ],
        services: ["Limpeza de Pele", "Peeling Químico", "Botox & Preenchimento", "Drenagem Linfática", "Depilação a Laser"],
        galleryImages: [
            "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80"
        ]
    },
    "Dentista": {
        primary: "#0ea5e9", // sky-500
        secondary: "#ffffff", // white
        accent: "#f0f9ff", // sky-50
        heroImages: [
            "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1445527815219-ecbfec67492e?auto=format&fit=crop&w=1200&q=80"
        ],
        services: ["Limpeza & Prevenção", "Clareamento Dental", "Implantes Dentários", "Ortodontia", "Odontopediatria"],
        galleryImages: [
            "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1445527815219-ecbfec67492e?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&w=400&q=80"
        ]
    },
    "Pet Shop": {
        primary: "#10b981", // emerald-500
        secondary: "#f97316", // orange-500
        accent: "#ecfdf5", // emerald-50
        heroImages: [
            "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=1200&q=80"
        ],
        services: ["Banho e Tosa", "Consulta Veterinária", "Vacinação", "Hospedagem", "Pet Sitter"],
        galleryImages: [
            "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1591768793355-74d7af73a7e6?auto=format&fit=crop&w=400&q=80"
        ]
    },
    "Restaurante": {
        primary: "#991b1b", // red-800 (dark red)
        secondary: "#fffbeb", // amber-50 (cream)
        accent: "#7f1d1d", // red-900
        heroImages: [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80"
        ],
        services: ["Almoço Executivo", "Jantar à la Carte", "Eventos & Reservas", "Delivery Rápido", "Happy Hour"],
        galleryImages: [
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=400&q=80"
        ]
    },
    "Prestadores de Serviço": {
        primary: "#3b82f6", // blue-500
        secondary: "#eff6ff", // blue-50
        accent: "#1e40af", // blue-800
        heroImages: [
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80"
        ],
        services: ["Manutenção Geral", "Instalações Elétricas", "Reparos Hidráulicos", "Pintura Residencial", "Consultoria Técnica"],
        galleryImages: [
            "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1595841055112-5c245b890591?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1558403194-611308249627?auto=format&fit=crop&w=400&q=80"
        ]
    }
};

function getTemplateForNiche(niche, leadName, category) {
    const name = (leadName || "").toLowerCase();
    const cat = (category || "").toLowerCase();
    const n = (niche || "").toLowerCase();
    
    let template = NICHE_TEMPLATES["Prestadores de Serviço"];
    
    if (name.includes('barbearia') || name.includes('barber') || cat === 'barber_shop') template = NICHE_TEMPLATES["Barbearia"];
    else if (name.includes('dentista') || name.includes('odonto') || cat === 'dentist') template = NICHE_TEMPLATES["Dentista"];
    else if (n.includes('salão') || n.includes('beleza') || cat === 'beauty_salon' || cat === 'hair_care') template = NICHE_TEMPLATES["Salão de Beleza"];
    else if (n.includes('pet') || n.includes('veterinária') || cat === 'pet_store' || cat === 'veterinary_care') template = NICHE_TEMPLATES["Pet Shop"];
    else if (n.includes('restaurante') || n.includes('padaria') || n.includes('pizzaria') || n.includes('hamburgueria') || cat === 'restaurant' || cat === 'bakery' || cat === 'meal_takeaway') template = NICHE_TEMPLATES["Restaurante"];
    else if (n.includes('clínica') || n.includes('médica') || n.includes('estética') || cat === 'doctor' || cat === 'hospital' || cat === 'spa') template = NICHE_TEMPLATES["Clínica Estética"];
    
    // Randomize images from the template
    const result = { ...template };
    if (result.heroImages) {
        result.heroImg = result.heroImages[Math.floor(Math.random() * result.heroImages.length)];
    }
    if (result.galleryImages) {
        // Pick 3 random gallery images
        const shuffled = [...result.galleryImages].sort(() => 0.5 - Math.random());
        result.gallery = shuffled.slice(0, 3);
    }
    
    return result;
}

async function getBrandingColors(lead) {
    const cleanGeminiKey = (state.geminiKey || "").trim().replace(/["']/g, '').replace(/\s/g, '');
    if (!cleanGeminiKey) return null;

    const instagramUrl = lead.instagram || "";
    const prompt = `
        Analise a marca deste negócio local e sugira uma paleta de cores elegante e moderna para um site.
        Negócio: ${lead.name}
        Categoria: ${lead.category || lead.niche || "Serviços Profissionais"}
        Cidade: ${lead.city}
        Instagram: ${instagramUrl}

        REGRAS:
        1. Se houver Instagram, sugira cores que combinem com a identidade visual típica dessa marca (ou use seu conhecimento se for uma marca conhecida).
        2. Se não houver Instagram, use as cores padrão do nicho:
           - Salão de Beleza: rose/nude/soft beige
           - Barbearia: black/gold
           - Clínica/Dentista: white/blue/light grey
           - Pet shop: green/orange
           - Restaurante: dark red/cream
        3. Evite designs totalmente pretos, a menos que seja a marca.
        4. Retorne APENAS um objeto JSON com as chaves: primary, secondary, accent (em formato hex).
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: cleanGeminiKey });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Erro ao extrair branding:", error);
        return null;
    }
}

function openDemoGenerator(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;
    
    state.selectedLeadForSite = lead;
    state.siteDraft = null;
    state.isGeneratingSite = false;
    render();
}

function openSiteGenerator(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;
    state.selectedLeadForSite = lead;
    state.siteDraft = "";
    state.isGeneratingSite = false;
    render();
}

window.openSiteGenerator = openSiteGenerator;

async function generateDemoSite(leadId, mode = 'auto', customData = null, variation = 1) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;
    
    state.selectedLeadForSite = lead;
    state.isGeneratingSite = true;
    state.siteGenerationMode = mode;
    render();
    
    try {
        let brandingColors = null;
        if (mode === 'auto') {
            brandingColors = await getBrandingColors(lead);
        }

        if (mode === 'clone' && customData) {
            // Use Gemini to analyze and clone
            const ai = new GoogleGenAI({ apiKey: state.geminiKey });
            const prompt = `
                Você é um desenvolvedor web sênior. Sua tarefa é criar um site de demonstração moderno e responsivo para um cliente.
                
                DADOS DO CLIENTE:
                Nome: ${lead.name}
                Cidade: ${lead.city}
                Categoria: ${lead.category || lead.niche || "Serviços Profissionais"}
                Endereço: ${lead.address}
                Telefone: ${lead.phone}
                
                INSTRUÇÃO DE CLONAGEM:
                ${customData.type === 'link' ? `Analise o estilo e estrutura deste site: ${customData.value}` : 'Analise o estilo e estrutura da imagem anexada.'}
                
                REQUISITOS:
                1. Use Tailwind CSS via CDN.
                2. Use fontes do Google Fonts.
                3. O site deve ser elegante, mobile-first e focado em conversão.
                4. Inclua seções de Hero, Sobre, Serviços, Galeria, Depoimentos e Localização.
                5. Adicione um botão flutuante de WhatsApp.
                6. Retorne APENAS o código HTML completo dentro de uma tag <html>.
            `;
            
            let parts = [{ text: prompt }];
            if (customData.type === 'screenshot' && customData.value) {
                parts.push({
                    inlineData: {
                        mimeType: "image/png",
                        data: customData.value.split(',')[1]
                    }
                });
            }
            
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: { parts }
            });
            
            const html = response.text.match(/<html[\s\S]*<\/html>/i)?.[0] || response.text;
            state.siteDraft = getDemoSiteHTML(lead, 'clone', { html }, null, variation);
        } else {
            // Simulate generation delay for effect
            if (!brandingColors) await new Promise(resolve => setTimeout(resolve, 1500));
            state.siteDraft = getDemoSiteHTML(lead, mode, null, brandingColors, variation);
        }
        
        // Save to library
        const newSite = {
            id: Date.now().toString(),
            leadId: lead.id,
            leadName: lead.name,
            category: lead.category || lead.niche || "Serviços Profissionais",
            mode: mode,
            variation: variation,
            date: new Date().toISOString(),
            html: state.siteDraft
        };
        state.demoLibrary.unshift(newSite);
        saveDemoLibrary();
        
    } catch (error) {
        console.error('Erro ao gerar site:', error);
        
        const errorMessage = error.message || "Erro desconhecido ao gerar site.";
        if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('429')) {
            state.aiStatus = 'quota_exceeded';
            state.aiErrorMessage = "Limite de cota da API Gemini atingido.";
        } else {
            state.aiStatus = 'error';
            state.aiErrorMessage = errorMessage;
        }
        
        showToast(`⚠️ ${state.aiErrorMessage}`, "error");
    } finally {
        state.isGeneratingSite = false;
        render();
    }
}

const GIO_FASHION_TEMPLATE = {
    primary: "#1a1a1a",
    secondary: "#f8f8f8",
    accent: "#c5a059", // Gold-ish
    heroImg: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
    services: ["Consultoria de Estilo", "Coleções Exclusivas", "Atendimento Personalizado"],
    gallery: [
        "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80"
    ]
};

function getDemoSiteHTML(lead, mode = 'auto', customData = null, brandingColors = null, variation = 1) {
    const categoryText = lead.category || lead.niche || "Serviços Profissionais de Alta Qualidade";
    const cleanCategory = (categoryText.toLowerCase().includes('undefined') || categoryText.length < 3) ? "Excelência em Atendimento Especializado" : categoryText;
    
    let baseTemplate = mode === 'template' ? GIO_FASHION_TEMPLATE : getTemplateForNiche(lead.niche, lead.name, lead.category);
    
    // Layout Templates
    const layouts = [
        { name: 'Modern', theme: 'modern' },
        { name: 'Minimal', theme: 'minimal' },
        { name: 'Luxury', theme: 'luxury' },
        { name: 'Light', theme: 'light' },
        { name: 'Editorial', theme: 'editorial' }
    ];
    
    // Select layout based on variation
    const selectedLayout = layouts[(variation - 1) % layouts.length];
    
    // Override with branding colors if provided
    let template = { ...baseTemplate };
    if (brandingColors) {
        template.primary = brandingColors.primary || template.primary;
        template.secondary = brandingColors.secondary || template.secondary;
        template.accent = brandingColors.accent || template.accent || brandingColors.primary;
    }

    const whatsappUrl = lead.whatsapp_url || getWhatsAppUrl(lead.phone);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}&query_place_id=${lead.placeId}`;

    // Get real photos from Google if available
    const cleanMapsKey = (state.googleMapsKey || "").trim().replace(/["']/g, '').replace(/\s/g, '');
    let heroImg = template.heroImg;
    let gallery = [...template.gallery];

    if (lead.photos && lead.photos.length > 0) {
        // Use first photo as hero
        heroImg = `https://places.googleapis.com/v1/${lead.photos[0]}/media?key=${cleanMapsKey}&maxHeightPx=1200&maxWidthPx=1920`;
        
        // Use remaining photos for gallery
        const realGalleryPhotos = lead.photos.slice(1, 4).map(p => 
            `https://places.googleapis.com/v1/${p}/media?key=${cleanMapsKey}&maxHeightPx=800&maxWidthPx=800`
        );
        
        // Fill gallery with real photos, fallback to template if not enough
        for (let i = 0; i < realGalleryPhotos.length; i++) {
            gallery[i] = realGalleryPhotos[i];
        }
    }

    if (mode === 'clone' && customData) {
        return customData.html; // Gemini generated HTML
    }

    // Dynamic Services based on category
    const services = template.services || ["Atendimento Personalizado", "Consultoria Especializada", "Serviços de Alta Qualidade"];

    // Template specific styles
    let bodyClass = "bg-white text-slate-900";
    let navClass = "bg-white/80 backdrop-blur-md border-b border-slate-100";
    let heroClass = "bg-slate-50";
    
    if (selectedLayout.theme === 'luxury') {
        bodyClass = "bg-[#050505] text-white selection:bg-white selection:text-black";
        navClass = "bg-black/20 backdrop-blur-md border-b border-white/10";
        heroClass = "bg-black";
    } else if (selectedLayout.theme === 'modern') {
        bodyClass = "bg-slate-50 text-slate-900";
        navClass = "bg-white/90 backdrop-blur-md shadow-sm";
    } else if (selectedLayout.theme === 'minimal') {
        bodyClass = "bg-white text-slate-800";
        navClass = "bg-white border-b border-slate-50";
        heroClass = "bg-white";
    }

    return `
<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lead.name} | ${cleanCategory}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@300;400;600;800&family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: ${template.primary};
            --secondary: ${template.secondary};
            --accent: ${template.accent || template.primary};
        }
        body { font-family: 'Inter', sans-serif; }
        .serif { font-family: 'Playfair Display', serif; }
        .outfit { font-family: 'Outfit', sans-serif; }
        
        .bg-primary { background-color: var(--primary); }
        .text-primary { color: var(--primary); }
        .border-primary { border-color: var(--primary); }
        
        .btn-primary {
            background-color: var(--primary);
            color: white;
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }

        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
    </style>
</head>
<body class="${bodyClass}">
    <!-- Navigation -->
    <nav class="fixed top-0 w-full z-[100] px-6 py-4 flex justify-between items-center ${navClass}">
        <div class="serif text-2xl font-black tracking-tighter">${lead.name}</div>
        <div class="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-widest opacity-70">
            <a href="#sobre" class="hover:text-primary transition-colors">Sobre</a>
            <a href="#servicos" class="hover:text-primary transition-colors">Serviços</a>
            <a href="#contato" class="hover:text-primary transition-colors">Contato</a>
        </div>
        <a href="${whatsappUrl}" target="_blank" class="px-6 py-3 btn-primary rounded-full text-[10px] font-black uppercase tracking-widest">Agendar</a>
    </nav>

    <!-- Hero Section -->
    <header class="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden ${heroClass}">
        <div class="absolute inset-0 z-0">
            <img src="${heroImg}" class="w-full h-full object-cover opacity-50" alt="${lead.name}" referrerpolicy="no-referrer">
            <div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-current opacity-20"></div>
        </div>
        
        <div class="relative z-10 max-w-6xl mx-auto px-6 text-center space-y-8 animate-fadeIn">
            <div class="space-y-4">
                <span class="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 block">Bem-vindo ao ${lead.name}</span>
                <h1 class="serif text-6xl md:text-9xl font-black leading-tight tracking-tighter">
                    ${cleanCategory} <br>
                    <span class="italic font-normal opacity-80">em ${lead.city}.</span>
                </h1>
            </div>
            
            <p class="text-lg md:text-xl opacity-70 font-light max-w-2xl mx-auto leading-relaxed">
                ${lead.description || `Elevando o padrão de ${cleanCategory} em ${lead.city}. Uma experiência desenhada para quem busca o extraordinário e resultados reais.`}
            </p>

            <div class="flex flex-col md:flex-row items-center justify-center gap-4 pt-6">
                <a href="${whatsappUrl}" target="_blank" class="w-full md:w-auto px-10 py-5 btn-primary rounded-full font-black text-xs uppercase tracking-widest shadow-xl">
                    Falar no WhatsApp
                </a>
                <a href="#sobre" class="w-full md:w-auto px-10 py-5 border border-current/20 rounded-full font-black text-xs uppercase tracking-widest hover:bg-current/5 transition-all">
                    Conhecer Unidade
                </a>
            </div>

            <!-- Google Rating Badge -->
            <div class="pt-12 flex flex-col items-center gap-2 opacity-80">
                <div class="flex items-center gap-1 text-amber-400">
                    ${Array(5).fill(0).map((_, i) => `<svg class="w-5 h-5 ${i < Math.floor(lead.rating) ? 'fill-current' : 'fill-none stroke-current'}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`).join('')}
                </div>
                <div class="text-sm font-bold uppercase tracking-widest">
                    ⭐ ${lead.rating} no Google • ${lead.reviews} avaliações
                </div>
            </div>
        </div>
    </header>

    <!-- About Section -->
    <section id="sobre" class="py-32 px-6 max-w-7xl mx-auto">
        <div class="grid md:grid-cols-2 gap-20 items-center">
            <div class="space-y-8">
                <div class="space-y-4">
                    <span class="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Nossa Essência</span>
                    <h2 class="serif text-5xl md:text-7xl font-black tracking-tighter leading-tight">Excelência & <br><span class="italic font-normal opacity-60">Compromisso.</span></h2>
                </div>
                
                <p class="text-lg opacity-70 font-light leading-relaxed">
                    Localizados em ${lead.city}, o ${lead.name} é referência em ${cleanCategory}. 
                    Nossa missão é transformar cada atendimento em uma experiência única de satisfação e confiança.
                </p>

                <div class="grid grid-cols-2 gap-8 pt-8 border-t border-current/10">
                    <div class="space-y-1">
                        <div class="serif text-4xl font-black">${lead.rating}</div>
                        <div class="text-[10px] font-black uppercase tracking-widest opacity-50">Nota Média</div>
                    </div>
                    <div class="space-y-1">
                        <div class="serif text-4xl font-black">+${lead.reviews}</div>
                        <div class="text-[10px] font-black uppercase tracking-widest opacity-50">Avaliações</div>
                    </div>
                </div>
            </div>
            
            <div class="relative">
                <img src="${gallery[0]}" class="rounded-[2rem] shadow-2xl w-full h-[500px] object-cover" alt="Ambiente" referrerpolicy="no-referrer">
                <div class="absolute -bottom-10 -left-10 bg-primary text-white p-10 rounded-[2rem] hidden md:block shadow-2xl">
                    <div class="serif text-3xl font-black mb-2">Qualidade</div>
                    <div class="text-[10px] font-black uppercase tracking-widest opacity-70">Garantida em cada detalhe</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Gallery Section -->
    <section id="galeria" class="py-32 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div class="max-w-7xl mx-auto space-y-16">
            <div class="text-center space-y-4">
                <span class="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Nosso Espaço</span>
                <h2 class="serif text-5xl md:text-7xl font-black tracking-tighter">Galeria de <span class="italic font-normal opacity-60">Fotos.</span></h2>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                ${gallery.map((img, idx) => `
                    <div class="group relative overflow-hidden rounded-[2rem] aspect-square shadow-xl">
                        <img src="${img}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Galeria ${idx + 1}" referrerpolicy="no-referrer">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div class="text-white text-[10px] font-black uppercase tracking-widest border border-white/40 px-6 py-3 rounded-full">Ver Detalhes</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    <section id="servicos" class="py-32 bg-current/5 rounded-[3rem] mx-4 md:mx-8">
        <div class="max-w-7xl mx-auto px-6 text-center">
            <div class="space-y-4 mb-20">
                <span class="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Especialidades</span>
                <h2 class="serif text-5xl md:text-7xl font-black tracking-tighter">Nossos <span class="italic font-normal opacity-60">Serviços.</span></h2>
            </div>

            <div class="grid md:grid-cols-3 gap-6">
                ${services.map((s, i) => `
                    <div class="p-10 bg-white shadow-sm rounded-[2rem] hover:shadow-xl transition-all group text-left border border-slate-100">
                        <div class="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h3 class="serif text-2xl font-black mb-4 text-slate-900">${s}</h3>
                        <p class="text-sm font-light text-slate-500 leading-relaxed">
                            Serviço especializado de ${cleanCategory} focado em resultados excepcionais para nossos clientes.
                        </p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Map & Contact -->
    <section id="contato" class="py-32 px-6">
        <div class="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
            <div class="space-y-10">
                <div class="space-y-4">
                    <span class="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Localização</span>
                    <h2 class="serif text-5xl font-black tracking-tighter">Venha nos <span class="italic font-normal opacity-60">Visitar.</span></h2>
                </div>
                
                <div class="space-y-6">
                    <div class="flex items-start gap-4">
                        <div class="p-3 bg-primary/10 text-primary rounded-lg">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <div>
                            <div class="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Endereço</div>
                            <div class="font-bold">${lead.address}</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="p-3 bg-primary/10 text-primary rounded-lg">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        </div>
                        <div>
                            <div class="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Telefone</div>
                            <div class="font-bold">${lead.phone}</div>
                        </div>
                    </div>
                </div>

                <a href="${whatsappUrl}" target="_blank" class="inline-block px-10 py-5 btn-primary rounded-full font-black text-xs uppercase tracking-widest shadow-xl">
                    Agendar Horário
                </a>
            </div>
            
            <div class="h-[500px] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100">
                <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    style="border:0" 
                    src="https://www.google.com/maps/embed/v1/place?key=${cleanMapsKey}&q=place_id:${lead.placeId}" 
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-20 px-6 text-center border-t border-current/5 opacity-50">
        <div class="serif text-2xl font-black tracking-tighter mb-4">${lead.name}</div>
        
        ${lead.instagram_url ? `
        <div class="flex justify-center gap-6 mb-8">
            <a href="${lead.instagram_url}" target="_blank" class="opacity-60 hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
            </a>
        </div>
        ` : ''}

        <div class="text-[10px] font-black uppercase tracking-widest opacity-50">
            © 2024 ${lead.name}. Todos os direitos reservados.
        </div>
    </footer>

    <!-- Floating WhatsApp -->
    <a href="${whatsappUrl}" target="_blank" class="fixed bottom-8 right-8 z-[200] bg-[#25D366] text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all">
        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </a>
</body>
</html>
    `;
}

function publishDemo() {
    state.error = "Demo publicada com sucesso! O link agora é público e pode ser enviado ao cliente.";
    render();
}

window.publishDemo = publishDemo;

function getDemoModalHTML() {
    if (!state.selectedLeadForSite) return "";
    
    const lead = state.selectedLeadForSite;
    
    // If site is not generated yet, show options
    if (!state.siteDraft && !state.isGeneratingSite) {
        return `
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-10 bg-slate-900/80 backdrop-blur-md animate-fade-in pointer-events-auto">
                <div class="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-scale-up">
                    <div class="p-8 border-b border-slate-100 flex items-center justify-between">
                        <h2 class="text-2xl font-black tracking-tight">Gerar Site Demo: ${lead.name}</h2>
                        <button onclick="state.selectedLeadForSite = null; render();" class="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <div class="p-10 grid grid-cols-1 gap-12 overflow-y-auto">
                        <!-- Model Selector -->
                        <div class="space-y-6">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Selecione um Modelo</h3>
                                <button onclick="generateDemoSite('${lead.id}', 'auto', null, Math.floor(Math.random() * 3) + 1)" class="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-2">
                                    <i data-lucide="shuffle" class="w-3 h-3"></i> Aleatório
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <!-- Model 1 -->
                                <button onclick="generateDemoSite('${lead.id}', 'auto', null, 1)" class="group relative bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden hover:border-emerald-500 transition-all text-left flex flex-col h-full">
                                    <div class="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                                        <img src="https://picsum.photos/seed/modern/600/400" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90" alt="Moderno" referrerpolicy="no-referrer">
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                        <div class="absolute bottom-4 left-4">
                                            <span class="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Estilo Moderno</span>
                                        </div>
                                    </div>
                                    <div class="p-6 flex-1 flex flex-col">
                                        <h4 class="text-lg font-black mb-2">Modelo 1</h4>
                                        <p class="text-xs text-slate-500 font-medium leading-relaxed flex-1">Design arrojado, cores vibrantes e seções dinâmicas para máximo impacto visual.</p>
                                        <div class="mt-4 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            Gerar com este modelo <i data-lucide="arrow-right" class="w-3 h-3"></i>
                                        </div>
                                    </div>
                                </button>

                                <!-- Model 2 -->
                                <button onclick="generateDemoSite('${lead.id}', 'auto', null, 2)" class="group relative bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden hover:border-slate-900 transition-all text-left flex flex-col h-full">
                                    <div class="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                                        <img src="https://picsum.photos/seed/minimal/600/400" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90" alt="Minimalista" referrerpolicy="no-referrer">
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                        <div class="absolute bottom-4 left-4">
                                            <span class="px-3 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Estilo Minimalista</span>
                                        </div>
                                    </div>
                                    <div class="p-6 flex-1 flex flex-col">
                                        <h4 class="text-lg font-black mb-2">Modelo 2</h4>
                                        <p class="text-xs text-slate-500 font-medium leading-relaxed flex-1">Foco na clareza, espaços em branco e tipografia elegante para uma leitura leve e direta.</p>
                                        <div class="mt-4 flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            Gerar com este modelo <i data-lucide="arrow-right" class="w-3 h-3"></i>
                                        </div>
                                    </div>
                                </button>

                                <!-- Model 3 -->
                                <button onclick="generateDemoSite('${lead.id}', 'auto', null, 3)" class="group relative bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden hover:border-indigo-500 transition-all text-left flex flex-col h-full">
                                    <div class="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                                        <img src="https://picsum.photos/seed/luxury/600/400" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90" alt="Premium" referrerpolicy="no-referrer">
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                        <div class="absolute bottom-4 left-4">
                                            <span class="px-3 py-1 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Estilo Premium</span>
                                        </div>
                                    </div>
                                    <div class="p-6 flex-1 flex flex-col">
                                        <h4 class="text-lg font-black mb-2">Modelo 3</h4>
                                        <p class="text-xs text-slate-500 font-medium leading-relaxed flex-1">Estética sofisticada, tons escuros e acabamento de alto padrão para marcas exclusivas.</p>
                                        <div class="mt-4 flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            Gerar com este modelo <i data-lucide="arrow-right" class="w-3 h-3"></i>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div class="grid md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                            <!-- Clone by Link -->
                            <div class="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] space-y-6">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                                        <i data-lucide="link" class="w-6 h-6"></i>
                                    </div>
                                    <h3 class="text-lg font-black">Clonar por Link</h3>
                                </div>
                                <input type="text" id="clone-url" placeholder="https://exemplo.com" class="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-slate-900 outline-none">
                                <button onclick="const url = document.getElementById('clone-url').value; if(url) generateDemoSite('${lead.id}', 'clone', {type: 'link', value: url})" class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Analisar e Clonar</button>
                            </div>

                            <!-- Clone by Screenshot -->
                            <div class="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] space-y-6">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                                        <i data-lucide="image" class="w-6 h-6"></i>
                                    </div>
                                    <h3 class="text-lg font-black">Clonar por Print</h3>
                                </div>
                                <label class="block w-full p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-center cursor-pointer hover:border-slate-400 transition-all">
                                    <span class="text-slate-400 font-bold uppercase tracking-widest text-xs">Upload Screenshot</span>
                                    <input type="file" id="clone-screenshot" accept="image/*" class="hidden" onchange="handleScreenshotUpload(event, '${lead.id}')">
                                </label>
                                <p class="text-[10px] text-slate-400 font-bold uppercase text-center">A IA analisará o layout da imagem</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="fixed inset-0 z-[150] bg-white flex flex-col animate-fade-in pointer-events-auto">
            <!-- Top Preview Bar -->
            <div class="h-20 bg-slate-900 text-white flex items-center justify-between px-6 shadow-xl z-[160]">
                <div class="flex items-center gap-6">
                    <button onclick="state.selectedLeadForSite = null; state.siteDraft = ''; render();" 
                            class="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span class="hidden sm:inline">Voltar ao CRM</span>
                    </button>
                    <div class="h-8 w-px bg-white/10 hidden sm:block"></div>
                    <div class="hidden md:block">
                        <h2 class="text-sm font-black tracking-tight">${lead.name}</h2>
                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Visualização da Solução</p>
                    </div>
                </div>

                <div class="flex items-center gap-2 sm:gap-4">
                    <button onclick="copyDemoLink()" 
                            class="p-4 sm:px-6 sm:py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
                        <i data-lucide="copy" class="w-4 h-4"></i>
                        <span class="hidden lg:inline">Copiar Link</span>
                    </button>
                    <button onclick="openDemoInNewTab()" 
                            class="p-4 sm:px-6 sm:py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                        <span class="hidden lg:inline">Abrir em nova aba</span>
                    </button>
                    <button onclick="publishDemo()" 
                            class="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2">
                        <i data-lucide="send" class="w-4 h-4"></i>
                        <span>Publicar Demo</span>
                    </button>
                </div>
            </div>

            <!-- Preview Area -->
            <div class="flex-1 relative bg-slate-100 overflow-hidden">
                ${state.isGeneratingSite ? `
                    <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm space-y-6">
                        <div class="relative">
                            <div class="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                            <i data-lucide="sparkles" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-600 animate-pulse"></i>
                        </div>
                        <div class="text-center space-y-2">
                            <h3 class="text-2xl font-black text-slate-900">
                                ${state.siteGenerationMode === 'clone' ? 'Analisando e Clonando Layout...' : 'Construindo Site Demo...'}
                            </h3>
                            <p class="text-slate-500 font-medium">A IA está processando os dados para criar uma experiência única.</p>
                        </div>
                    </div>
                ` : `
                    <iframe id="demo-preview-frame" class="w-full h-full border-none bg-white"></iframe>
                `}
            </div>
        </div>
    `;
}

function handleScreenshotUpload(event, leadId) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        generateDemoSite(leadId, 'clone', { type: 'screenshot', value: e.target.result });
    };
    reader.readAsDataURL(file);
}

// Update the iframe content after render
const originalRender = render;
window.render = function() {
    originalRender();
    
    // Demo Preview Frame
    if (state.selectedLeadForSite && state.siteDraft && !state.isGeneratingSite) {
        const frame = document.getElementById('demo-preview-frame');
        if (frame) {
            const doc = frame.contentDocument || frame.contentWindow.document;
            doc.open();
            doc.write(state.siteDraft);
            doc.close();
        }
    }
    
    // Smart Prospecting Preview Frame
    if (state.selectedLeadForSmartProspecting && state.siteDraft && !state.isGeneratingSite) {
        const frame = document.getElementById('smart-preview-frame');
        if (frame) {
            const doc = frame.contentDocument || frame.contentWindow.document;
            doc.open();
            doc.write(state.siteDraft);
            doc.close();
        }
    }
};

function openDemoInNewTab() {
    if (!state.siteDraft) return;
    const blob = new Blob([state.siteDraft], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

function downloadDemoHTML() {
    if (!state.siteDraft) return;
    const blob = new Blob([state.siteDraft], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site_${state.selectedLeadForSite.name.toLowerCase().replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function openAuditPanel(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;
    state.selectedLeadForAudit = lead;
    state.showAuditPanel = true;
    render();
}

async function generateProspectingMessage(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;

    const { reasons } = calculateOpportunityScore(lead);
    
    const prompt = `
        Gere uma mensagem curta, natural e consultiva para o WhatsApp para prospectar este lead local:
        Empresa: ${lead.name}
        Cidade: ${lead.city}
        Oportunidades identificadas: ${reasons.join(', ')}
        
        Regras:
        - Tom amigável e profissional (não vendedor chato)
        - Foco em ajudar a empresa a crescer e atrair mais clientes
        - Mencione que notou o bom trabalho deles mas que existem ajustes simples no Google que podem dobrar as visitas
        - Máximo 3 parágrafos curtos
        - Use emojis de forma moderada
        - Termine com uma pergunta aberta
        - Não use placeholders como [Seu Nome] ou [Minha Empresa]
    `;

    try {
        state.loading = true;
        render();

        const cleanGeminiKey = (state.geminiKey || "").trim().replace(/["']/g, '').replace(/\s/g, '');
        if (!cleanGeminiKey) {
            alert("Por favor, configure sua chave Gemini nas configurações.");
            return;
        }

        const ai = new GoogleGenAI({ apiKey: cleanGeminiKey });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });

        const message = response.text;
        
        // Open WhatsApp with the message
        const whatsappUrl = `https://wa.me/${(lead.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    } catch (err) {
        console.error("Error generating message:", err);
        alert("Erro ao gerar mensagem. Verifique sua chave da IA.");
    } finally {
        state.loading = false;
        render();
    }
}

function getAuditPanelHTML() {
    if (!state.showAuditPanel || !state.selectedLeadForAudit) return "";
    
    const lead = state.selectedLeadForAudit;
    const { score, reasons } = calculateOpportunityScore(lead);
    const colorClass = getOpportunityColor(score);
    const label = getOpportunityLabel(score);

    const checklist = [
        { 
            label: !!lead.website && lead.website !== "Sem site" ? "Presença Web: Já possui site próprio" : "O perfil pode se beneficiar de um site simples para captar mais clientes.", 
            value: !!lead.website && lead.website !== "Sem site",
            icon: "globe"
        },
        { 
            label: (lead.rating || 0) >= 4.6 ? "Reputação: Excelente média de avaliações" : "Melhorar a média de avaliações ajudará no posicionamento e conversão.", 
            value: (lead.rating || 0) >= 4.6,
            icon: "star"
        },
        { 
            label: (lead.photosCount || 0) >= 10 ? "Visual: Perfil com boa quantidade de fotos" : "Adicionar mais fotos reais do negócio pode aumentar o engajamento.", 
            value: (lead.photosCount || 0) >= 10,
            icon: "image"
        },
        { 
            label: !!lead.description && lead.description.length > 10 ? "Conteúdo: Descrição do perfil está presente" : "Uma descrição detalhada e otimizada melhora a visibilidade nas buscas.", 
            value: !!lead.description && lead.description.length > 10,
            icon: "file-text"
        },
        {
            label: lead.phone && lead.phone !== "Sem telefone" ? "Contato: Telefone disponível no perfil" : "Garantir que todos os canais de contato estejam visíveis facilita a venda.",
            value: lead.phone && lead.phone !== "Sem telefone",
            icon: "phone"
        }
    ];

    // Sort checklist: strengths first
    const sortedChecklist = [...checklist].sort((a, b) => b.value - a.value);

    return `
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-fade-in pointer-events-auto">
            <div class="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                <!-- Header -->
                <div class="p-8 bg-indigo-600 text-white flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="p-3 bg-white/20 rounded-2xl">
                            <i data-lucide="search-check" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-black tracking-tight">Consultoria de Perfil</h2>
                            <p class="text-xs font-bold text-white/60 uppercase tracking-widest">Análise Estratégica de Presença Digital</p>
                        </div>
                    </div>
                    <button onclick="state.showAuditPanel = false; state.selectedLeadForAudit = null; render();" class="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-8 space-y-8">
                    <!-- Company Info -->
                    <div class="flex flex-col md:flex-row gap-8 items-start">
                        ${lead.photoName ? `
                            <div class="w-full md:w-48 h-48 rounded-3xl overflow-hidden shadow-lg border border-slate-100 flex-shrink-0">
                                <img src="https://places.googleapis.com/v1/${lead.photoName}/media?key=${(state.googleMapsKey || "").trim().replace(/["']/g, '').replace(/\s/g, '')}&maxHeightPx=400&maxWidthPx=400" class="w-full h-full object-cover" alt="${lead.name}" referrerpolicy="no-referrer">
                            </div>
                        ` : `
                            <div class="w-full md:w-48 h-48 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="image" class="w-12 h-12 text-slate-200"></i>
                            </div>
                        `}
                        <div class="grid grid-cols-2 gap-6 flex-1">
                            <div class="space-y-1">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa Analisada</label>
                                <div class="text-lg font-black text-slate-900">${lead.name}</div>
                                <div class="text-[10px] font-bold text-slate-400 uppercase">${lead.category || lead.niche}</div>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score de Oportunidade</label>
                                <div class="flex items-center gap-2">
                                    <span class="px-3 py-1 rounded-full text-sm font-black ${colorClass}">🔥 ${score} / 100</span>
                                </div>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avaliação Atual</label>
                                <div class="flex items-center gap-2 text-sm font-bold text-slate-600">
                                    <i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>
                                    ${lead.rating} (${lead.reviews} avaliações)
                                </div>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ranking Google</label>
                                <div class="flex items-center gap-2">
                                    ${getRankingBadge(lead.ranking) || '<span class="text-xs font-bold text-slate-400 italic">Não verificado</span>'}
                                </div>
                            </div>
                            <div class="col-span-2 space-y-1">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</label>
                                <div class="text-xs font-bold text-slate-600 flex items-center gap-1">
                                    <i data-lucide="map-pin" class="w-3 h-3"></i>
                                    ${lead.address}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Consultative Analysis -->
                    <div class="space-y-6">
                        <div class="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                            <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Diagnóstico de Performance</h3>
                            <div class="grid grid-cols-1 gap-3">
                                ${sortedChecklist.map(item => `
                                    <div class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div class="p-2 ${item.value ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} rounded-xl">
                                            <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                                        </div>
                                        <div class="flex-1">
                                            <div class="text-[10px] font-black uppercase tracking-widest ${item.value ? 'text-emerald-600' : 'text-amber-600'} mb-0.5">
                                                ${item.value ? 'Ponto Forte' : 'Oportunidade'}
                                            </div>
                                            <div class="text-xs font-bold text-slate-700">${item.label}</div>
                                        </div>
                                        <i data-lucide="${item.value ? 'check-circle-2' : 'arrow-up-circle'}" class="w-5 h-5 ${item.value ? 'text-emerald-500' : 'text-amber-500'}"></i>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Strategic Summary -->
                        <div class="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                            <h3 class="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3">Resumo da Oportunidade</h3>
                            <p class="text-sm font-medium text-indigo-700 leading-relaxed italic">
                                "Com base no perfil atual, identificamos que ${lead.name} possui uma base sólida, mas pode escalar significativamente seus resultados digitais. 
                                ${score > 60 ? 'Há uma alta demanda reprimida que pode ser capturada com ajustes estratégicos no perfil e presença web.' : 'O foco deve ser em refinamentos de conversão e autoridade local para se destacar da concorrência.'}"
                            </p>
                        </div>

                        <!-- Strategic Recommendations -->
                        <div class="space-y-4">
                            <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">Recomendações Estratégicas</h3>
                            <div class="flex flex-wrap gap-2">
                                ${reasons.map(reason => `
                                    <span class="px-4 py-2 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm">
                                        <i data-lucide="zap" class="w-3 h-3 inline-block mr-1 text-amber-500"></i> ${reason}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button onclick="generateProspectingMessage('${lead.id}')" class="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                        <i data-lucide="message-square" class="w-4 h-4"></i>
                        GERAR MENSAGEM DE PROSPECÇÃO
                    </button>
                    <button onclick="openSiteGenerator('${lead.id}')" class="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                        <i data-lucide="layout" class="w-4 h-4"></i>
                        CRIAR SOLUÇÃO (SITE DEMO)
                    </button>
                </div>
            </div>
        </div>
    `;
}

function copyDemoLink() {
    if (!state.selectedLeadForSite) return;
    // For now, we'll copy the HTML to clipboard as a fallback or a data URL
    // A real link would require server-side hosting
    const blob = new Blob([state.siteDraft], { type: 'text/html' });
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        navigator.clipboard.writeText(dataUrl).then(() => {
            state.error = "Link da demo (Data URL) copiado! Cole no navegador para ver.";
            render();
        });
    };
    reader.readAsDataURL(blob);
}

window.toggleLeadSelection = toggleLeadSelection;
window.sendMessageAssistant = sendMessageAssistant;

window.openMeetingModal = (leadId) => {
    const lead = state.leads.find(l => l.id === leadId);
    if (lead) {
        state.selectedLeadForMeeting = lead;
        state.showMeetingModal = true;
        render();
    }
};

function saveMeeting(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const meeting = {
        id: Math.random().toString(36).substr(2, 9),
        leadId: state.selectedLeadForMeeting?.id || null,
        nome: formData.get('nome'),
        whatsapp: formData.get('whatsapp'),
        data: formData.get('data'),
        hora: formData.get('hora'),
        tipo: formData.get('tipo'),
        observacoes: formData.get('observacoes'),
        status: 'marcada',
        createdAt: new Date().toISOString()
    };
    
    state.meetings.push(meeting);
    saveMeetings();
    state.showMeetingModal = false;
    state.selectedLeadForMeeting = null;
    state.error = "Reunião agendada com sucesso!";
    render();
}

function deleteMeeting(id) {
    if (confirm("Excluir esta reunião?")) {
        state.meetings = state.meetings.filter(m => m.id !== id);
        saveMeetings();
        render();
    }
}

window.saveMeeting = saveMeeting;
window.updateMeetingStatus = updateMeetingStatus;
window.deleteMeeting = deleteMeeting;

window.updateStatus = (id, status) => {
    const index = state.leads.findIndex(l => l.id === id);
    if (index !== -1) {
        state.leads[index].status = status;
        saveLeads();
        render();
    }
};

window.deleteLead = (id) => {
    if (confirm("Excluir este lead?")) {
        state.leads = state.leads.filter(l => l.id !== id);
        saveLeads();
        render();
    }
};

window.diagnoseMapsAPI = diagnoseMapsAPI;
window.diagnoseGeminiAPI = diagnoseGeminiAPI;
window.verifyKeys = verifyKeys;
window.saveSettings = saveSettings;

function getDemoLibraryHTML() {
    if (!state.showDemoLibrary) return "";
    
    return `
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-slate-900/80 backdrop-blur-md animate-fade-in pointer-events-auto">
            <div class="bg-white w-full max-w-6xl h-full rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-scale-up">
                <!-- Header -->
                <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div class="flex items-center gap-4">
                        <div class="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                            <i data-lucide="library" class="w-8 h-8"></i>
                        </div>
                        <div>
                            <h2 class="text-3xl font-black tracking-tight text-slate-900">Biblioteca de Demos</h2>
                            <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">Gerencie seus sites de demonstração</p>
                        </div>
                    </div>
                    <button onclick="state.showDemoLibrary = false; render();" class="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    ${state.demoLibrary.length === 0 ? `
                        <div class="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div class="w-32 h-32 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center">
                                <i data-lucide="layout" class="w-16 h-16"></i>
                            </div>
                            <div class="space-y-2">
                                <h3 class="text-2xl font-black text-slate-900">Nenhum site gerado ainda</h3>
                                <p class="text-slate-500 font-medium max-w-md">Comece gerando um site demo para um de seus leads na lista principal.</p>
                            </div>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            ${state.demoLibrary.map(site => `
                                <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                                    <div class="h-48 bg-slate-100 relative overflow-hidden">
                                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent z-10"></div>
                                        <div class="absolute top-4 right-4 z-20">
                                            <span class="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/30">
                                                ${site.mode === 'clone' ? 'IA Clone' : site.mode === 'template' ? 'Template' : 'Auto'}
                                            </span>
                                        </div>
                                        <div class="absolute bottom-4 left-6 z-20">
                                            <h4 class="text-white font-black text-xl truncate max-w-[200px]">${site.leadName}</h4>
                                            <p class="text-white/70 text-xs font-bold uppercase tracking-widest">${site.category}</p>
                                        </div>
                                    </div>
                                    <div class="p-8 space-y-6">
                                        <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            <span>Criado em</span>
                                            <span>${new Date(site.date).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div class="flex gap-3">
                                            <button onclick="previewLibrarySite('${site.id}')" class="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                                <i data-lucide="eye" class="w-4 h-4"></i> Visualizar
                                            </button>
                                            <button onclick="duplicateLibrarySite('${site.id}')" class="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                                                <i data-lucide="copy" class="w-5 h-5"></i>
                                            </button>
                                            <button onclick="deleteLibrarySite('${site.id}')" class="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function previewLibrarySite(siteId) {
    const site = state.demoLibrary.find(s => s.id === siteId);
    if (!site) return;
    
    const lead = state.leads.find(l => l.id === site.leadId) || { name: site.leadName, category: site.category };
    state.selectedLeadForSite = lead;
    state.siteDraft = site.html;
    state.siteGenerationMode = site.mode;
    state.showDemoLibrary = false;
    render();
}

function duplicateLibrarySite(siteId) {
    const site = state.demoLibrary.find(s => s.id === siteId);
    if (!site) return;
    
    const newSite = {
        ...site,
        id: Date.now().toString(),
        date: new Date().toISOString(),
        leadName: `${site.leadName} (Cópia)`
    };
    state.demoLibrary.unshift(newSite);
    saveDemoLibrary();
    render();
}

function deleteLibrarySite(siteId) {
    if (!confirm('Tem certeza que deseja excluir este site?')) return;
    state.demoLibrary = state.demoLibrary.filter(s => s.id !== siteId);
    saveDemoLibrary();
    render();
}

// --- Export functions to window for HTML event handlers ---
window.render = render;
window.startRegionalSearch = startRegionalSearch;
window.startSmartProspectingMode = startSmartProspectingMode;
window.searchLeads = searchLeads;
window.openAuditPanel = openAuditPanel;
window.toggleLeadSelection = toggleLeadSelection;
window.downloadCSV = downloadCSV;
window.enrichLeads = enrichLeads;
window.openMeetingModal = openMeetingModal;
window.openSiteGenerator = openSiteGenerator;
window.copyProspectingMessage = copyProspectingMessage;
window.saveSettings = saveSettings;
window.verifyKeys = verifyKeys;
window.diagnoseGeminiAPI = diagnoseGeminiAPI;
window.diagnoseMapsAPI = diagnoseMapsAPI;
window.checkRanking = checkRanking;
window.updateMeetingStatus = updateMeetingStatus;
window.startSmartProspecting = startSmartProspecting;
window.previewLibrarySite = previewLibrarySite;
window.duplicateLibrarySite = duplicateLibrarySite;
window.deleteLibrarySite = deleteLibrarySite;
window.generateDemoSite = generateDemoSite;
window.saveDemoLibrary = saveDemoLibrary;
window.saveLeads = saveLeads;
window.saveMeetings = saveMeetings;
window.initAI = initAI;
window.sendMessageAssistant = sendMessageAssistant;
window.toggleChatbot = toggleChatbot;
window.saveChatbotSettings = saveChatbotSettings;
window.simulateChatbotMessage = simulateChatbotMessage;
window.toggleEconomyMode = toggleEconomyMode;
window.renderChatbot = renderChatbot;

// --- Initial Render ---
render();
