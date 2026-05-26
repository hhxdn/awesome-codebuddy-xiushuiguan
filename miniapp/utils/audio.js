// utils/audio.js - 音效管理（WAV base64 data URI + InnerAudioContext，最可靠方案）

const SR = 22050; // 采样率

// ========== 音效采样生成器：返回 Float32Array ==========

/** 维修成功音效：短促上升音 */
function genRepairSamples() {
  const dur = 0.25;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 400 + (t / dur) * 800;
    const env = Math.max(0, 1 - t / dur);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
  }
  return samples;
}

/** 领取扳手音效：金属碰撞感 */
function genWrenchSamples() {
  const dur = 0.3;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 8);
    const f1 = Math.sin(2 * Math.PI * 1200 * t) * 0.4;
    const f2 = Math.sin(2 * Math.PI * 1800 * t) * 0.3;
    const noise = (Math.random() * 2 - 1) * 0.15;
    samples[i] = (f1 + f2 + noise) * env * 0.6;
  }
  return samples;
}

/** 通关音效：欢快上升和弦 */
function genClearSamples() {
  const dur = 0.8;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.max(0, 1 - t / dur) * (t < 0.05 ? t / 0.05 : 1);
    let val = 0;
    for (let j = 0; j < notes.length; j++) {
      const noteT = t - j * 0.15;
      if (noteT > 0 && noteT < 0.4) {
        const noteEnv = Math.exp(-noteT * 5);
        val += Math.sin(2 * Math.PI * notes[j] * t) * noteEnv * 0.2;
      }
    }
    samples[i] = val * env * 0.7;
  }
  return samples;
}

/** 失败音效：下行低沉音 */
function genFailSamples() {
  const dur = 0.6;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 400 - (t / dur) * 250;
    const env = Math.exp(-t * 3);
    const vib = 1 + Math.sin(2 * Math.PI * 6 * t) * 0.02;
    samples[i] = Math.sin(2 * Math.PI * freq * t * vib) * env * 0.5;
  }
  return samples;
}

/** 点击音效：短促清脆 */
function genClickSamples() {
  const dur = 0.08;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.max(0, 1 - t / dur);
    const f1 = Math.sin(2 * Math.PI * 800 * t) * 0.35;
    const f2 = Math.sin(2 * Math.PI * 1200 * t) * 0.25;
    samples[i] = (f1 + f2) * env * 0.5;
  }
  return samples;
}

/** 漏水音效：水滴/气泡感 */
function genWaterSamples() {
  const dur = 0.3;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 12);
    const freq = 200 + Math.sin(2 * Math.PI * 30 * t) * 80;
    const val = Math.sin(2 * Math.PI * freq * t) * env * 0.4;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.2;
    samples[i] = val + noise;
  }
  return samples;
}

/** 爆管音效：爆炸/冲击感 */
function genBurstSamples() {
  const dur = 0.5;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 6);
    const noise = (Math.random() * 2 - 1) * env * 0.6;
    const rumble = Math.sin(2 * Math.PI * (50 + Math.random() * 100) * t) * env * 0.3;
    const hiss = (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.15;
    samples[i] = noise + rumble + hiss;
  }
  return samples;
}

/** 倒计时警告：急促蜂鸣 */
function genCountdownSamples() {
  const dur = 0.5;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  const beepDur = 0.08;
  const beepInterval = 0.25;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const localT = t % beepInterval;
    let val = 0;
    if (localT < beepDur) {
      const env = Math.exp(-localT * 20);
      val = Math.sin(2 * Math.PI * 880 * t) * env * 0.45;
    }
    samples[i] = val;
  }
  return samples;
}

/** 拾取道具音效 */
function genPowerUpSamples() {
  const dur = 0.3;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 7);
    const f1 = Math.sin(2 * Math.PI * 600 * t) * 0.3;
    const f2 = Math.sin(2 * Math.PI * 900 * t) * 0.25;
    const f3 = Math.sin(2 * Math.PI * 1200 * t) * 0.2;
    samples[i] = (f1 + f2 + f3) * env * 0.6;
  }
  return samples;
}

/** 连击音效 */
function genComboSamples(combo) {
  const dur = 0.4;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  const baseFreq = 500 + combo * 60;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 6);
    const freq = baseFreq + Math.sin(2 * Math.PI * 8 * t) * 100;
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
  }
  return samples;
}

// ========== WAV 编码 ==========

/**
 * Float32Array 转 16-bit PCM WAV ArrayBuffer
 */
function float32ToWav(samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SR * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeStr(view, 8, 'WAVE');

  // fmt  subchunk
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);        // Subchunk1Size (PCM)
  view.setUint16(20, 1, true);         // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // 写入采样数据（Float32 → Int16）
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(44 + i * 2, s, true);
  }

  return buffer;
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ========== Base64 编码 ==========
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let result = '';
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    result += B64[a >> 2];
    result += B64[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < len ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    result += i + 2 < len ? B64[c & 63] : '=';
  }
  return result;
}

// ========== 音效资源管理 ==========
const RAW_SAMPLES = {};
const DATA_URIS = {}; // 缓存 base64 data URI
let _initialized = false;

function initSounds() {
  if (_initialized) return;
  RAW_SAMPLES.REPAIR = genRepairSamples();
  RAW_SAMPLES.WRENCH = genWrenchSamples();
  RAW_SAMPLES.CLEAR = genClearSamples();
  RAW_SAMPLES.FAIL = genFailSamples();
  RAW_SAMPLES.CLICK = genClickSamples();
  RAW_SAMPLES.WATER = genWaterSamples();
  RAW_SAMPLES.BURST = genBurstSamples();
  RAW_SAMPLES.COUNTDOWN = genCountdownSamples();
  RAW_SAMPLES.POWERUP = genPowerUpSamples();
  for (let c = 1; c <= 10; c++) {
    RAW_SAMPLES['COMBO_' + c] = genComboSamples(c);
  }
  _initialized = true;
}

/** 获取音效的 base64 data URI（带缓存） */
function getDataUri(name) {
  if (DATA_URIS[name]) return DATA_URIS[name];
  const samples = RAW_SAMPLES[name];
  if (!samples) return null;
  const wavBuf = float32ToWav(samples);
  const b64 = arrayBufferToBase64(wavBuf);
  const uri = 'data:audio/wav;base64,' + b64;
  DATA_URIS[name] = uri;
  return uri;
}

// ========== 播放引擎：InnerAudioContext + base64 data URI ==========
let globalVolume = 0.6;

/**
 * 播放音效
 * @param {string} name - 音效名称
 * @param {object} options - { loop, volume }
 */
function play(name, options = {}) {
  if (!_initialized) initSounds();

  let app;
  try { app = getApp(); } catch (e) {}
  const soundEnabled = app ? app.globalData.soundEnabled : true;
  if (!soundEnabled) return null;

  const dataUri = getDataUri(name);
  if (!dataUri) {
    console.warn('[audio] 无音效数据:', name);
    return null;
  }

  try {
    const innerCtx = wx.createInnerAudioContext();
    innerCtx.src = dataUri;
    innerCtx.volume = options.volume !== undefined ? options.volume : globalVolume;
    innerCtx.loop = options.loop || false;

    innerCtx.onEnded(() => {
      innerCtx.destroy();
    });
    innerCtx.onError((err) => {
      console.error('[audio] 播放失败:', name, err);
      innerCtx.destroy();
    });

    innerCtx.play();
    return innerCtx;
  } catch (e) {
    console.error('[audio] 创建播放器失败:', name, e);
    return null;
  }
}

/** 播放连击音效 */
function playCombo(combo) {
  const idx = Math.min(10, Math.max(1, combo));
  return play('COMBO_' + idx, { volume: 0.5 });
}

function setVolume(volume) {
  globalVolume = Math.max(0, Math.min(1, volume));
}

/** 停止所有音效（WebAudio API 已移除，此方法为空） */
function stopAll() {
  // InnerAudioContext 播放完即销毁，无需手动停止
}

function stop(name) {
  // 短音效自动销毁，无需手动停止
}

function preload() {
  initSounds();
  // 预热所有 data URI
  Object.keys(RAW_SAMPLES).forEach(name => getDataUri(name));
}

module.exports = {
  SOUNDS: [
    'REPAIR', 'WRENCH', 'CLEAR', 'FAIL', 'CLICK',
    'WATER', 'BURST', 'COUNTDOWN', 'POWERUP'
  ],
  play,
  playCombo,
  stop,
  stopAll,
  setVolume,
  preload
};
