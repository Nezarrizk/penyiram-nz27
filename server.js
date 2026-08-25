import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Initialize Gemini API client
let ai = null;
function getGeminiClient() {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// Number word converter for Indonesian
function parseIndonesianNumber(text) {
  if (!text) return null;
  const numMap = {
    'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
    'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
    'sebelas': 11, 'dua belas': 12, 'tiga belas': 13, 'empat belas': 14, 'lima belas': 15,
    'enam belas': 16, 'tujuh belas': 17, 'delapan belas': 18, 'sembilan belas': 19,
    'dua puluh': 20, 'dua puluh satu': 21, 'dua puluh dua': 22, 'dua puluh tiga': 23, 'dua puluh empat': 24, 'dua puluh lima': 25,
    'tiga puluh': 30, 'sebulan': 30, 'seminggu': 7, 'dua minggu': 14, 'tiga minggu': 21
  };

  // Direct digits
  const digitMatch = text.match(/(\d{1,3})/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  // Word matching
  for (const [word, val] of Object.entries(numMap)) {
    if (text.includes(word)) {
      return val;
    }
  }
  return null;
}

// Fallback Rule-Based NLP Parser for Instant High-Reliability Voice Recognition
function fallbackVoiceParser(command, currentState) {
  const text = (command || '').toLowerCase().trim();
  const moisture = currentState?.kelembapan ?? 45;
  const status = currentState?.status ?? 'Ideal';
  const pumpOn = currentState?.manual === true;
  const fertilizer = currentState?.jadwalPupuk ?? 6;

  // 1. Turn ON Pump
  if (
    text.includes('nyalakan') ||
    text.includes('hidupkan') ||
    text.includes('aktifkan') ||
    text.includes('putar') ||
    text.includes('siram') ||
    text.includes('buka air') ||
    text.includes('buka kran') ||
    text.includes('buka pompa') ||
    text.includes('nyala') ||
    text.includes('on kan') ||
    text.includes('on-kan') ||
    text.includes('turn on') ||
    text.includes('start')
  ) {
    // Check if it's not a negation or query
    if (!text.includes('mati') && !text.includes('tidak') && !text.includes('jangan') && !text.includes('stop') && !text.includes('berhenti')) {
      return {
        action: 'PUMP_ON',
        params: {},
        speechText: 'Baik, relay pompa air segera dinyalakan untuk irigasi.',
        displayText: 'Perintah Diterima: Menyalakan Relay Pompa Air (Manual ON).',
        confidence: 0.98
      };
    }
  }

  // 2. Turn OFF Pump
  if (
    text.includes('matikan') ||
    text.includes('hentikan') ||
    text.includes('stop') ||
    text.includes('nonaktif') ||
    text.includes('mati') ||
    text.includes('berhenti') ||
    text.includes('tutup air') ||
    text.includes('tutup kran') ||
    text.includes('off kan') ||
    text.includes('off-kan') ||
    text.includes('turn off') ||
    text.includes('selesai menyiram') ||
    text.includes('sudah cukup')
  ) {
    return {
      action: 'PUMP_OFF',
      params: {},
      speechText: 'Siap, pompa air telah dimatikan. Sistem kembali ke mode siaga.',
      displayText: 'Perintah Diterima: Mematikan Relay Pompa Air (Manual OFF).',
      confidence: 0.98
    };
  }

  // 3. Set Fertilizer Schedule (Flexible days, weeks, months, phrases)
  if (
    text.includes('pupuk') ||
    text.includes('jadwal') ||
    text.includes('nutrisi') ||
    text.includes('siklus') ||
    text.includes('hari') ||
    text.includes('minggu')
  ) {
    const extractedNum = parseIndonesianNumber(text);
    if (extractedNum !== null) {
      const days = Math.max(1, Math.min(365, extractedNum));
      return {
        action: 'SET_FERTILIZER',
        params: { days },
        speechText: `Siklus pemupukan berhasil diubah menjadi setiap ${days} hari sekali.`,
        displayText: `Perintah Diterima: Mengatur Jadwal Pemupukan ke ${days} Hari.`,
        confidence: 0.95
      };
    }
  }

  // 4. Simulate Rain / Test
  if (text.includes('hujan') || text.includes('simulasi') || text.includes('tes basah')) {
    return {
      action: 'SIMULATE_RAIN',
      params: {},
      speechText: 'Menjalankan simulasi presipitasi hujan dengan saturasi tanah 88 persen.',
      displayText: 'Perintah Diterima: Menjalankan Simulasi Cuaca Hujan.',
      confidence: 0.95
    };
  }

  // 5. Query Status / Moisture
  if (
    text.includes('kelembapan') ||
    text.includes('status') ||
    text.includes('kondisi') ||
    text.includes('berapa') ||
    text.includes('cek') ||
    text.includes('lihat') ||
    text.includes('laporan') ||
    text.includes('tanah')
  ) {
    let advice = "Kondisi tanah sangat ideal untuk pertumbuhan tanaman.";
    if (moisture < 35) advice = "Tanah terdeteksi kering, disarankan untuk melakukan penyiraman.";
    else if (moisture > 70) advice = "Tanah cukup basah, penyiraman dapat ditunda.";

    return {
      action: 'QUERY_STATUS',
      params: {},
      speechText: `Kelembapan tanah saat ini adalah ${moisture} persen dengan status ${status}. Pompa sedang ${pumpOn ? 'aktif' : 'mati'}. ${advice}`,
      displayText: `Telemetri Lapangan: Kelembapan ${moisture}% (${status}), Pompa ${pumpOn ? 'ON' : 'OFF'}. ${advice}`,
      confidence: 0.92
    };
  }

  // 6. Generic Watering Intent
  if (text.includes('air') || text.includes('haus') || text.includes('kering')) {
    if (moisture < 35) {
      return {
        action: 'PUMP_ON',
        params: {},
        speechText: `Kelembapan tanah rendah (${moisture}%). Saya akan menyalakan pompa untuk menyiram tanaman sekarang.`,
        displayText: `Analisis Agronomi: Kelembapan kritis (${moisture}%). Memulai penyiraman otomatis.`,
        confidence: 0.9
      };
    } else {
      return {
        action: 'CONSULTATION',
        params: {},
        speechText: `Saat ini kelembapan tanah masih cukup optimal yaitu ${moisture} persen. Tanaman belum perlu disiram.`,
        displayText: `Analisis Agronomi: Kelembapan ${moisture}% masih mencukupi. Pompa tetap siaga.`,
        confidence: 0.9
      };
    }
  }

  // Default response
  return {
    action: 'CONSULTATION',
    params: {},
    speechText: `Saya menerima: "${command}". Anda dapat mengontrol pompa dengan berkata "Nyalakan pompa", "Matikan pompa", "Atur jadwal pupuk 7 hari", atau "Cek kelembapan".`,
    displayText: `Perintah: "${command}". Saran: Coba sebutkan "Nyalakan pompa", "Berapa kelembapan?", atau "Atur jadwal pupuk 10 hari".`,
    confidence: 0.8
  };
}

// AI Voice Command API
app.post('/api/ai-voice-command', async (req, res) => {
  try {
    const { command, currentState } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command text is required' });
    }

    const gemini = getGeminiClient();
    const moisture = currentState?.kelembapan ?? 45;
    const status = currentState?.status ?? 'Ideal';
    const pumpOn = currentState?.manual === true;
    const fertilizer = currentState?.jadwalPupuk ?? 6;

    if (gemini) {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];
      let parsed = null;
      let usedModel = null;

      const systemInstruction = `Anda adalah AI Voice Assistant Cerdas untuk Sistem Smart Farming IoT (NZ-27) Kelompok 2.
Tugas Anda adalah memproses perintah suara pengguna dalam Bahasa Indonesia untuk mengendalikan perangkat IoT, memeriksa sensor telemetri, mengatur nutrisi pupuk, dan memberikan konsultasi agronomi presisi.

Data Telemetri Saat Ini:
- Kelembapan Tanah: ${moisture}%
- Status Tanah: ${status}
- Status Pompa Relay: ${pumpOn ? 'AKTIF (ON)' : 'MATI (STANDBY)'}
- Jadwal Pemupukan: Setiap ${fertilizer} Hari

Format output HARUS selalu JSON murni tanpa markdown dengan skema:
{
  "action": "PUMP_ON" | "PUMP_OFF" | "SET_FERTILIZER" | "SIMULATE_RAIN" | "QUERY_STATUS" | "CONSULTATION" | "UNKNOWN",
  "params": {
    "days": 6
  },
  "speechText": "Jawaban suara singkat, ramah, dan profesional dalam Bahasa Indonesia (maksimal 2 kalimat untuk dibacakan TTS)",
  "displayText": "Penjelasan detail tindakan teknis untuk ditampilkan di HUD",
  "confidence": 0.95
}`;

      for (const modelName of modelsToTry) {
        try {
          const response = await gemini.models.generateContent({
            model: modelName,
            contents: `Perintah Suara Pengguna: "${command}"`,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });

          let rawText = response.text ? response.text.trim() : '';
          // Clean possible markdown code fences if returned
          rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

          if (rawText) {
            parsed = JSON.parse(rawText);
            usedModel = modelName;
            break;
          }
        } catch (modelErr) {
          // Log concise info and continue to next model in fallback list
          console.info(`Model ${modelName} unavailable (${modelErr.status || modelErr.message}), trying next fallback.`);
        }
      }

      if (parsed && usedModel) {
        return res.json({
          success: true,
          source: usedModel,
          result: parsed
        });
      } else {
        // High-availability Local NLP Parser Fallback
        const fallbackResult = fallbackVoiceParser(command, currentState);
        return res.json({
          success: true,
          source: 'local-nlp-engine',
          result: fallbackResult
        });
      }
    } else {
      // Offline / No API Key fallback
      const fallbackResult = fallbackVoiceParser(command, currentState);
      return res.json({
        success: true,
        source: 'local-nlp',
        result: fallbackResult
      });
    }
  } catch (error) {
    console.error("AI Voice API error:", error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Farming Dashboard server running on http://0.0.0.0:${PORT}`);
});
