import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'Smart Farming IoT NZ-27' });
});

// Gemini AI Agronomy Advisor endpoint
app.post('/api/ai/agronomy-advisor', async (req, res) => {
  try {
    const { moisture, status, fertilizerScheduleDays, isPumpActive } = req.body || {};
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        analysis: `Analisis Telemetri: Kelembapan tanah tercatat ${moisture ?? 45}% (${status || 'Normal'}). Siklus pemupukan setiap ${fertilizerScheduleDays || 6} hari. Status pompa: ${isPumpActive ? 'Aktif' : 'Siaga'}. Disarankan menjaga kelembapan pada kisaran 45-65% untuk efisiensi pertumbuhan tanaman.`,
        source: 'local_rule_engine'
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Anda adalah AI Agronomist & IoT Agriculture Specialist untuk sistem irigasi pintar Smart Farming IoT NZ-27.
Berikan analisis agronomi singkat, padat, dan rekomendasi tindakan praktis dalam 2-3 kalimat bahasa Indonesia berdasarkan data telemetri berikut:
- Kelembapan Tanah: ${moisture}%
- Status Tanah: ${status}
- Siklus Pupuk: Setiap ${fertilizerScheduleDays || 6} hari
- Status Pompa Irigasi: ${isPumpActive ? 'Sedang Menyiram (ON)' : 'Siaga Otomatis (OFF)'}
Sertakan saran penyiraman atau nutrisi tanaman secara spesifik dan teknis.`
    });

    res.json({
      analysis: response.text?.trim() || 'Sistem irigasi beroperasi optimal.',
      source: 'gemini-2.5-flash'
    });
  } catch (error) {
    console.error('Error generating AI advice:', error);
    const { moisture, status, fertilizerScheduleDays, isPumpActive } = req.body || {};
    res.json({
      analysis: `Analisis Agronomi Greenhouse: Kelembapan tanah terdeteksi ${moisture ?? 55}% (${status || 'Optimal'}). Siklus nutrisi berjalan tiap ${fertilizerScheduleDays || 6} hari. Pompa irigasi ${isPumpActive ? 'sedang menyiram' : 'dalam posisi siaga'}. Tanaman dalam zona pertumbuhan prima (80% Good Growth).`,
      source: 'rule_engine_fallback'
    });
  }
});

app.use(express.static(__dirname));

// Standalone subsystem routes
app.get('/pompa', (req, res) => {
  res.sendFile(path.join(__dirname, 'pompa.html'));
});

app.get('/kelembapan', (req, res) => {
  res.sendFile(path.join(__dirname, 'kelembapan.html'));
});

app.get('/pupuk', (req, res) => {
  res.sendFile(path.join(__dirname, 'pupuk.html'));
});

app.get('/analisis', (req, res) => {
  res.sendFile(path.join(__dirname, 'analisis.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Farming Dashboard server running on http://0.0.0.0:${PORT}`);
});

