// utils/audio.js - 音效管理
const app = getApp();

// 音效资源路径
const SOUNDS = {
  REPAIR: '/assets/sounds/repair.mp3',       // 维修音效
  WRENCH: '/assets/sounds/wrench.mp3',       // 领取扳手
  CLEAR: '/assets/sounds/clear.mp3',         // 通关
  FAIL: '/assets/sounds/fail.mp3',           // 失败
  CLICK: '/assets/sounds/click.mp3',         // 点击
  WATER: '/assets/sounds/water.mp3',         // 漏水
  BURST: '/assets/sounds/burst.mp3',         // 爆管
  COUNTDOWN: '/assets/sounds/countdown.mp3'  // 倒计时警告
};

// 音频上下文缓存
let audioContexts = {};

/**
 * 播放音效
 * @param {string} name - 音效名称
 * @param {object} options - { loop, volume }
 */
function play(name, options = {}) {
  // 检查音效开关
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
      // 音效文件可能不存在，静默处理
      console.log('音效播放失败', name, err);
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
 * 预加载音效（在app启动时调用）
 */
function preload() {
  // 微信小程序不支持预加载 innerAudioContext
  // 音效在首次播放时加载
}

module.exports = {
  SOUNDS,
  play,
  stop,
  stopAll,
  setVolume,
  preload
};
