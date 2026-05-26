// utils/audio.js - 音效管理（使用 Kenney 免费音效素材包，CC0 许可）
// 音效文件位于 /audio/sounds/ 目录下

// 音效文件映射
const SOUND_MAP = {
  REPAIR:    '/audio/sounds/repair.mp3',
  WRENCH:    '/audio/sounds/wrench.mp3',
  CLEAR:     '/audio/sounds/clear.mp3',
  FAIL:      '/audio/sounds/fail.mp3',
  CLICK:     '/audio/sounds/click.mp3',
  WATER:     '/audio/sounds/water.mp3',
  BURST:     '/audio/sounds/burst.mp3',
  COUNTDOWN: '/audio/sounds/countdown.mp3',
  POWERUP:   '/audio/sounds/powerup.mp3'
};

// 连击音效（combo 1-10）
for (let c = 1; c <= 10; c++) {
  SOUND_MAP['COMBO_' + c] = '/audio/sounds/combo_' + c + '.mp3';
}

let globalVolume = 0.6;

// 活跃的音频实例列表，用于 stopAll
const _activeContexts = [];

/**
 * 播放音效
 * @param {string} name - 音效名称
 * @param {object} options - { loop, volume }
 */
function play(name, options = {}) {
  let app;
  try { app = getApp(); } catch (e) {}
  const soundEnabled = app ? app.globalData.soundEnabled : true;
  if (!soundEnabled) return null;

  const src = SOUND_MAP[name];
  if (!src) {
    console.warn('[audio] 未知音效:', name);
    return null;
  }

  try {
    const innerCtx = wx.createInnerAudioContext({
      useWebAudioImplement: true // 使用 Web Audio 实现，兼容性更好
    });
    innerCtx.src = src;
    innerCtx.volume = options.volume !== undefined ? options.volume : globalVolume;
    innerCtx.loop = options.loop || false;
    // 关键：不遵守手机静音开关，确保音效始终可播放
    innerCtx.obeyMuteSwitch = false;

    innerCtx.onCanplay(() => {
      innerCtx.play();
    });
    innerCtx.onEnded(() => {
      const idx = _activeContexts.indexOf(innerCtx);
      if (idx > -1) _activeContexts.splice(idx, 1);
      innerCtx.destroy();
    });
    innerCtx.onError((err) => {
      console.error('[audio] 播放失败:', name, src, JSON.stringify(err));
      const idx = _activeContexts.indexOf(innerCtx);
      if (idx > -1) _activeContexts.splice(idx, 1);
      innerCtx.destroy();
    });

    _activeContexts.push(innerCtx);
    // 限制同时存在的音频实例，防止过多叠加
    while (_activeContexts.length > 8) {
      const old = _activeContexts.shift();
      try { old.destroy(); } catch (e) {}
    }

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

/** 停止所有活跃音频 */
function stopAll() {
  while (_activeContexts.length > 0) {
    const ctx = _activeContexts.shift();
    try { ctx.destroy(); } catch (e) {}
  }
}

function stop(name) {
  // 按音效名停止对应的活跃实例
  const src = SOUND_MAP[name];
  if (!src) return;
  for (let i = _activeContexts.length - 1; i >= 0; i--) {
    if (_activeContexts[i].src && _activeContexts[i].src.indexOf(src) !== -1) {
      try { _activeContexts[i].destroy(); } catch (e) {}
      _activeContexts.splice(i, 1);
    }
  }
}

function preload() {
  // 小程序不支持传统预加载，无需处理
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
