
'use strict';

const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const FormData = require('form-data');
const db = require('../db'); // Gunakan koneksi Supabase VYRA

const CONFIG = {
  BASE_URL: "https://www.domoai.app",
  API_URL: "https://api.domoai.app",
  OTP_TIMEOUT_MS: 90000,
  POLL_INTERVAL_MS: 4000,
  POLL_MAX_ATTEMPTS: 90,
  COS_REGION: "na-siliconvalley",
  INITIAL_CREDITS: 30,
  REMOVE_WM_DEFAULT: true,
  WM_MODE: "wm",
  MODEL_VERSION_NANO_BANANA: 22006,
  DEFAULT_MODE: "FAST",
  DEFAULT_RESOLUTION: "2K",
};

const SpoofHead = (extra = {}) => {
  const ip = [10, crypto.randomInt(256), crypto.randomInt(256), crypto.randomInt(256)].join(".");
  return { "x-forwarded-for": ip, "x-real-ip": ip, "client-ip": ip, ...extra };
};

class TempMail {
  constructor() {
    this.baseURL = "https://webhook.site";
    this.jar = {};
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K)",
        ...SpoofHead(),
      },
      withCredentials: true,
    });
    this.axiosInstance.interceptors.response.use((res) => {
      const sc = res.headers["set-cookie"];
      if (sc) {
        (Array.isArray(sc) ? sc : [sc]).forEach((h) => {
          const [pair] = h.split(";");
          const [k, ...v] = pair.split("=");
          if (k?.trim()) this.jar[k.trim()] = v.join("=").trim();
        });
        this.axiosInstance.defaults.headers.common["Cookie"] = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
      }
      return res;
    });
  }

  async create() {
    const res = await this.axiosInstance.post("/token", { password: "", timeout: "0" }, { headers: { "content-type": "application/json", "x-xsrf-token": this.jar["XSRF-TOKEN"] || "" } });
    return { uuid: res.data.uuid, email: `${res.data.uuid}@emailhook.site` };
  }

  async messages(email) {
    const uuid = email.split("@")[0];
    const res = await this.axiosInstance.get(`/token/${uuid}/requests`, { params: { page: 1, password: "", query: "", sorting: "newest" } });
    return res.data?.data || res.data?.requests || [];
  }

  async waitForOTP(email, timeoutMs = CONFIG.OTP_TIMEOUT_MS) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const list = await this.messages(email);
        for (const m of list) {
          const content = m?.text_content || m?.html_content || m?.content || "";
          const match = content.match(/\b(\d{6})\b/);
          if (match) return match[1];
        }
      } catch (e) {}
    }
    throw new Error("Timeout menunggu OTP");
  }
}

class DomoAIClient {
  constructor() {
    this.jar = {};
    this.email = null; this.userId = null; this.username = null; this.token = null;
    this.client = axios.create({
      timeout: 180000,
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json", "Domo-Platform": "WEB",
        origin: CONFIG.BASE_URL, referer: CONFIG.BASE_URL + "/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      },
    });
    this.client.interceptors.request.use((cfg) => {
      const cookieStr = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) cfg.headers["cookie"] = cookieStr;
      if (this.token) cfg.headers["authorization"] = `Bearer ${this.token}`;
      return cfg;
    });
    this.client.interceptors.response.use((res) => {
      const sc = res.headers["set-cookie"];
      if (sc) {
        (Array.isArray(sc) ? sc : [sc]).forEach((h) => {
          const [pair] = h.split(";"); const [k, ...v] = pair.split("=");
          if (k?.trim()) this.jar[k.trim()] = v.join("=").trim();
        });
      }
      if (res.data?.data?.access_token && !this.token) this.token = res.data.data.access_token;
      if (res.data?.data?.user_info?.uid) {
        this.userId = res.data.data.user_info.uid;
        this.username = res.data.data.user_info.username;
      }
      return res;
    });
  }

  encodeState() { return Buffer.from(JSON.stringify({ jar: this.jar, email: this.email, userId: this.userId, username: this.username, token: this.token })).toString("base64"); }
  decodeState(state) {
    try { const p = JSON.parse(Buffer.from(state, "base64").toString("utf-8")); this.jar = p.jar || {}; this.email = p.email || null; this.userId = p.userId || null; this.username = p.username || null; this.token = p.token || null; return true; } catch { return false; }
  }

  async sendEmailOTP(email) { return (await this.client.post(`${CONFIG.API_URL}/auth/send-email`, { email })).data; }
  async register({ email, password, code }) {
    const res = await this.client.post(`${CONFIG.API_URL}/auth/register`, { email, password, verification_code: code });
    this.email = email;
    if (res.data?.data?.access_token) { this.token = res.data.data.access_token; this.userId = res.data.data.user_info?.uid; this.username = res.data.data.user_info?.username; }
    return res.data;
  }

  async getCredits() { const res = await this.client.get(`${CONFIG.API_URL}/web-user/balance`); return res.data?.data?.paid_credits ?? 0; }

  async _prepareImage(imageInput) {
    if (typeof imageInput === "string" && imageInput.startsWith("http")) {
      const res = await axios.get(imageInput, { responseType: "arraybuffer" });
      return { buffer: Buffer.from(res.data), contentType: res.headers["content-type"] || "image/jpeg" };
    }
    if (typeof imageInput === "string" && imageInput.length > 100) {
      const b64 = imageInput.includes(";base64,") ? imageInput.split(";base64,")[1] : imageInput;
      return { buffer: Buffer.from(b64, "base64"), contentType: "image/jpeg" };
    }
    throw new Error("Format gambar tidak valid (harus URL atau base64)");
  }

  async _uploadSingle(imageInput) {
    const tokenRes = await this.client.get(`${CONFIG.API_URL}/web-post/upload-token`);
    const t = tokenRes.data;
    if (!t?.tmp_secret_id || !t?.bucket_name) throw new Error(`Upload token tidak valid`);
    const { buffer, contentType } = await this._prepareImage(imageInput);
    const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const fileName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const objectKey = `${t.object_key_prefix}${fileName}`;
    
    const COS = require("cos-nodejs-sdk-v5");
    const cos = new COS({ SecretId: t.tmp_secret_id, SecretKey: t.tmp_secret_key, SecurityToken: t.session_token });
    await new Promise((resolve, reject) => {
      cos.putObject({ Bucket: t.bucket_name, Region: CONFIG.COS_REGION, Key: objectKey, Body: buffer, ContentType: contentType }, (err) => {
        if (err) return reject(new Error(`COS upload gagal: ${err.message}`));
        resolve();
      });
    });
    return `https://${t.bucket_name}.cos.${CONFIG.COS_REGION}.myqcloud.com/${objectKey}`;
  }

  async uploadImages(imageInputs) {
    const inputs = Array.isArray(imageInputs) ? imageInputs : [imageInputs];
    const urls = [];
    for (const input of inputs) urls.push(await this._uploadSingle(input));
    return urls;
  }

  async createJob({ imageUrls, prompt, modelVersion, mode, resolution }) {
    const payload = { prompt, model_version: modelVersion, orientation: null, disable_watermark: false, mode: mode || CONFIG.DEFAULT_MODE, resolution: resolution || CONFIG.DEFAULT_RESOLUTION };
    if (imageUrls) payload.image_urls = imageUrls;
    return (await this.client.post(`${CONFIG.API_URL}/web-post/create/image-editing?locale=default`, payload)).data;
  }

  async queryPost(postId) { return (await this.client.post(`${CONFIG.API_URL}/web-user/posts`, { posts_id: [postId] })).data; }

  async waitForCompletion(postId) {
    for (let i = 0; i < CONFIG.POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
      try {
        const res = await this.queryPost(postId);
        const post = res?.data?.[0];
        if (!post) continue;
        const generated = post.generated_assets || [];
        if (post.status !== "RUNNING" && generated.length > 0) return post;
        if (post.status === "FAILED" || post.status === "ERROR") throw new Error(`Job gagal`);
      } catch (e) { if (e.message?.includes("Job gagal")) throw e; }
    }
    throw new Error("Polling timeout");
  }

  async generate({ images, prompt, modelVersion, mode, resolution }) {
    const inputs = Array.isArray(images) ? images : [images];
    const imageUrls = await this.uploadImages(inputs);
    const createRes = await this.createJob({ imageUrls, prompt, modelVersion, mode, resolution });
    const postId = createRes?.data?.id;
    if (!postId) throw new Error(`Create job gagal`);
    const post = await this.waitForCompletion(postId);
    return { postId, images: (post.generated_assets || []).map((a) => a.url).filter(Boolean) };
  }
}

class LightPdf {
  constructor() {
    this.agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
    this.commonData = { cli_os: "web", product_id: "227", language: "en" };
    this.headers = { "user-agent": "Mozilla/5.0", origin: "https://lightpdf.com", referer: "https://lightpdf.com/image-watermark-remover", ...SpoofHead() };
  }

  async getBuf(source) {
    if (Buffer.isBuffer(source)) return source;
    if (typeof source === "string" && source.startsWith("http")) {
      const res = await axios.get(source, { responseType: "arraybuffer", httpsAgent: this.agent });
      return Buffer.from(res.data);
    }
    throw new Error("Invalid source");
  }

  async req(url, method, data = null, params = {}, headers = {}) {
    const resp = await axios({ method, url, httpsAgent: this.agent, headers: { ...this.headers, ...headers }, data, params });
    return resp.data;
  }

  signOss(method, bucket, objectKey, headers, secret) {
    const date = headers["x-oss-date"]; const contentType = headers["Content-Type"] || "";
    const ossHeaders = Object.keys(headers).filter((k) => k.startsWith("x-oss-")).sort().map((k) => `${k.toLowerCase()}:${headers[k]}`).join("\n");
    const stringToSign = `${method}\n\n${contentType}\n${date}\n${ossHeaders}\n/${bucket}/${objectKey}`;
    return crypto.createHmac("sha1", secret).update(stringToSign).digest("base64");
  }

  async login() {
    const res = await this.req("https://gw.aoscdn.com/base/passport/v2/login/anonymous", "POST", { device_hash: crypto.randomBytes(16).toString("hex"), os_name: "android", os_version: "1.0", ...this.commonData }, {}, { "content-type": "application/json" });
    return res?.data?.api_token || res?.data?.token;
  }

  async conf(token, filename) {
    const res = await this.req("https://gw.aoscdn.com/app/lightpdf/v2/authorizations/oss", "POST", { "filenames[]": filename }, {}, { authorization: `Bearer ${token}`, "content-type": "multipart/form-data" });
    return res?.data;
  }

  async up(buffer, ossData, filename) {
    const { credential, bucket, endpoint, objects, callback } = ossData;
    const objectKey = objects[filename];
    const url = `https://${bucket}.${endpoint}/${objectKey}`;
    const date = new Date().toUTCString(); const contentType = "image/jpeg";
    const callbackJson = JSON.stringify({ callbackUrl: callback.url, callbackBody: callback.body, callbackBodyType: callback.type || "application/x-www-form-urlencoded" });
    const ossHeaders = { "x-oss-callback": Buffer.from(callbackJson).toString("base64"), "x-oss-date": date, "x-oss-security-token": credential.security_token, "x-oss-user-agent": "aliyun-sdk-js/6.9.0" };
    const signature = this.signOss("PUT", bucket, objectKey, { "Content-Type": contentType, ...ossHeaders }, credential.access_key_secret);
    const res = await axios.put(url, buffer, { headers: { Accept: "*/*", "Content-Type": contentType, Date: date, Authorization: `OSS ${credential.access_key_id}:${signature}`, ...ossHeaders }, httpsAgent: this.agent });
    return { resourceId: res.data?.data?.resource_id || res.data?.resource_id };
  }

  async run(token, resourceId, mode) {
    const url = mode === "deep" ? "https://gw.aoscdn.com/app/lightpdf/v2/tasks/deep-removal" : "https://gw.aoscdn.com/app/lightpdf/v2/tasks/external/watermark";
    const res = await this.req(url, "POST", { resource_id: resourceId, ...this.commonData, type: 94 }, {}, { authorization: `Bearer ${token}`, "content-type": "application/json" });
    return res?.data?.task_id;
  }

  async check(token, taskId, mode) {
    const url = mode === "deep" ? `https://gw.aoscdn.com/app/lightpdf/v2/tasks/deep-removal/${taskId}` : `https://gw.aoscdn.com/app/lightpdf/v2/tasks/external/watermark/${taskId}`;
    for (let i = 0; i < 60; i++) {
      const res = await this.req(url, "GET", null, this.commonData, { authorization: `Bearer ${token}` });
      if (res?.data?.state === 1) return res.data;
      if (res?.data?.state < 0) throw new Error(`Task Failed`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("Polling timeout");
  }

  async remove({ imageUrl, mode = CONFIG.WM_MODE }) {
    try {
      const filename = `${crypto.randomBytes(8).toString("hex")}.jpg`;
      const buffer = await this.getBuf(imageUrl);
      const token = await this.login();
      const ossConf = await this.conf(token, filename);
      const { resourceId } = await this.up(buffer, ossConf, filename);
      const taskId = await this.run(token, resourceId, mode);
      const finalData = await this.check(token, taskId, mode);
      return { status: true, result: finalData?.file };
    } catch (e) { return { status: false, result: null, error: e.message }; }
  }
}

// ==========================================
// DATABASE HELPERS (MENGGUNAKAN db.admin VYRA)
// ==========================================
async function loadAccounts() {
  try {
    const { data, error } = await db.admin.from('domoai_accounts').select('*');
    if (error) throw error;
    return data.map(row => ({ email: row.email, password: row.password, username: row.username, userId: row.user_id, state: row.state, usageCount: row.usage_count, lastKnownCredits: row.last_known_credits, createdAt: row.created_at }));
  } catch (e) { return []; }
}

async function saveAccounts(accounts) {
  try {
    await db.admin.from('domoai_accounts').delete().neq('email', 'dummy_value_to_delete_all');
    if (accounts.length > 0) {
      const insertData = accounts.map(a => ({ email: a.email, password: a.password, username: a.username, user_id: a.userId, state: a.state, usage_count: a.usageCount, last_known_credits: a.lastKnownCredits, created_at: a.createdAt || new Date().toISOString() }));
      await db.admin.from('domoai_accounts').insert(insertData);
    }
  } catch (e) {}
}

async function registerOneAccount() {
  const mail = new TempMail(); const domo = new DomoAIClient();
  const { email } = await mail.create(); domo.email = email;
  await domo.sendEmailOTP(email);
  const code = await mail.waitForOTP(email);
  const password = `Pass${crypto.randomBytes(6).toString("hex")}!`;
  await domo.register({ email, password, code });
  if (!domo.token) return { success: false, email };
  let credits = CONFIG.INITIAL_CREDITS;
  try { credits = await domo.getCredits(); } catch {}
  const newAcc = { email, password, username: domo.username, userId: domo.userId, state: domo.encodeState(), usageCount: 0, lastKnownCredits: credits, createdAt: new Date().toISOString() };
  const accounts = await loadAccounts(); accounts.push(newAcc); await saveAccounts(accounts);
  return { success: true, account: newAcc }; 
}

async function ensureReadyAccount() {
  const accounts = await loadAccounts();
  for (const acc of accounts) {
    if (!acc || !acc.state) continue;
    const domo = new DomoAIClient(); domo.decodeState(acc.state);
    if (!domo.token) continue;
    try {
      const credits = await domo.getCredits();
      if (credits >= 10) return acc;
      else { await saveAccounts(accounts.filter((a) => a.email !== acc.email)); }
    } catch (e) {
      if ([401, 403].includes(e.response?.status)) { await saveAccounts(accounts.filter((a) => a.email !== acc.email)); }
    }
  }
  const reg = await registerOneAccount();
  if (!reg.success) throw new Error("Auto-register akun DomoAI gagal");
  return reg.account; 
}

async function generateFull({ mode = "i2i", images, prompt, modelVersion = CONFIG.MODEL_VERSION_NANO_BANANA, resolution = CONFIG.DEFAULT_RESOLUTION, removeWatermark = CONFIG.REMOVE_WM_DEFAULT, wmMode = CONFIG.WM_MODE }) {
  const acc = await ensureReadyAccount();
  const domo = new DomoAIClient(); domo.decodeState(acc.state);
  const result = await domo.generate({ images, prompt, modelVersion, mode: CONFIG.DEFAULT_MODE, resolution });
  const accounts = await loadAccounts();
  const idx = accounts.findIndex((a) => a.email === acc.email);
  if (idx !== -1) {
    accounts[idx].usageCount = (accounts[idx].usageCount || 0) + 1;
    try { accounts[idx].lastKnownCredits = await domo.getCredits(); } catch {}
    await saveAccounts(accounts);
  }
  const rawImages = result.images || [];
  let cleanedImages = rawImages;
  if (removeWatermark && rawImages.length > 0) {
    const wm = new LightPdf(); cleanedImages = [];
    for (const rawUrl of rawImages) {
      const wmResult = await wm.remove({ imageUrl: rawUrl, mode: wmMode });
      cleanedImages.push(wmResult.status ? wmResult.result : rawUrl);
    }
  }
  return { status: true, images: cleanedImages };
}

module.exports = { generateFull };
