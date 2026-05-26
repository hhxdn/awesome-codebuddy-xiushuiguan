// utils/audio.js - 音效管理（WebAudio API 直接播放，无需文件 I/O）

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

// ========== 音效资源管理 ==========
const RAW_SAMPLES = {}; // 存储原始 Float32Array 采样
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

// ========== WebAudio 播放引擎 ==========
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    try {
      // 微信小程序 WebAudio API（基础库 >= 2.19.0）
      audioCtx = wx.createWebAudioContext();
    } catch (e) {
      console.error('创建WebAudioContext失败:', e);
      return null;
    }
  }
  return audioCtx;
}

// 预创建的 AudioBuffer 缓存
const bufferCache = {};

function getBuffer(name) {
  if (bufferCache[name]) return bufferCache[name];
  const ctx = getAudioContext();
  if (!ctx) return null;
  const samples = RAW_SAMPLES[name];
  if (!samples) return null;
  const buffer = ctx.createBuffer(1, samples.length, SR);
  buffer.getChannelData(0).set(samples);
  bufferCache[name] = buffer;
  return buffer;
}

/** 全局音量 */
let globalVolume = 0.6;

/**
 * 播放音效
 * @param {string} name - 音效名称
 * @param {object} options - { loop, volume }
 * @returns {object|null} source节点（可用于停止）
 */
function play(name, options = {}) {
  if (!_initialized) initSounds();

  let app;
  try { app = getApp(); } catch (e) {}
  const soundEnabled = app ? app.globalData.soundEnabled : true;
  if (!soundEnabled) return null;

  const ctx = getAudioContext();
  if (!ctx) return null;

  const buffer = getBuffer(name);
  if (!buffer) return null;

  try {
    // 确保 AudioContext 处于运行状态
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop || false;

    const gainNode = ctx.createGain();
    gainNode.gain.value = options.volume !== undefined ? options.volume : globalVolume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);

    // 非循环播放完后自动清理
    if (!options.loop) {
      source.onended = () => {
        try { gainNode.disconnect(); } catch (e) {}
      };
    }

    return { source, gain: gainNode };
  } catch (e) {
    console.error('音效播放失败', name, e);
    return null;
  }
}

/** 播放连击音效 */
function playCombo(combo) {
  const idx = Math.min(10, Math.max(1, combo));
  return play('COMBO_' + idx, { volume: 0.5 });
}

/**
 * 设置全局音量
 */
function setVolume(volume) {
  globalVolume = Math.max(0, Math.min(1, volume));
}

/**
 * 停止所有音效（重置 AudioContext）
 */
function stopAll() {
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  }
}

/** 停止某音效（WebAudio 按名称无法精确停止，提供空实现保持兼容） */
function stop(name) {
  // 对于 WebAudio 的 BufferSource，一旦 play 就无法单独停止
  // 这里通过重建 AudioContext 实现 stopAll 效果更可靠
}

/**
 * 预加载
 */
function preload() {
  initSounds();
  // 预热所有 buffer
  Object.keys(RAW_SAMPLES).forEach(name => getBuffer(name));
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
