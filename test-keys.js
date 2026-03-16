import { GoogleGenAI } from "@google/genai";

async function testKeys() {
    console.log("--- Verificando Chaves de API ---");
    
    // Test Gemini
    try {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            console.log("❌ Gemini: Chave não encontrada (GEMINI_API_KEY)");
        } else {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: "Diga 'OK'"
            });
            if (response.text) {
                console.log("✅ Gemini: Chave válida e funcionando.");
            } else {
                console.log("❌ Gemini: Resposta vazia.");
            }
        }
    } catch (error) {
        console.log(`❌ Gemini: Erro - ${error.message}`);
    }

    // Test Google Maps
    try {
        const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!mapsKey) {
            console.log("❌ Google Maps: Chave não encontrada (GOOGLE_MAPS_API_KEY)");
        } else {
            const url = 'https://places.googleapis.com/v1/places:searchText';
            const response = await fetch(url, {
                method: 'POST',
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
            const data = await response.json();
            
            if (response.ok) {
                console.log("✅ Google Maps: Chave válida (Places API New OK).");
            } else {
                console.log(`❌ Google Maps: Erro ${response.status} - ${data.error?.message || 'Verifique as permissões.'}`);
            }
        }
    } catch (error) {
        console.log(`❌ Google Maps: Erro - ${error.message}`);
    }
    console.log("-------------------------------");
}

testKeys();
