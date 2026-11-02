
'use strict';

const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const COS = require('cos-nodejs-sdk-v5');
const db = require('../../db'); 

const CONFIG = {
  BASE_URL: 'https://www.domoai.app',
  API_URL: 'https://api.domoai.app',
  OTP_TIMEOUT_MS: 90000,
  POLL_INTERVAL_MS: 4000,
  POLL_MAX_ATTEMPTS: 90,
  COS_REGION: 'na-siliconvalley',
  CREDITS_PER_GENERATE: 10,
  INITIAL_CREDITS: 30,
  REMOVE_WM_DEFAULT: true,
  WM_MODE: 'wm',
  MODEL_SUNBURST: 22005,
  MODEL_FLARE: 22005,
  MODEL_NANO: 22006,
  DEFAULT_MODE: 'FAST',
  DEFAULT_RESOLUTION: '2K',
};

const SpoofHead = (extra = {}) => {
  const ip = [10, crypto.randomInt(256), crypto.randomInt(256), crypto.randomInt(256)].join('.');
  return {
    'x-forwarded-for': ip, 'x-real-ip': ip, 'client-ip': ip,
    'x-client-ip': ip, 'x-cluster-client-ip': ip, 'x-original-forwarded-for': ip,
    ...extra,
  };
};

// ========== TEMPMAIL ==========
class TempMail {
  constructor(baseURL = 'https://webhook.site') {
    this.baseURL = baseURL;
    this.jar = {};
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'id-ID,id;q=0.9',
        referer: 'https://webhook.site/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        ...SpoofHead(),
      },
      withCredentials: true,
      timeout: 30000,
    });
    this.axiosInstance.interceptors.response.use((res) => {
      const sc = res.headers['set-cookie'];
      if (sc) {
        (Array.isArray(sc) ? sc : [sc]).forEach((h) => {
          const [pair] = h.split(';');
          const [k, ...v] = pair.split('=');
          if (k?.trim()) this.jar[k.trim()] = v.join('=').trim();
        });
        this.axiosInstance.defaults.headers.common['Cookie'] = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
      }
      return res;
    });
  }
  async create() {
    const res = await this.axiosInstance.post('/token', { password: '', timeout: '0' }, {
      headers: { 'content-type': 'application/json;charset=UTF-8', 'x-xsrf-token': this.jar['XSRF-TOKEN'] || '' },
    });
    return { uuid: res.data.uuid, email: `${res.data.uuid}@emailhook.site` };
  }
  async messages(email) {
    const uuid = email.split('@')[0];
    const res = await this.axiosInstance.get(`/token/${uuid}/requests`, {
      params: { page: 1, password: '', query: '', sorting: 'newest' },
    });
    return res.data?.data || res.data?.requests || [];
  }
  async waitForOTP(email, timeoutMs = CONFIG.OTP_TIMEOUT_MS) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const list = await this.messages(email);
        for (const m of list) {
          const content = m?.text_content || m?.html_content || m?.content || '';
          const match = content.match(/\b(\d{6})\b/);
          if (match) return match[1];
        }
      } catch (_) {}
    }
    throw new Error('OTP_TIMEOUT');
  }
}

// ========== DOMOAI CLIENT ==========
class DomoAIClient {
  constructor() {
    this.jar = {};
    this.email = null; this.userId = null; this.username = null; this.token = null;
    this.client = axios.create({
      timeout: 180000,
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'Domo-Platform': 'WEB',
        origin: CONFIG.BASE_URL, referer: CONFIG.BASE_URL + '/',
        'sec-ch-ua': '"Chromium";v="137", "Not)A;Brand";v="24"',
        'sec-ch-ua-mobile': '?1', 'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      },
    });
    this.client.interceptors.request.use((cfg) => {
      const cs = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
      if (cs) cfg.headers['cookie'] = cs;
      if (this.token) cfg.headers['authorization'] = `Bearer ${this.token}`;
      return cfg;
    });
    this.client.interceptors.response.use((res) => {
      const sc = res.headers['set-cookie'];
      if (sc) {
        (Array.isArray(sc) ? sc : [sc]).forEach((h) => {
          const [pair] = h.split(';');
          const [k, ...v] = pair.split('=');
          if (k?.trim()) this.jar[k.trim()] = v.join('=').trim();
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
  encodeState() {
    return Buffer.from(JSON.stringify({ jar: this.jar, email: this.email, userId: this.userId, username: this.username, token: this.token })).toString('base64');
  }
  decodeState(state) {
    try {
      const p = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      this.jar = p.jar || {}; this.email = p.email || null;
      this.userId = p.userId || null; this.username = p.username || null; this.token = p.token || null;
      return true;
    } catch { return false; }
  }
  async sendEmailOTP(email) { return (await this.client.post(`${CONFIG.API_URL}/auth/send-email`, { email })).data; }
  async register({ email, password, code }) {
    const res = await this.client.post(`${CONFIG.API_URL}/auth/register`, { email, password, verification_code: code });
    this.email = email;
    if (res.data?.data?.access_token) {
      this.token = res.data.data.access_token; this.userId = res.data.data.user_info?.uid; this.username = res.data.data.user_info?.username;
    }
    return res.data;
  }
  async getBalance() { return (await this.client.get(`${CONFIG.API_URL}/web-user/balance`)).data; }
  async getCredits() { const b = await this.getBalance(); return b?.data?.paid_credits ?? 0; }
  
  async _prepareImage(input) {
    if (typeof input === 'string' && input.startsWith('http')) {
      const r = await axios.get(input, { responseType: 'arraybuffer', timeout: 60000 });
      return { buffer: Buffer.from(r.data), contentType: r.headers['content-type'] || 'image/jpeg' };
    }
    if (Buffer.isBuffer(input)) return { buffer: input, contentType: 'image/jpeg' };
    if (typeof input === 'string' && input.length > 100) {
      const b64 = input.includes(';base64,') ? input.split(';base64,')[1] : input;
      return { buffer: Buffer.from(b64, 'base64'), contentType: 'image/jpeg' };
    }
    throw new Error('INVALID_IMAGE');
  }
  
  async uploadImage(input) {
    const t = (await this.client.get(`${CONFIG.API_URL}/web-post/upload-token`)).data;
    if (!t?.tmp_secret_id || !t?.bucket_name) throw new Error('UPLOAD_TOKEN_FAILED');
    const { buffer, contentType } = await this._prepareImage(input);
    const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const key = `${t.object_key_prefix}${fileName}`;
    const cos = new COS({ SecretId: t.tmp_secret_id, SecretKey: t.tmp_secret_key, SecurityToken: t.session_token });
    await new Promise((resolve, reject) => {
      cos.putObject({ Bucket: t.bucket_name, Region: CONFIG.COS_REGION, Key: key, Body: buffer, ContentType: contentType }, (err) => err ? reject(new Error(`COS_UPLOAD_FAILED: ${err.message}`)) : resolve());
    });
    return `https://${t.bucket_name}.cos.${CONFIG.COS_REGION}.myqcloud.com/${key}`;
  }

  async uploadImages(inputs) {
    const urls = [];
    for (const input of inputs) urls.push(await this.uploadImage(input));
    return urls;
  }

  async createJob({ imageUrls, prompt, modelVersion, mode, resolution, isText2Image }) {
    const payload = {
      prompt, model_version: modelVersion, orientation: null, disable_watermark: false,
      mode: mode || CONFIG.DEFAULT_MODE, resolution: resolution || CONFIG.DEFAULT_RESOLUTION,
    };
    if (!isText2Image && imageUrls?.length > 0) payload.image_urls = imageUrls;
    
    return (await this.client.post(`${CONFIG.API_URL}/web-post/create/image-editing?locale=default`, payload)).data;
  }

  async queryPost(postId) { return (await this.client.post(`${CONFIG.API_URL}/web-user/posts`, { posts_id: [postId] })).data; }
  
  async waitForCompletion(postId) {
    for (let i = 0; i < CONFIG.POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
      try {
        const post = (await this.queryPost(postId))?.data?.[0];
        if (!post) continue;
        const gen = post.generated_assets || [];
        if (post.status !== 'RUNNING' && gen.length > 0) return post;
        if (post.status === 'FAILED' || post.status === 'ERROR') throw new Error('JOB_FAILED');
      } catch (e) { if (e.message === 'JOB_FAILED') throw e; }
    }
    throw new Error('POLL_TIMEOUT');
  }

  async txt2img({ prompt, modelVersion, mode, resolution }) {
    const cr = await this.createJob({ imageUrls: null, prompt, modelVersion, mode, resolution, isText2Image: true });
    const postId = cr?.data?.id;
    if (!postId) throw new Error('CREATE_JOB_FAILED');
    const post = await this.waitForCompletion(postId);
    return { postId, images: (post.generated_assets || []).map((a) => a.url).filter(Boolean) };
  }

  async img2img({ images, prompt, modelVersion, mode, resolution }) {
    const imageUrls = await this.uploadImages(images);
    const cr = await this.createJob({ imageUrls, prompt, modelVersion, mode, resolution, isText2Image: false });
    const postId = cr?.data?.id;
    if (!postId) throw new Error('CREATE_JOB_FAILED');
    const post = await this.waitForCompletion(postId);
    return { postId, images: (post.generated_assets || []).map((a) => a.url).filter(Boolean) };
  }
}

// ========== LIGHTPDF (remove watermark) ==========
class LightPdf {
  constructor() {
    this.agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
    this.commonData = { cli_os: 'web', product_id: '227', language: 'en' };
    this.headers = { 'user-agent': 'Mozilla/5.0', origin: 'https://lightpdf.com', referer: 'https://lightpdf.com/image-watermark-remover', ...SpoofHead() };
  }
  async getBuf(src) {
    if (Buffer.isBuffer(src)) return src;
    if (typeof src === 'string' && src.startsWith('http')) {
      const r = await axios.get(src, { responseType: 'arraybuffer', httpsAgent: this.agent, timeout: 60000 });
      return Buffer.from(r.data);
    }
    throw new Error('INVALID_SOURCE');
  }
  async req(url, method, data = null, params = {}, headers = {}) {
    const r = await axios({ method, url, httpsAgent: this.agent, headers: { ...this.headers, ...headers }, data, params, timeout: 60000 });
    return r.data;
  }
  signOss(method, bucket, key, headers, secret) {
    const date = headers['x-oss-date']; const ct = headers['Content-Type'] || '';
    const oh = Object.keys(headers).filter((k) => k.startsWith('x-oss-')).sort().map((k) => `${k.toLowerCase()}:${headers[k]}`).join('\n');
    const sts = `${method}\n\n${ct}\n${date}\n${oh}\n/${bucket}/${key}`;
    return crypto.createHmac('sha1', secret).update(sts).digest('base64');
  }
  async login() {
    const r = await this.req('https://gw.aoscdn.com/base/passport/v2/login/anonymous', 'POST', { device_hash: crypto.randomBytes(16).toString('hex'), os_name: 'android', os_version: '1.0', ...this.commonData }, {}, { 'content-type': 'application/json' });
    const token = r?.data?.api_token || r?.data?.token;
    if (!token) throw new Error('LIGHTPDF_LOGIN_FAILED');
    return token;
  }
  async conf(token, filename) {
    const r = await this.req('https://gw.aoscdn.com/app/lightpdf/v2/authorizations/oss', 'POST', { 'filenames[]': filename }, {}, { authorization: `Bearer ${token}`, 'content-type': 'multipart/form-data' });
    if (r?.data) return r.data; throw new Error('LIGHTPDF_OSS_FAILED');
  }
  async up(buffer, ossData, filename) {
    const { credential, bucket, endpoint, objects, callback } = ossData;
    const key = objects[filename]; const url = `https://${bucket}.${endpoint}/${key}`;
    const date = new Date().toUTCString(); const ct = 'image/jpeg';
    const cbJson = JSON.stringify({ callbackUrl: callback.url, callbackBody: callback.body, callbackBodyType: callback.type || 'application/x-www-form-urlencoded' });
    const oh = { 'x-oss-callback': Buffer.from(cbJson).toString('base64'), 'x-oss-date': date, 'x-oss-security-token': credential.security_token, 'x-oss-user-agent': 'aliyun-sdk-js/6.9.0' };
    const sig = this.signOss('PUT', bucket, key, { 'Content-Type': ct, ...oh }, credential.access_key_secret);
    const r = await axios.put(url, buffer, { headers: { Accept: '*/*', 'Content-Type': ct, Date: date, Authorization: `OSS ${credential.access_key_id}:${sig}`, ...oh }, httpsAgent: this.agent, timeout: 60000 });
    const resourceId = r.data?.data?.resource_id || r.data?.resource_id;
    if (!resourceId) throw new Error('LIGHTPDF_UPLOAD_FAILED');
    return { resourceId };
  }
  async run(token, resourceId, mode) {
    const url = mode === 'deep' ? 'https://gw.aoscdn.com/app/lightpdf/v2/tasks/deep-removal' : 'https://gw.aoscdn.com/app/lightpdf/v2/tasks/external/watermark';
    const r = await this.req(url, 'POST', { resource_id: resourceId, ...this.commonData, type: 94 }, {}, { authorization: `Bearer ${token}`, 'content-type': 'application/json' });
    if (r?.data?.task_id) return r.data.task_id; throw new Error('LIGHTPDF_TASK_FAILED');
  }
  async check(token, taskId, mode) {
    const url = mode === 'deep' ? `https://gw.aoscdn.com/app/lightpdf/v2/tasks/deep-removal/${taskId}` : `https://gw.aoscdn.com/app/lightpdf/v2/tasks/external/watermark/${taskId}`;
    for (let i = 0; i < 60; i++) {
      const r = await this.req(url, 'GET', null, this.commonData, { authorization: `Bearer ${token}` });
      if (r?.data?.state === 1) return r.data;
      if (r?.data?.state < 0) throw new Error('LIGHTPDF_TASK_FAILED');
      await new Promise((res) => setTimeout(res, 3000));
    }
    throw new Error('LIGHTPDF_POLL_TIMEOUT');
  }
  async remove({ imageUrl, mode = CONFIG.WM_MODE }) {
    try {
      const fn = `${crypto.randomBytes(8).toString('hex')}.jpg`;
      const buf = await this.getBuf(imageUrl);
      const token = await this.login();
      const oss = await this.conf(token, fn);
      const { resourceId } = await this.up(buf, oss, fn);
      const taskId = await this.run(token, resourceId, mode);
      const final = await this.check(token, taskId, mode);
      return { status: true, result: final?.file };
    } catch (e) { return { status: false, result: null, error: e.message }; }
  }
}

// ========== SUPABASE STORAGE ==========
function rowToAcc(r) {
  return { email: r.email, password: r.password, username: r.username, userId: r.user_id, state: r.state, usageCount: r.usage_count || 0, lastKnownCredits: r.last_known_credits || 0, createdAt: r.created_at };
}
async function loadAccounts() {
  try {
    const { data, error } = await db.admin.from('domoai_accounts').select('*');
    if (error) throw error;
    return (data || []).map(rowToAcc);
  } catch (e) { console.error('[img] load:', e.message); return []; }
}
async function saveAccount(acc) {
  try {
    await db.admin.from('domoai_accounts').upsert({
      email: acc.email, password: acc.password, username: acc.username || null, user_id: acc.userId || null, state: acc.state, usage_count: acc.usageCount || 0, last_known_credits: acc.lastKnownCredits || 0, created_at: acc.createdAt || new Date().toISOString(),
    }, { onConflict: 'email' });
  } catch (e) { console.error('[img] save:', e.message); }
}
async function removeAccount(email) {
  try { await db.admin.from('domoai_accounts').delete().eq('email', email); } catch (e) {}
}

let _lock = Promise.resolve();
function withLock(fn) { const p = _lock.then(fn, fn); _lock = p.catch(() => {}); return p; }

async function registerOneAccount() {
  const mail = new TempMail(); const domo = new DomoAIClient();
  const { email } = await mail.create(); domo.email = email;
  await domo.sendEmailOTP(email); const code = await mail.waitForOTP(email);
  await domo.register({ email, password: `Pass${crypto.randomBytes(6).toString('hex')}!`, code });
  if (!domo.token) throw new Error('REGISTER_FAILED');
  let credits = CONFIG.INITIAL_CREDITS;
  try { credits = await domo.getCredits(); } catch (_) {}
  const acc = { email, password: 'pass', username: domo.username, userId: domo.userId, state: domo.encodeState(), usageCount: 0, lastKnownCredits: credits, createdAt: new Date().toISOString() };
  await saveAccount(acc);
  return acc;
}

async function ensureReadyAccount() {
  return withLock(async () => {
    const accounts = await loadAccounts();
    for (const acc of accounts) {
      if (!acc.state) continue;
      const domo = new DomoAIClient(); domo.decodeState(acc.state);
      if (!domo.token) continue;
      try {
        const credits = await domo.getCredits();
        if (credits >= CONFIG.CREDITS_PER_GENERATE) return acc;
        await removeAccount(acc.email);
      } catch (e) { if ([401, 403].includes(e.response?.status)) await removeAccount(acc.email); }
    }
    return await registerOneAccount();
  });
}

// ========== MAIN GENERATE ==========
async function generateImage({ mode, prompt, images, modelVersion, resolution, removeWatermark }) {
  const acc = await ensureReadyAccount();
  const domo = new DomoAIClient();
  domo.decodeState(acc.state);

  let result;
  if (mode === 't2i') {
    result = await domo.txt2img({ prompt, modelVersion, mode: CONFIG.DEFAULT_MODE, resolution: resolution || CONFIG.DEFAULT_RESOLUTION });
  } else {
    result = await domo.img2img({ images, prompt, modelVersion, mode: CONFIG.DEFAULT_MODE, resolution: resolution || CONFIG.DEFAULT_RESOLUTION });
  }

  let remaining = null;
  try { remaining = await domo.getCredits(); } catch (_) {}
  await saveAccount({ ...acc, usageCount: (acc.usageCount || 0) + 1, lastKnownCredits: remaining ?? acc.lastKnownCredits });

  const rawImages = result.images || [];
  let cleaned = rawImages;
  if (removeWatermark !== false && rawImages.length > 0) {
    const wm = new LightPdf();
    cleaned = [];
    for (const raw of rawImages) {
      const r = await wm.remove({ imageUrl: raw });
      cleaned.push(r.status && r.result ? r.result : raw);
    }
  }
  return { status: true, images: cleaned };
}

module.exports = { generateImage, CONFIG };
