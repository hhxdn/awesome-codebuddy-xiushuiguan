// pages/ranking/ranking.js - 好友排行榜
const app = getApp();
const storage = require('../../utils/storage');
const request = require('../../utils/request');

Page({
  data: {
    myRank: null,
    myScore: 0,
    rankList: [],
    loading: false,
    hasError: false,
    showOpenData: false, // 是否显示开放数据域
    userInfo: null
  },

  onShow() {
    this.loadRanking();
    this.updateUserInfo();
  },

  onPullDownRefresh() {
    this.loadRanking().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 更新当前用户信息
  updateUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 加载排行榜数据
  async loadRanking() {
    this.setData({ loading: true, hasError: false });

    try {
      // 尝试从后端获取排行榜
      const data = await request.get('/api/rank/list', {
        limit: 50
      });

      const list = (data.list || data || []).map((item, index) => ({
        rank: index + 1,
        avatarUrl: item.avatarUrl || '',
        nickName: item.nickName || '匿名玩家',
        highestLevel: item.highestLevel || 0,
        isMe: item.openid === app.globalData.openid
      }));

      // 找自己的排名
      const me = list.find(item => item.isMe);
      this.setData({
        rankList: list,
        myRank: me ? me.rank : null,
        myScore: storage.getHighestLevel(),
        loading: false,
        showOpenData: false
      });
    } catch (e) {
      // 后端不可用时，使用本地数据和开放数据域
      this.setData({
        loading: false,
        hasError: true,
        showOpenData: true,
        myScore: storage.getHighestLevel()
      });
      this.loadOpenDataRanking();
    }
  },

  // 加载开放数据域排行榜
  loadOpenDataRanking() {
    // 通过开放数据域获取好友排行
    // 由于微信开放数据域需要在同域下建立 sharedCanvas
    // 这里作为占位，实际需要使用 open-data 组件
    this.setData({
      rankList: [],
      showOpenData: true
    });
  },

  // 刷新
  onRefresh() {
    this.loadRanking();
  },

  // 返回
  onBack() {
    wx.navigateBack();
  },

  // 分享
  onShare() {
    wx.showShareMenu({
      withShareTicket: true
    });
  },

  onShareAppMessage() {
    const score = this.data.myScore;
    return {
      title: score > 0
        ? `水管维修工 - 我已经闯到第${score}关啦！快来挑战我吧！`
        : '水管维修工 - 一起来挑战10000关！',
      path: '/pages/index/index'
    };
  }
});
