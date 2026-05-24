// utils/request.js - 网络请求封装
const app = getApp();

const baseUrl = 'http://127.0.0.1:8080';

/**
 * 发起HTTP请求
 */
function request(options) {
  const token = app.getToken();

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      data: options.data || {},
      method: options.method || 'GET',
      header: {
        'content-type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.code === 0) {
            resolve(res.data.data);
          } else {
            wx.showToast({
              title: res.data.msg || '请求失败',
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
  baseUrl,
  request,
  get,
  post,
  put,
  del
};
