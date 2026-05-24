// pages/index/index.js - 游戏首页
const app = getApp();
const storage = require('../../utils/storage');
const audio = require('../../utils/audio');

Page({
  data: {
    highestLevel: 0,
    statusBarHeight: 0,
    showPrivacy: false
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      highestLevel: storage.getHighestLevel()
    });
  },

  onShow() {
    this.setData({
      highestLevel: storage.getHighestLevel()
    });
  },

  // 开始游戏 - 跳转到当前最高关卡
  onStartGame() {
    audio.play('CLICK');
    const level = Math.max(1, this.data.highestLevel + 1);
    wx.navigateTo({
      url: `/pages/game/game?level=${level}`
    });
  },

  // 关卡选择
  onLevelSelect() {
    audio.play('CLICK');
    wx.navigateTo({
      url: '/pages/levels/levels'
    });
  },

  // 设置
  onSettings() {
    audio.play('CLICK');
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 好友排行
  onRanking() {
    audio.play('CLICK');
    wx.navigateTo({
      url: '/pages/ranking/ranking'
    });
  },

  // 查看隐私政策
  onPrivacyPolicy() {
    this.setData({ showPrivacy: true });
  },

  onClosePrivacy() {
    this.setData({ showPrivacy: false });
  },

  // 广告加载成功
  onAdLoad(e) {
    console.log('广告加载成功', e.detail)
  },

  // 广告加载错误
  onAdError(e) {
    console.error('广告加载错误', e.detail)
  },

  // 阻止弹窗冒泡
  stopPropagation() {}
});
