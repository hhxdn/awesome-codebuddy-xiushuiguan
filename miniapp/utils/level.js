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

  const pipeCount = Math.min(30, 2 + Math.floor(n / 5));
  const leakCount = Math.min(pipeCount, Math.max(1, Math.floor(n / 8)));

  const config = {
    level: n,
    // 场景类型：根据关卡号轮换（5种场景，每关轮换）
    sceneType: n % 5,

    // 水管总数：基础2个 + 每5关增加1个，上限30个
    pipeCount,

    // 初始漏水数：每8关增加1个，不超过水管总数，最少1个
    leakCount,

    // 单次领取扳手数：开始时5个，每1000关减少1个，最少2个
    wrenchPerPickup: Math.max(2, 5 - Math.floor(n / 1000)),

    // 关卡时限（秒）：开始120秒，每关减少0.015秒，最低30秒
    timeLimit: Math.max(30, Math.floor(120 - n * 0.015)),

    // 积水速度系数：基础1，每关增加0.001
    waterSpeed: 1 + n * 0.001,

    // 爆管概率：最大0.3，起始0.002，每关增加0.003
    burstProb: Math.min(0.3, 0.002 + n * 0.003),

    // 维修所需时间（帧数，60fps）：随关卡增加而增加
    repairFrames: Math.max(20, 40 + Math.floor(n / 8)),

    // 积水扩散间隔（帧）：随速度系数递减
    waterSpreadInterval: Math.max(8, Math.floor(25 / (1 + n * 0.002))),

    // 血量掉落速度：踩积水每秒扣HP
    hpLossRate: 10,

    // 星级评定时间阈值（秒）
    starThresholds: {
      three: Math.floor(n * 0.02 + 10),
      two: Math.floor(n * 0.02 + 20),
      one: Math.floor(n * 0.02 + 30)
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
    case 0: scene = '住宅区 - 维修车在左侧'; break;
    case 1: scene = '商业区 - 维修车在中间'; break;
    case 2: scene = '工业区 - 维修车在右侧'; break;
    case 3: scene = '地下管道 - 维修车在左下角'; break;
    case 4: scene = '河边管道 - 维修车在右下角'; break;
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
