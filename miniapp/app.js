// app.js - 水管维修工微信小游戏
App({
  globalData: {
    userInfo: null,
    token: '',
    openid: '',
    baseUrl: 'http://127.0.0.1:6001',
    soundEnabled: true,
    vibrateEnabled: true,
    maxLevel: 200
  },

  onLaunch() {
    // 恢复本地设置（safeGetStorageSync 处理 key 不存在抛异常的问题）
    const soundEnabled = this.safeGetStorage('soundEnabled');
    const vibrateEnabled = this.safeGetStorage('vibrateEnabled');
    if (soundEnabled !== null) this.globalData.soundEnabled = soundEnabled;
    if (vibrateEnabled !== null) this.globalData.vibrateEnabled = vibrateEnabled;

    // 微信登录
    this.wxLogin();
  },

  wxLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: `${this.globalData.baseUrl}/api/user/login`,
            method: 'POST',
            data: { code: res.code },
            header: { 'content-type': 'application/json' },
            success: (resp) => {
              if (resp.data && resp.data.code === 200) {
                const user = resp.data.data;
                // 后端返回的是User对象，作为userInfo存储
                this.globalData.userInfo = user;
                this.globalData.openid = user.openid || '';
                // token暂存为openid（后续可扩展为JWT）
                this.globalData.token = user.openid || '';
                this.safeSetStorage('token', this.globalData.token);
                this.safeSetStorage('userInfo', user);
                console.log('登录成功，userId:', user.id);
              }
            },
            fail: (err) => {
              console.error('登录失败', err);
            }
          });
        }
      },
      fail: (err) => {
        console.error('wx.login 调用失败', err);
      }
    });
  },

  // 获取全局token
  getToken() {
    return this.globalData.token || this.safeGetStorage('token') || '';
  },

  // 安全读取 Storage（key 不存在不会抛异常）
  safeGetStorage(key) {
    try {
      return wx.getStorageSync(key);
    } catch (e) {
      return null;
    }
  },

  // 安全写入 Storage
  safeSetStorage(key, value) {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.error('Storage 写入失败', key, e);
    }
  },

  // 播放音效
  playSound(src) {
    if (!this.globalData.soundEnabled) return;
    // 由 audio.js 处理
  },

  // 触发震动
  vibrate(type) {
    if (!this.globalData.vibrateEnabled) return;
    if (type === 'light') {
      wx.vibrateShort({ type: 'light' });
    } else if (type === 'heavy') {
      wx.vibrateShort({ type: 'heavy' });
    } else {
      wx.vibrateLong();
    }
  }
});
