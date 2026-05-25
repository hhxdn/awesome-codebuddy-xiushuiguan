// utils/request.js - 网络请求封装

const BASE_URL = 'http://127.0.0.1:6001';

/**
 * 获取baseUrl（运行时动态获取，避免模块加载时getApp()未就绪）
 */
function getBaseUrl() {
  try {
    const app = getApp();
    return (app && app.globalData && app.globalData.baseUrl) || BASE_URL;
  } catch (e) {
    return BASE_URL;
  }
}

/**
 * 发起HTTP请求
 */
function request(options) {
  let app;
  try { app = getApp(); } catch (e) {}
  const token = app ? app.getToken() : '';

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${options.url}`,
      data: options.data || {},
      method: options.method || 'GET',
      header: {
        'content-type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.code === 200) {
            resolve(res.data.data);
          } else {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            });
            reject(res.data);
          }
        } else if (res.statusCode === 401) {
          // token过期，重新登录
          app.wxLogin();
          reject({ code: 401, msg: '登录已过期' });
        } else {
          reject({ code: res.statusCode, msg: '服务器异常' });
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络异常，请检查网络',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

/**
 * GET请求
 */
function get(url, data = {}) {
  return request({ url, data, method: 'GET' });
}

/**
 * POST请求
 */
function post(url, data = {}) {
  return request({ url, data, method: 'POST' });
}

/**
 * PUT请求
 */
function put(url, data = {}) {
  return request({ url, data, method: 'PUT' });
}

/**
 * DELETE请求
 */
function del(url, data = {}) {
  return request({ url, data, method: 'DELETE' });
}

module.exports = {
  getBaseUrl,
  BASE_URL,
  request,
  get,
  post,
  put,
  del
};
