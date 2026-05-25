// utils/audio.js - 音效管理（程序化生成音效，无需外部资源文件）

// ========== 音效生成器：用程序合成 WAV ==========

/**
 * 生成 WAV 文件数据（PCM 16-bit 单声道）
 * @param {number} sampleRate - 采样率
 * @param {Float32Array} samples - 浮点采样数据 [-1, 1]
 * @returns {ArrayBuffer} WAV 文件二进制数据
 */
function buildWav(sampleRate, samples) {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(view, 8, 'WAVE');

  // fmt chunk
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);       // chunk size
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);        // block align
  view.setUint16(34, 16, true);       // bits per sample

  // data chunk
  writeStr(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * 将 ArrayBuffer 转为 base64 data URI
 */
function wavToDataUri(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// ========== 各音效合成函数 ==========

const SR = 22050; // 采样率（较低以减小体积）

/** 维修成功音效：短促上升音 */
function genRepair() {
  const dur = 0.25;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 400 + (t / dur) * 800;
    const env = Math.max(0, 1 - t / dur);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
  }
  return wavToDataUri(buildWav(SR, samples));
}

/** 领取扳手音效：金属碰撞感 */
function genWrench() {
  const dur = 0.3;
  const n = Math.floor(SR * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 8);
    const f1 = Math.sin(2 * Math.PI * 1200 * t) * 0.4;
    const f2 = Math.sin(2 * Math.PI * 1800 * t) * 0.3;
    // 噪声成分（金属质感）
    const noise = (Math.random() * 2 - 1) * 0.15;
    samples[i] = (f1 + f2 + noise) * env * 0.6;
  }
  return wavToDataUri(buildWav(SR, samples));
}

/** 通关音效：欢快上升和弦 */
function genClear() {
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
  return wavToDataUri(buildWav(SR, samples));
}

/** 失败音效：下行低沉音 */
function genFail() {
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
  return wavToDataUri(buildWav(SR, samples));
}

/** 点击音效：短促清脆 */
function genClick() {
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
  return wavToDataUri(buildWav(SR, samples));
}

/** 漏水音效：水滴/气泡感 */
function genWater() {
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
  return wavToDataUri(buildWav(SR, samples));
}

/** 爆管音效：爆炸/冲击感 */
function genBurst() {
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
  return wavToDataUri(buildWav(SR, samples));
}

/** 倒计时警告：急促蜂鸣 */
function genCountdown() {
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
  return wavToDataUri(buildWav(SR, samples));
}

/** 拾取道具音效 */
function genPowerUp() {
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
  return wavToDataUri(buildWav(SR, samples));
}

/** 连击音效 */
function genCombo(combo) {
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
  return wavToDataUri(buildWav(SR, samples));
}

// ========== 音效资源（程序化生成） ==========
const SOUNDS = {};
let _initialized = false;

function initSounds() {
  if (_initialized) return;
  SOUNDS.REPAIR = genRepair();
  SOUNDS.WRENCH = genWrench();
  SOUNDS.CLEAR = genClear();
  SOUNDS.FAIL = genFail();
  SOUNDS.CLICK = genClick();
  SOUNDS.WATER = genWater();
  SOUNDS.BURST = genBurst();
  SOUNDS.COUNTDOWN = genCountdown();
  SOUNDS.POWERUP = genPowerUp();
  // 预生成连击音效（1-10）
  for (let c = 1; c <= 10; c++) {
    SOUNDS['COMBO_' + c] = genCombo(c);
  }
  _initialized = true;
}

// ========== 播放管理 ==========
let audioContexts = {};

/**
 * 播放音效
 * @param {string} name - 音效名称（REPAIR, WRENCH, CLEAR, FAIL, CLICK, WATER, BURST, COUNTDOWN, POWERUP, COMBO_1~10）
 * @param {object} options - { loop, volume }
 */
function play(name, options = {}) {
  // 确保音效已初始化（懒加载）
  if (!_initialized) initSounds();

  // 检查音效开关
  let app;
  try { app = getApp(); } catch (e) {}
  const soundEnabled = app ? app.globalData.soundEnabled : true;
  if (!soundEnabled) return null;

  const src = SOUNDS[name];
  if (!src) return null;

  try {
    // 停止并销毁旧的同音效
    if (audioContexts[name]) {
      audioContexts[name].stop();
      audioContexts[name].destroy();
    }

    const audio = wx.createInnerAudioContext();
    audio.src = src;
    audio.loop = options.loop || false;
    audio.volume = options.volume !== undefined ? options.volume : 0.6;
    audio.obeyMuteSwitch = false;

    audio.onError((err) => {
      console.log('音效播放失败', name, err.errMsg);
    });

    audio.onEnded(() => {
      if (!options.loop) {
        audio.destroy();
        delete audioContexts[name];
      }
    });

    audio.play();
    audioContexts[name] = audio;
    return audio;
  } catch (e) {
    console.log('音效初始化失败', name, e);
    return null;
  }
}

/** 播放连击音效（combo 越大音调越高） */
function playCombo(combo) {
  const idx = Math.min(10, Math.max(1, combo));
  return play('COMBO_' + idx, { volume: 0.5 });
}

/**
 * 停止音效
 */
function stop(name) {
  if (audioContexts[name]) {
    try {
      audioContexts[name].stop();
      audioContexts[name].destroy();
    } catch (e) {}
    delete audioContexts[name];
  }
}

/**
 * 停止所有音效
 */
function stopAll() {
  Object.keys(audioContexts).forEach(name => stop(name));
}

/**
 * 设置全局音量
 */
function setVolume(volume) {
  Object.values(audioContexts).forEach(audio => {
    try { audio.volume = Math.max(0, Math.min(1, volume)); } catch (e) {}
  });
}

/**
 * 预加载（懒初始化，首次播放时生成音效）
 */
function preload() {
  initSounds();
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
