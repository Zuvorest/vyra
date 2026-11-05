const axios = require('axios');

class AiPictureAnswer {
  constructor() {
    this.baseUrl = "https://aipictureanswer.com";
    this.defaultHeaders = {
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: this.baseUrl,
      pragma: "no-cache",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Chromium";v="135", "Not-A.Brand";v="8"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }

  async getSession() {
    try {
      const res = await axios.get(this.baseUrl, {
        headers: {
          ...this.defaultHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate"
        },
        timeout: 15000
      });
      const html = res.data || "";
      const setCookie = res.headers["set-cookie"] || [];
      const cookies = setCookie.map(c => c.split(";")[0]).join("; ");
      
      const metaMatch = html.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/i);
      let csrfToken = metaMatch ? metaMatch[1] : null;
      
      if (!csrfToken) {
        const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
        if (xsrfMatch) csrfToken = decodeURIComponent(xsrfMatch[1]);
      }
      
      if (!csrfToken) throw new Error("Gagal mengekstrak CSRF token dari halaman.");
      
      return { cookies, csrfToken };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Gagal menginisialisasi session";
      throw new Error(`[getSession] ${msg}`);
    }
  }

  async formatToDataUri(input) {
    try {
      if (!input || typeof input !== "string") throw new Error("Input gambar tidak valid.");
      const trimmed = input.trim();
      
      if (/^https?:\/\//i.test(trimmed)) {
        const res = await axios.get(trimmed, { responseType: "arraybuffer", timeout: 20000 });
        const mime = res.headers["content-type"] || "image/jpeg";
        const base64 = Buffer.from(res.data).toString("base64");
        return `data:${mime};base64,${base64}`;
      }
      
      if (trimmed.startsWith("data:image/")) return trimmed;
      return `data:image/jpeg;base64,${trimmed}`;
    } catch (err) {
      throw new Error(`[formatToDataUri] ${err.message}`);
    }
  }

  async solve(image) {
    try {
      const imageDataUri = await this.formatToDataUri(image);
      const { cookies, csrfToken } = await this.getSession();
      
      const res = await axios.post(`${this.baseUrl}/api/solve`, 
        { image: imageDataUri }, 
        {
          headers: {
            ...this.defaultHeaders,
            accept: "application/json",
            "content-type": "application/json",
            cookie: cookies,
            "x-csrf-token": csrfToken
          },
          timeout: 45000
        }
      );
      
      const data = res?.data;
      if (!data?.success) throw new Error(data?.message || "Gagal mendapatkan jawaban.");
      
      return {
        solution: data.data?.solution || "",
        shareUrl: data.data?.share_url || null
      };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Proses solve gagal.";
      throw new Error(msg);
    }
  }
}

// ==========================================
// FORMAT DYNAMIC FEATURE BUILDER VYRA
// ==========================================
module.exports = {
  name: 'AI Picture Answer',
  slug: 'picture-answer',
  category: 'image', 
  subcategory: null,
  description: 'Foto soal matematika, teks, atau gambar apa pun dan biarkan AI menjawabnya untukmu.',
  long_description: 'Fitur ini menggunakan AI Vision untuk menganalisis gambar yang kamu unggah dan memberikan jawaban atau solusi langsung. Cocok untuk membantu mengerjakan PR, menerjemahkan teks dari gambar, atau mengenali objek.',
  icon: 'ScanEye',
  defaultCredits: 2, // Biaya 2 kredit per gambar
  requiresLogin: true,

  input: [
    {
      key: 'image',
      type: 'image',
      label: 'Upload Gambar',
      required: true,
      hint: 'Pastikan gambar/teks soal terlihat jelas dan tidak blur.'
    }
  ],

  output: { type: 'text' },

  instructions:
    '1. Upload foto soal atau gambar yang ingin dianalisis\n' +
    '2. Klik Generate\n' +
    '3. Tunggu beberapa saat hingga AI selesai membaca gambar dan memberikan jawaban.',

  error_messages: {
    INVALID_IMAGE: 'Format gambar tidak valid.',
    NETWORK_ERROR: 'Gagal menghubungi server AI. Coba lagi nanti.',
    SOLVE_FAILED: 'AI gagal memahami gambar. Pastikan gambar jelas.'
  },

  async handler(input, ctx) {
    if (!input.image) throw new Error('INVALID_IMAGE: Gambar wajib di-upload');

    const solver = new AiPictureAnswer();
    const result = await solver.solve(input.image);

    if (!result.solution) {
      throw new Error('SOLVE_FAILED: AI tidak memberikan jawaban teks.');
    }

    // Return format text agar dirender oleh frontend VYRA
    return { 
      text: result.solution 
    };
  }
};
