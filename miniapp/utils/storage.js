// utils/storage.js - 本地存储管理

// 安全读写封装 - 解决 wx.getStorageSync key不存在时抛异常的问题
function safeGet(key, defaultValue = null) {
  try {
    const val = wx.getStorageSync(key);
    return val !== '' ? val : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.error('Storage 写入失败', key, e);
  }
}

function safeRemove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    console.error('Storage 删除失败', key, e);
  }
}

const KEYS = {
  HIGHEST_LEVEL: 'highestLevel',       // 最高通关关卡
  GAME_PROGRESS: 'gameProgress',       // 游戏进度 {level, stars}
  SOUND_ENABLED: 'soundEnabled',       // 音效开关
  VIBRATE_ENABLED: 'vibrateEnabled',   // 震动开关
  TOKEN: 'token',                      // 登录token
  USER_INFO: 'userInfo',               // 用户信息
  LEVEL_STARS: 'levelStars'            // 各关卡星级 {level: stars}
};

/**
 * 获取最高通关关卡
 */
function getHighestLevel() {
  return safeGet(KEYS.HIGHEST_LEVEL, 0);
}

/**
 * 设置最高通关关卡
 */
function setHighestLevel(level) {
  const current = getHighestLevel();
  if (level > current) {
    safeSet(KEYS.HIGHEST_LEVEL, level);
  }
}

/**
 * 获取游戏进度
 */
function getGameProgress() {
  return safeGet(KEYS.GAME_PROGRESS, { level: 1, stars: {} });
}

/**
 * 保存游戏进度
 */
function saveGameProgress(level, stars) {
  const progress = getGameProgress();
  if (level > progress.level) {
    progress.level = level;
  }
  // 保存最高星级
  if (stars && !progress.stars) progress.stars = {};
  if (stars) {
    const prev = (progress.stars[level] || 0);
    if (stars > prev) {
      progress.stars[level] = stars;
    }
  }
  safeSet(KEYS.GAME_PROGRESS, progress);
  // 同时更新最高关卡
  if (level > getHighestLevel()) {
    setHighestLevel(level);
  }
}

/**
 * 获取指定关卡星级
 */
function getLevelStars(level) {
  const progress = getGameProgress();
  return (progress.stars && progress.stars[level]) || 0;
}

/**
 * 获取音效设置
 */
function getSoundEnabled() {
  return safeGet(KEYS.SOUND_ENABLED, true);
}

/**
 * 设置音效开关
 */
function setSoundEnabled(enabled) {
  safeSet(KEYS.SOUND_ENABLED, enabled);
}

/**
 * 获取震动设置
 */
function getVibrateEnabled() {
  return safeGet(KEYS.VIBRATE_ENABLED, true);
}

/**
 * 设置震动开关
 */
function setVibrateEnabled(enabled) {
  safeSet(KEYS.VIBRATE_ENABLED, enabled);
}

/**
 * 清除所有游戏缓存进度
 */
function clearAllCache() {
  safeRemove(KEYS.HIGHEST_LEVEL);
  safeRemove(KEYS.GAME_PROGRESS);
  safeRemove(KEYS.LEVEL_STARS);
}

/**
 * 是否首次游戏
 */
function isFirstGame() {
  return getHighestLevel() === 0;
}

module.exports = {
  KEYS,
  getHighestLevel,
  setHighestLevel,
  getGameProgress,
  saveGameProgress,
  getLevelStars,
  getSoundEnabled,
  setSoundEnabled,
  getVibrateEnabled,
  setVibrateEnabled,
  clearAllCache,
  isFirstGame
};
