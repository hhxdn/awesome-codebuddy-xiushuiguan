// pages/levels/levels.js - 关卡选择页
const storage = require('../../utils/storage');
const audio = require('../../utils/audio');

const LEVELS_PER_PAGE = 15;
const TOTAL_LEVELS = 10000;
const TOTAL_PAGES = Math.ceil(TOTAL_LEVELS / LEVELS_PER_PAGE);

Page({
  data: {
    currentPage: 0,
    totalPages: TOTAL_PAGES,
    highestLevel: 0,
    levelStars: {},
    levels: [],
    showTip: false
  },

  onLoad() {
    this.loadPageData();
  },

  onShow() {
    this.loadPageData();
  },

  loadPageData() {
    const highestLevel = storage.getHighestLevel();
    const progress = storage.getGameProgress();
    const levelStars = progress.stars || {};

    // 计算当前页应该从哪开始（如果通关超过当前页范围，自动跳转）
    let currentPage = this.data.currentPage || 0;
    const maxPageOfHighest = Math.floor(highestLevel / LEVELS_PER_PAGE);
    if (maxPageOfHighest > currentPage && currentPage === 0) {
      currentPage = maxPageOfHighest;
    }

    this.generateLevels(currentPage, highestLevel, levelStars);
  },

  generateLevels(page, highestLevel, levelStars) {
    const start = page * LEVELS_PER_PAGE + 1;
    const end = Math.min(start + LEVELS_PER_PAGE - 1, TOTAL_LEVELS);
    const levels = [];

    for (let i = start; i <= end; i++) {
      const unlocked = i <= highestLevel + 1;
      const cleared = i <= highestLevel;
      const current = i === highestLevel + 1;
      const stars = levelStars[i] || 0;

      levels.push({
        level: i,
        unlocked,
        cleared,
        current,
        stars
      });
    }

    this.setData({
      levels,
      currentPage: page,
      highestLevel
    });
  },

  // 上一页
  onPrevPage() {
    if (this.data.currentPage > 0) {
      audio.play('CLICK');
      const progress = storage.getGameProgress();
      this.generateLevels(
        this.data.currentPage - 1,
        this.data.highestLevel,
        progress.stars || {}
      );
    }
  },

  // 下一页
  onNextPage() {
    if (this.data.currentPage < TOTAL_PAGES - 1) {
      audio.play('CLICK');
      const progress = storage.getGameProgress();
      this.generateLevels(
        this.data.currentPage + 1,
        this.data.highestLevel,
        progress.stars || {}
      );
    }
  },

  // 选择关卡
  onSelectLevel(e) {
    const item = e.currentTarget.dataset.item;
    if (!item.unlocked) {
      wx.showToast({
        title: '请先通关前置关卡',
        icon: 'none'
      });
      return;
    }
    audio.play('CLICK');
    wx.navigateTo({
      url: `/pages/game/game?level=${item.level}`
    });
  },

  // 跳转到最后一页（已通关的最高关卡所在页）
  onGoToLatest() {
    audio.play('CLICK');
    const maxPage = Math.floor(this.data.highestLevel / LEVELS_PER_PAGE);
    const progress = storage.getGameProgress();
    this.generateLevels(maxPage, this.data.highestLevel, progress.stars || {});
  },

  // 页面提示
  onShowTip() {
    this.setData({ showTip: !this.data.showTip });
  }
});
