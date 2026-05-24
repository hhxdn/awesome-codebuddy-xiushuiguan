// pages/settings/settings.js - 设置页面
const app = getApp();
const storage = require('../../utils/storage');
const audio = require('../../utils/audio');

Page({
  data: {
    soundEnabled: true,
    vibrateEnabled: true
  },

  onShow() {
    this.setData({
      soundEnabled: app.globalData.soundEnabled,
      vibrateEnabled: app.globalData.vibrateEnabled
    });
  },

  // 音效开关
  onSoundChange(e) {
    const enabled = e.detail.value;
    app.globalData.soundEnabled = enabled;
    storage.setSoundEnabled(enabled);
    this.setData({ soundEnabled: enabled });

    if (!enabled) {
      audio.stopAll();
    }
  },

  // 震动开关
  onVibrateChange(e) {
    const enabled = e.detail.value;
    app.globalData.vibrateEnabled = enabled;
    storage.setVibrateEnabled(enabled);
    this.setData({ vibrateEnabled: enabled });
  },

  // 清除游戏缓存
  onClearCache() {
    wx.showModal({
      title: '确认清除',
      content: '清除后所有游戏进度将被重置，且无法恢复。确定要清除吗？',
      confirmText: '确定清除',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          storage.clearAllCache();
          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 游戏说明
  onGameGuide() {
    wx.showModal({
      title: '游戏说明',
      content: '🎯 目标：维修所有漏水的水管！\n\n👆 操作：手指滑动控制工人移动\n\n🔧 领取扳手：靠近维修车点击按钮\n\n🔨 维修：靠近漏水水管，消耗扳手\n\n💧 积水：从漏水处扩散，踩上持续掉血\n\n⚠️ 血量归零/时间耗尽/积水过多则失败\n\n🌟 根据通关用时评定1-3星',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 隐私政策
  onPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '本游戏尊重并保护所有用户的个人隐私权。\n\n1. 信息收集：可能会收集微信昵称、头像等基本信息，仅用于排行榜展示。\n2. 信息使用：仅用于提升游戏体验，不用于商业用途。\n3. 信息披露：不向第三方披露。\n4. 信息安全：采用行业标准安全措施保护信息。\n5. 广告服务：可能包含第三方广告SDK。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 返回首页
  onBackHome() {
    wx.navigateBack();
  },

  // 关于
  onAbout() {
    wx.showModal({
      title: '关于水管维修工',
      content: '版本：1.0.0\n\n一款休闲闯关小游戏\n在10000关的挑战中\n成为最强的水管维修工！\n\n©2026 水管维修工',
      showCancel: false,
      confirmText: '好的'
    });
  }
});
