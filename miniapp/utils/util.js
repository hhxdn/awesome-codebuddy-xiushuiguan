// utils/util.js - 通用工具函数

/**
 * 格式化时间（秒 -> MM:SS）
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${padZero(m)}:${padZero(s)}`;
}

/**
 * 数字补零
 */
function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

/**
 * 计算两点距离
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/**
 * 判断两个矩形是否碰撞
 */
function rectCollide(r1, r2) {
  return !(r1.x + r1.w < r2.x || r2.x + r2.w < r1.x ||
           r1.y + r1.h < r2.y || r2.y + r2.h < r1.y);
}

/**
 * 判断点是否在矩形内
 */
function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * 在范围内随机整数
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 在范围内随机浮点数
 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * clamp
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * 线性插值
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * 颜色插值（用于渐变）
 */
function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.floor(lerp(r1, r2, t));
  const g = Math.floor(lerp(g1, g2, t));
  const b = Math.floor(lerp(b1, b2, t));
  return (r << 16) | (g << 8) | b;
}

/**
 * 将秒转为友好文本
 */
function secondsToText(seconds) {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

/**
 * 防抖
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流
 */
function throttle(fn, interval = 300) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 显示Loading
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏Loading
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示提示
 */
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 });
}

/**
 * 显示确认弹窗
 */
function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => resolve(res.confirm)
    });
  });
}

/**
 * 获取系统信息
 */
function getSystemInfo() {
  try {
    return wx.getSystemInfoSync();
  } catch (e) {
    return { windowWidth: 375, windowHeight: 667, pixelRatio: 2 };
  }
}

module.exports = {
  formatTime,
  padZero,
  distance,
  rectCollide,
  pointInRect,
  randomInt,
  randomFloat,
  clamp,
  lerp,
  lerpColor,
  secondsToText,
  debounce,
  throttle,
  showLoading,
  hideLoading,
  showToast,
  showConfirm,
  getSystemInfo
};
