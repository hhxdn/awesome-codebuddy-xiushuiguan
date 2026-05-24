// utils/level.js - 关卡生成算法
// 支持10000关，根据关卡号计算各项参数

/**
 * 获取关卡配置
 * @param {number} n - 关卡号 (1-10000)
 * @returns {object} 关卡配置
 */
function getLevelConfig(n) {
  if (n < 1 || n > 10000) {
    n = 1;
  }

  const config = {
    level: n,
    // 场景类型：根据关卡号轮换
    sceneType: n % 3,

    // 水管总数：基础2个 + 每100关增加1个，上限25个
    pipeCount: Math.min(25, 2 + Math.floor(n / 100)),

    // 初始漏水数：最少2个，每50关增加1个
    leakCount: Math.max(2, Math.floor(n / 50)),

    // 单次领取扳手数：开始时3个，每2000关减少1个，最少1个
    wrenchPerPickup: Math.max(1, 3 - Math.floor(n / 2000)),

    // 关卡时限（秒）：开始120秒，每关减少0.008秒，最低40秒
    timeLimit: Math.max(40, Math.floor(120 - n * 0.008)),

    // 积水速度系数：基础1，每关增加0.0005
    waterSpeed: 1 + n * 0.0005,

    // 爆管概率：最大0.3
    burstProb: Math.min(0.3, n * 0.003),

    // 维修所需时间（帧数，60fps）：随关卡增加而增加
    repairFrames: Math.max(30, 60 + Math.floor(n / 50)),

    // 积水扩散间隔（帧）：随速度系数递减
    waterSpreadInterval: Math.max(10, Math.floor(30 / (1 + n * 0.001))),

    // 血量掉落速度：踩积水每秒扣HP
    hpLossRate: 10,

    // 星级评定时间阈值（秒）
    starThresholds: {
      three: Math.floor(n * 0.01 + 15),
      two: Math.floor(n * 0.01 + 25),
      one: Math.floor(n * 0.01 + 35)
    }
  };

  return config;
}

/**
 * 根据通关时间和关卡配置计算星星数
 * @param {number} clearedTime - 通关用时（秒）
 * @param {object} config - 关卡配置
 * @returns {number} 1-3 星
 */
function calcStars(clearedTime, config) {
  if (clearedTime <= config.starThresholds.three) return 3;
  if (clearedTime <= config.starThresholds.two) return 2;
  return 1;
}

/**
 * 获取关卡描述
 * @param {number} n
 * @returns {string}
 */
function getLevelDescription(n) {
  const config = getLevelConfig(n);
  let scene = '';
  switch (config.sceneType) {
    case 0: scene = '维修车在左侧'; break;
    case 1: scene = '维修车在中间'; break;
    case 2: scene = '维修车在右下角'; break;
  }
  return `第${n}关 - 水管${config.pipeCount}个 | 漏水${config.leakCount}处 | ${scene}`;
}

/**
 * 检查关卡是否理论上可通关
 * @param {object} config
 * @returns {boolean}
 */
function isSolvable(config) {
  // 检查扳手是否足够维修所有漏水
  // 在最坏情况下，假设每维修一个漏水就爆管一个新漏水
  const totalLeaks = config.leakCount;
  const maxBursts = Math.floor(config.pipeCount * config.burstProb);
  const totalNeed = totalLeaks + maxBursts;
  // 粗略估计：每个扳手维修一个漏水
  const maxPickups = Math.floor(config.timeLimit / 5); // 大约每5秒能领一次
  const totalWrenches = maxPickups * config.wrenchPerPickup;
  return totalWrenches >= totalNeed;
}

module.exports = {
  getLevelConfig,
  calcStars,
  getLevelDescription,
  isSolvable
};
