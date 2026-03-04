import { GoogleGenAI } from "https://esm.sh/@google/genai";

// --- Configuration & Constants ---
const NICHES = [
    "Dentistas", "Oficinas Mecânicas", "Pet Shops", "Restaurantes", 
    "Academias", "Salões de Beleza", "Clínicas Médicas", "Padarias", 
    "Escolas de Idiomas", "Imobiliárias", "Vidraçarias", "Marmorarias"
];

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
    filterStatus: "Todos",
    filterType: "Todos",
    enriching: false,
    onlyWeakProfiles: true,
    totalFound: 0,
    totalNoWebsite: 0,
    selectedLeadForSite: null,
    siteDraft: "",
    isGeneratingSite: false,
    showAssistant: false,
    selectedLeads: [], // IDs of leads selected for campaign
    campaignMessage: "Olá {nome}, vi que sua empresa no Google Maps está sem site. Podemos conversar sobre como um site profissional pode aumentar seus clientes?",
    campaignInterval: 15,
    campaignRunning: false,
    campaignProgress: { sent: 0, total: 0 },
    assistantMessages: [
        { 
            role: 'model', 
            text: "Olá Hugo! Sou seu assistente do CRM Miner – Campinas Edition. Estou aqui para acelerar sua prospecção.\n\nMenu inicial:\n1) Buscar novos leads\n2) Analisar empresa (Google Maps)\n3) Criar mensagem de prospecção\n4) Organizar meus leads\n\nComo posso te ajudar agora?" 
        }
    ],
    assistantInput: "",
    isAssistantTyping: false
};

// --- API Initialization ---
let ai = null;

async function initAI() {
    try {
        console.log("Fetching config from /api/config...");
        const response = await fetch('/api/config');
        const config = await response.json();
        if (config.apiKey) {
            console.log("API Key found in server config");
            ai = new GoogleGenAI({ apiKey: config.apiKey });
            console.log("AI Initialized successfully");
        } else {
            console.warn("API Key NOT found in server config (process.env.GEMINI_API_KEY is likely empty)");
        }
    } catch (err) {
        console.error("Failed to fetch config from server:", err);
    }
}

// Initialize on load
initAI();

// --- Utilities ---
function cleanPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.length > 0 && !cleaned.startsWith('55')) {
        cleaned = '55' + cleaned;
    }
    return cleaned;
}

function getGMNQuality(lead) {
    const reviews = parseInt(lead.reviews) || 0;
    const photos = lead.photosCount || 0;
    const ranking = lead.ranking || 0;
    const hasWebsite = !!lead.website;

    if (reviews > 150 && photos > 40 && ranking > 0 && ranking <= 3) return 'GMN FORTE';
    if (reviews >= 30 && reviews <= 100 && photos >= 10 && photos <= 30 && ranking >= 5 && ranking <= 10) return 'GMN MÉDIO';
    if (reviews < 30 && photos < 10 && !hasWebsite && ranking > 10) return 'GMN FRACO';
    
    if (reviews < 30 || photos < 10) return 'GMN FRACO';
    return 'GMN MÉDIO';
}

function getOpportunity(lead) {
    const quality = getGMNQuality(lead);
    const hasWebsite = !!lead.website;
    const hasSocial = !!lead.phone || !!lead.instagram;

    if (!hasWebsite && quality === 'GMN FRACO' && hasSocial) return '🔥 ALTA OPORTUNIDADE';
    if (!hasWebsite && quality === 'GMN MÉDIO') return '⚠️ MÉDIA OPORTUNIDADE';
    if (hasWebsite || quality === 'GMN FORTE') return '❌ BAIXA OPORTUNIDADE';
    
    return '⚠️ MÉDIA OPORTUNIDADE';
}

function saveLeads() {
    localStorage.setItem('crm_leads', JSON.stringify(state.leads));
}

// --- Core Logic ---
async function searchLeads() {
    console.log("Search initiated for:", state.niche, "in", state.city);
    
    if (!state.city || !state.niche) {
        state.error = "Por favor, preencha o nicho e a cidade.";
        render();
        return;
    }

    if (!ai) {
        console.log("AI not initialized, attempting to init...");
        await initAI();
        if (!ai) {
            const manualKey = prompt("API Key não encontrada no servidor. Insira sua Gemini API Key manualmente:");
            if (manualKey) {
                ai = new GoogleGenAI({ apiKey: manualKey });
            } else {
                state.error = "API Key é necessária para realizar a busca.";
                render();
                return;
            }
        }
    }

    state.loading = true;
    state.stopSearch = false;
    state.error = null;
    state.totalFound = 0;
    state.totalNoWebsite = 0;
    state.view = 'dashboard';
    render();

    const targetNiche = state.customNiche || state.niche;
    const seenNames = new Set(state.leads.map(l => l.name));
    const zonesToSearch = state.city.toLowerCase().includes("campinas") ? CAMPINAS_ZONES : [state.city];

    try {
        for (const zone of zonesToSearch) {
            if (state.stopSearch) break;
            state.currentZone = zone;
            render();
            
            console.log("Searching zone:", zone);
            
            const promptText = state.searchStrategy === 'no-site' 
                ? `Busque por TODAS as empresas de "${targetNiche}" em ${zone}, ${state.city}, SP no Google Maps. 
                  Para cada empresa, tente identificar também o Instagram oficial e o link direto de WhatsApp (wa.me).
                  Se a empresa tiver um website, verifique se há links de redes sociais nele.
                  Retorne APENAS um JSON array de objetos com as chaves: "name", "address", "city", "phone", "rating", "reviews", "mapsLink", "ranking", "website", "photosCount", "instagram_url", "whatsapp_url", "tem_whatsapp", "tem_instagram".`
                : `Busque por TODAS as empresas de "${targetNiche}" em ${zone}, ${state.city}, SP no Google Maps. 
                  FOQUE EM EMPRESAS COM PÉSSIMA REPUTAÇÃO. Tente encontrar Instagram e WhatsApp.
                  Retorne APENAS um JSON array de objetos com as chaves: "name", "address", "city", "phone", "rating", "reviews", "mapsLink", "ranking", "website", "photosCount", "instagram_url", "whatsapp_url", "tem_whatsapp", "tem_instagram".`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: promptText,
                config: { tools: [{ googleMaps: {} }] },
            });

            console.log("Response received from Gemini");

            try {
                let text = response.text || "[]";
                // Clean markdown if present
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const data = JSON.parse(text);
                
                if (Array.isArray(data)) {
                    console.log(`Found ${data.length} leads in ${zone}`);
                    state.totalFound += data.length;
                    data.forEach(item => {
                        const hasWebsite = !!(item.website || item.websiteUri || item.url || item.site);
                        if (hasWebsite) return;
                        state.totalNoWebsite += 1;

                        if (item.name && !seenNames.has(item.name)) {
                            seenNames.add(item.name);
                            state.leads.push({
                                id: Math.random().toString(36).substr(2, 9),
                                name: item.name || "N/A",
                                address: item.address || "N/A",
                                city: item.city || zone,
                                phone: cleanPhoneNumber(item.phone || ""),
                                rating: item.rating || "N/A",
                                reviews: item.reviews || "0",
                                mapsLink: item.mapsLink || "#",
                                ranking: item.ranking || 0,
                                website: item.website || "",
                                photosCount: item.photosCount || 0,
                                instagram_url: item.instagram_url || "",
                                whatsapp_url: item.whatsapp_url || "",
                                tem_whatsapp: !!(item.whatsapp_url || item.tem_whatsapp),
                                tem_instagram: !!(item.instagram_url || item.tem_instagram),
                                type: state.searchStrategy === 'poor-gmn' ? 'GMN' : 'Site',
                                value: 0,
                                status: 'Novo lead'
                            });
                        }
                    });
                    saveLeads();
                    render();
                }
            } catch (e) {
                console.error("Parse error", e, response.text);
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (err) {
        state.error = "Erro na busca. Verifique sua chave ou cota do Google Maps.";
        console.error("Search error:", err);
    } finally {
        state.loading = false;
        state.stopSearch = false;
        state.currentZone = "";
        render();
    }
}

function downloadCSV() {
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
    const app = document.getElementById('app');
    if (state.view === 'home') {
        renderHome(app);
    } else if (state.view === 'dashboard') {
        renderDashboard(app);
    } else if (state.view === 'campaigns') {
        renderCampaigns(app);
    }
    
    // Clear existing errors
    const existingErrors = document.querySelectorAll('.system-error');
    existingErrors.forEach(el => el.remove());

    // Render error if exists
    if (state.error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = "system-error fixed bottom-6 right-6 z-[100] animate-slide-up";
        errorDiv.innerHTML = `
            <div class="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
                <i data-lucide="alert-circle" class="w-5 h-5 text-red-500"></i>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest opacity-70">Aviso do Sistema</span>
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
                        ${state.leads.length > 0 ? `
                            <button id="nav-crm-btn" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest">
                                ABRIR MEU CRM
                            </button>
                        ` : `
                            <button class="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black hover:bg-indigo-100 transition-all uppercase tracking-widest">
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
                <div class="max-w-4xl mx-auto mt-20 p-3 bg-slate-100/40 rounded-[3rem] border border-slate-200/60 shadow-2xl backdrop-blur-sm">
                    <div class="bg-white p-10 md:p-14 rounded-[2.8rem] space-y-10 shadow-inner">
                        <div class="grid md:grid-cols-2 gap-8">
                            <div class="space-y-3 text-left">
                                <label class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nicho de Atuação</label>
                                <div class="relative group">
                                    <select id="niche-select" class="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all appearance-none cursor-pointer shadow-sm group-hover:bg-white">
                                        ${NICHES.map(n => `<option value="${n}" ${state.niche === n ? 'selected' : ''}>${n}</option>`).join('')}
                                    </select>
                                    <i data-lucide="chevron-down" class="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors"></i>
                                </div>
                            </div>
                            <div class="space-y-3 text-left">
                                <label class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Cidade Alvo</label>
                                <div class="relative group">
                                    <input id="city-input" type="text" value="${state.city}" placeholder="Ex: Campinas, SP" class="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all shadow-sm group-hover:bg-white" />
                                    <i data-lucide="map-pin" class="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors"></i>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center justify-center md:justify-start gap-4">
                            <label class="flex items-center gap-4 cursor-pointer group">
                                <div class="relative flex items-center">
                                    <input id="weak-toggle" type="checkbox" ${state.onlyWeakProfiles ? 'checked' : ''} class="peer sr-only" />
                                    <div class="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all duration-300"></div>
                                    <div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-5 shadow-md"></div>
                                </div>
                                <span class="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">Apenas perfis fracos (poucas avaliações / nota baixa)</span>
                            </label>
                        </div>

                        <button id="search-btn" class="w-full py-6 bg-gradient-saas hover:scale-[1.01] active:scale-[0.99] text-white rounded-[1.5rem] font-black text-lg tracking-tight transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed" ${state.loading ? 'disabled' : ''}>
                            ${state.loading ? `
                                <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
                                INICIANDO BUSCA...
                            ` : `
                                <i data-lucide="zap" class="w-6 h-6 fill-white group-hover:animate-pulse"></i>
                                ENCONTRAR CLIENTES AGORA
                            `}
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
    const nicheSelect = document.getElementById('niche-select');
    if (nicheSelect) nicheSelect.onchange = (e) => state.niche = e.target.value;
    
    const cityInput = document.getElementById('city-input');
    if (cityInput) cityInput.oninput = (e) => state.city = e.target.value;
    
    const weakToggle = document.getElementById('weak-toggle');
    if (weakToggle) weakToggle.onchange = (e) => state.onlyWeakProfiles = e.target.checked;
    
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.onclick = (e) => {
            e.preventDefault();
            console.log("Search button clicked");
            searchLeads();
        };
    }
    
    const navCrmBtn = document.getElementById('nav-crm-btn');
    if (navCrmBtn) {
        navCrmBtn.onclick = () => { state.view = 'dashboard'; render(); };
    }
}

function renderCampaigns(container) {
    const selectedLeadsList = state.leads.filter(l => state.selectedLeads.includes(l.id));
    
    container.innerHTML = `
        <div class="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-slate-50">
            <!-- Sidebar (Same as Dashboard) -->
            <aside class="lg:col-span-3 bg-white border-r border-slate-200 p-6 space-y-8 overflow-y-auto lg:h-screen sticky top-0">
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
                    <nav class="space-y-1">
                        <button id="nav-dash-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
                            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                            Dashboard
                        </button>
                        <button id="nav-campaign-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-600 transition-all">
                            <i data-lucide="send" class="w-5 h-5"></i>
                            Campanhas
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
                                    <textarea id="campaign-msg" class="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium min-h-[150px] focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" placeholder="Use {nome} para personalizar..."> ${state.campaignMessage}</textarea>
                                    <p class="text-[10px] text-slate-400 font-bold italic">Dica: Use {nome} para inserir o nome da empresa automaticamente.</p>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Intervalo (segundos)</label>
                                        <input id="campaign-interval" type="number" value="${state.campaignInterval}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[11px] font-black uppercase tracking-widest text-slate-400">Anexar Imagem (URL)</label>
                                        <input id="campaign-image" type="text" placeholder="https://..." class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    </div>
                                </div>

                                <button id="start-campaign-btn" class="w-full py-5 ${state.campaignRunning ? 'bg-red-500' : 'bg-indigo-600'} text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50" ${selectedLeadsList.length === 0 ? 'disabled' : ''}>
                                    ${state.campaignRunning ? '<i data-lucide="square" class="w-5 h-5"></i> PARAR CAMPANHA' : '<i data-lucide="play" class="w-5 h-5"></i> INICIAR CAMPANHA'}
                                </button>
                                ${selectedLeadsList.length === 0 ? '<p class="text-center text-xs font-bold text-red-500">Selecione leads no Dashboard para iniciar.</p>' : ''}
                            </div>
                        </div>

                        <!-- Progress Stats -->
                        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                            <div class="grid grid-cols-3 gap-8">
                                <div class="text-center space-y-1">
                                    <div class="text-3xl font-black text-slate-900">${selectedLeadsList.length}</div>
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Leads</div>
                                </div>
                                <div class="text-center space-y-1">
                                    <div class="text-3xl font-black text-emerald-600">${state.campaignProgress.sent}</div>
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviados</div>
                                </div>
                                <div class="text-center space-y-1">
                                    <div class="text-3xl font-black text-indigo-600">${selectedLeadsList.length - state.campaignProgress.sent}</div>
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendentes</div>
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
                                    <button onclick="toggleLeadSelection('${lead.id}')" class="p-2 text-slate-300 hover:text-red-500 transition-colors">
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
    
    document.getElementById('campaign-msg').oninput = (e) => state.campaignMessage = e.target.value;
    document.getElementById('campaign-interval').oninput = (e) => state.campaignInterval = parseInt(e.target.value) || 0;
    
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
        const imageUrl = document.getElementById('campaign-image')?.value;
        if (imageUrl) {
            message += `\n\nVeja esta imagem: ${imageUrl}`;
        }
        const phone = lead.phone;
        
        if (phone) {
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            
            state.campaignProgress.sent++;
            render();
            
            // Wait for interval
            if (state.campaignProgress.sent < leadsToMessage.length) {
                await new Promise(resolve => setTimeout(resolve, state.campaignInterval * 1000));
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
function renderDashboard(container) {
    // Prioritization logic: WhatsApp > Phone > No Website
    const sortedLeads = [...state.leads].sort((a, b) => {
        const scoreA = (a.tem_whatsapp ? 100 : 0) + (a.phone ? 50 : 0) + (!a.website ? 25 : 0);
        const scoreB = (b.tem_whatsapp ? 100 : 0) + (b.phone ? 50 : 0) + (!b.website ? 25 : 0);
        return scoreB - scoreA;
    });

    const filteredLeads = sortedLeads.filter(l => {
        const statusMatch = state.filterStatus === "Todos" || l.status === state.filterStatus;
        const typeMatch = state.filterType === "Todos" || l.type === state.filterType;
        let weakMatch = true;
        if (state.onlyWeakProfiles) {
            const reviews = parseInt(l.reviews) || 0;
            const rating = parseFloat(l.rating) || 0;
            weakMatch = reviews <= 50 || rating <= 4.5 || !l.reviews || !l.rating;
        }
        return statusMatch && typeMatch && weakMatch;
    });

    container.innerHTML = `
        <div class="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-slate-50">
            <!-- Sidebar -->
            <aside class="lg:col-span-3 bg-white border-r border-slate-200 p-6 space-y-8 overflow-y-auto lg:h-screen sticky top-0">
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
                    <nav class="space-y-1">
                        <button id="nav-dash-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${state.view === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'} transition-all">
                            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                            Dashboard
                        </button>
                        <button id="nav-campaign-btn" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${state.view === 'campaigns' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'} transition-all">
                            <i data-lucide="send" class="w-5 h-5"></i>
                            Campanhas
                        </button>
                    </nav>

                    <div class="space-y-4 pt-4 border-t border-slate-100">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nicho</label>
                            <select id="dash-niche" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                                ${NICHES.map(n => `<option value="${n}" ${state.niche === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cidade</label>
                            <input id="dash-city" type="text" value="${state.city}" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div class="py-2">
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input id="dash-weak" type="checkbox" ${state.onlyWeakProfiles ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600" />
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Apenas perfis fracos</span>
                            </label>
                        </div>
                        <button id="dash-search-btn" class="w-full py-4 ${state.loading ? 'bg-red-500' : 'bg-indigo-600'} text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3">
                            ${state.loading ? '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> PARAR' : '<i data-lucide="search" class="w-5 h-5"></i> MINERAR'}
                        </button>
                    </div>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="lg:col-span-9 p-6 space-y-6">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-3rem)]">
                    <div class="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div class="flex items-center gap-6">
                            <div class="flex items-center gap-2">
                                <i data-lucide="filter" class="w-4 h-4 text-slate-400"></i>
                                <h2 class="font-bold text-sm">Gestão de Leads</h2>
                            </div>
                            <div class="flex items-center gap-4 text-xs text-slate-400 font-medium">
                                <span>Encontrados: <b class="text-slate-900">${state.totalFound}</b></span>
                                <span>Sem site: <b class="text-slate-900">${state.totalNoWebsite}</b></span>
                                <span>Exibindo: <b class="text-indigo-600">${filteredLeads.length}</b></span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <button id="export-btn" class="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20">
                                <i data-lucide="download" class="w-4 h-4"></i> Exportar CSV
                            </button>
                        </div>
                    </div>

                    <div class="flex-1 overflow-auto table-container">
                        ${filteredLeads.length > 0 ? `
                            <table class="w-full text-left border-collapse min-w-[1000px]">
                                <thead class="bg-slate-50/50 sticky top-0 z-10">
                                    <tr>
                                        <th class="p-4 border-b">
                                            <input type="checkbox" onchange="toggleAllLeads(this.checked)" class="w-4 h-4 rounded border-slate-300 text-indigo-600" ${filteredLeads.length > 0 && filteredLeads.every(l => state.selectedLeads.includes(l.id)) ? 'checked' : ''} />
                                        </th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Nome</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Contato</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Cidade</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Telefone</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Nota</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Qualidade</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Oportunidade</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b">Status</th>
                                        <th class="text-[10px] font-black uppercase text-slate-400 border-b text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${filteredLeads.map(lead => `
                                        <tr>
                                            <td class="p-4">
                                                <input type="checkbox" onchange="toggleLeadSelection('${lead.id}')" class="w-4 h-4 rounded border-slate-300 text-indigo-600" ${state.selectedLeads.includes(lead.id) ? 'checked' : ''} />
                                            </td>
                                            <td class="font-bold text-sm text-slate-900">${lead.name}</td>
                                            <td class="text-xs">
                                                <div class="flex items-center gap-2">
                                                    ${lead.tem_whatsapp ? `
                                                        <span class="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-black text-[9px] uppercase tracking-tighter">
                                                            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                            WhatsApp
                                                        </span>
                                                    ` : lead.phone ? `
                                                        <span class="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg font-black text-[9px] uppercase tracking-tighter">
                                                            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                                            Telefone
                                                        </span>
                                                    ` : `
                                                        <span class="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg font-black text-[9px] uppercase tracking-tighter">
                                                            <span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                            Sem Contato
                                                        </span>
                                                    `}
                                                </div>
                                            </td>
                                            <td class="text-xs text-slate-500">${lead.city}</td>
                                            <td class="text-xs font-mono text-slate-600">${lead.phone}</td>
                                            <td class="text-xs">
                                                <div class="flex items-center gap-1">
                                                    <i data-lucide="star" class="w-3 h-3 text-amber-400 fill-amber-400"></i>
                                                    <span class="font-bold">${lead.rating}</span>
                                                    <span class="text-slate-400">(${lead.reviews})</span>
                                                </div>
                                            </td>
                                            <td class="text-[10px] font-black">
                                                <span class="px-2 py-1 rounded-md ${getGMNQuality(lead) === 'GMN FORTE' ? 'bg-emerald-50 text-emerald-600' : getGMNQuality(lead) === 'GMN MÉDIO' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}">
                                                    ${getGMNQuality(lead)}
                                                </span>
                                            </td>
                                            <td class="text-[10px] font-black">
                                                <span class="px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                                                    ${getOpportunity(lead)}
                                                </span>
                                            </td>
                                            <td>
                                                <select onchange="updateStatus('${lead.id}', this.value)" class="text-[10px] font-bold p-1 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                                                    ${['Novo lead', 'Mensagem enviada', 'Respondeu', 'Cliente fechado', 'Não interessado'].map(s => `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                                </select>
                                            </td>
                                            <td class="text-right">
                                                <div class="flex items-center justify-end gap-2">
                                                    ${lead.whatsapp_url ? `
                                                        <a href="${lead.whatsapp_url}" target="_blank" class="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors" title="WhatsApp">
                                                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                                                        </a>
                                                    ` : ''}
                                                    ${lead.instagram_url ? `
                                                        <a href="${lead.instagram_url}" target="_blank" class="p-2 bg-pink-50 hover:bg-pink-100 rounded-lg text-pink-600 transition-colors" title="Instagram">
                                                            <i data-lucide="instagram" class="w-4 h-4"></i>
                                                        </a>
                                                    ` : ''}
                                                    <a href="${lead.mapsLink}" target="_blank" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400" title="Google Maps"><i data-lucide="map-pin" class="w-4 h-4"></i></a>
                                                    <button onclick="deleteLead('${lead.id}')" class="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500" title="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="h-full flex flex-col items-center justify-center text-center p-12">
                                <i data-lucide="building-2" class="w-12 h-12 text-slate-200 mb-4"></i>
                                <h3 class="font-bold text-slate-400">Nenhum lead encontrado</h3>
                                <p class="text-sm text-slate-400 mt-2">Ajuste os filtros ou inicie uma nova mineração.</p>
                            </div>
                        `}
                    </div>
                </div>
            </main>
        </div>
    `;

    // Event Listeners
    document.getElementById('logo-btn').onclick = () => { state.view = 'home'; render(); };
    document.getElementById('home-btn').onclick = () => { state.view = 'home'; render(); };
    
    const navDashBtn = document.getElementById('nav-dash-btn');
    if (navDashBtn) navDashBtn.onclick = () => { state.view = 'dashboard'; render(); };
    
    const navCampaignBtn = document.getElementById('nav-campaign-btn');
    if (navCampaignBtn) navCampaignBtn.onclick = () => { state.view = 'campaigns'; render(); };

    document.getElementById('dash-niche').onchange = (e) => state.niche = e.target.value;
    document.getElementById('dash-city').oninput = (e) => state.city = e.target.value;
    document.getElementById('dash-weak').onchange = (e) => state.onlyWeakProfiles = e.target.checked;
    document.getElementById('dash-search-btn').onclick = () => {
        if (state.loading) state.stopSearch = true;
        else searchLeads();
    };
    document.getElementById('export-btn').onclick = downloadCSV;
}

// --- Global Actions for Inline Events ---
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

// --- Initial Render ---
render();
