// utils/level.js - 关卡生成算法
// 支持200关，每关参数变化明显，确保玩家感受不同

/**
 * 奖励配置：根据星级和关卡号计算奖励
 */
const REWARD_CONFIG = {
  coinsPerStar: [5, 15, 30],      // [1星, 2星, 3星] 基础金币
  levelBonus: [0, 1, 2],          // 每关额外金币乘数
  firstClearBonus: 20,            // 首次通关额外金币
};

/**
 * 获取关卡配置
 * @param {number} n - 关卡号 (1-200)
 * @returns {object} 关卡配置
 */
function getLevelConfig(n) {
  if (n < 1 || n > 200) {
    n = 1;
  }

  // 每3关增加1个水管，每关都有变化感
  const pipeCount = Math.min(30, 2 + Math.floor(n / 3));
  // 每4关增加1个漏水点，确保每关不同
  const leakCount = Math.min(pipeCount, Math.max(1, Math.floor(n / 4)));

  const config = {
    level: n,
    // 场景类型：5种场景逐关轮换
    sceneType: n % 5,

    // 水管总数：基础2个 + 每3关增加1个，上限30个
    pipeCount,

    // 初始漏水数：每4关增加1个，不超过水管总数
    leakCount,

    // 单次领取扳手数：开始6个，每40关减少1个，最少2个
    wrenchPerPickup: Math.max(2, 6 - Math.floor(n / 40)),

    // 关卡时限（秒）：开始120秒，每关减少0.3秒，最低25秒
    timeLimit: Math.max(25, Math.floor(120 - n * 0.3)),

    // 积水速度系数：基础1，每关增加0.005（明显增长）
    waterSpeed: 1 + n * 0.005,

    // 爆管概率：最大0.35，起始0.005，每关增加0.0015
    burstProb: Math.min(0.35, 0.005 + n * 0.0015),

    // 维修所需时间（帧数，60fps）：每3关增加1帧
    repairFrames: Math.max(15, 30 + Math.floor(n / 3)),

    // 积水扩散间隔（帧）：随关卡递减
    waterSpreadInterval: Math.max(6, Math.floor(20 / (1 + n * 0.005))),

    // 血量掉落速度：踩积水每秒扣HP
    hpLossRate: 10,

    // 星级评定时间阈值（秒）：每关递增0.1秒
    starThresholds: {
      three: Math.floor(n * 0.1 + 8),
      two: Math.floor(n * 0.1 + 18),
      one: Math.floor(n * 0.1 + 28)
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

/**
 * 计算通关奖励
 * @param {number} stars - 星级 (1-3)
 * @param {number} level - 关卡号
 * @param {boolean} isFirstClear - 是否首次通关
 * @returns {object} { coins, items, message }
 */
function calcReward(stars, level, isFirstClear) {
  const starIndex = Math.min(stars, 3) - 1;
  let coins = REWARD_CONFIG.coinsPerStar[starIndex] + level * REWARD_CONFIG.levelBonus[starIndex];
  if (isFirstClear) {
    coins += REWARD_CONFIG.firstClearBonus;
  }

  let message = '';
  if (stars === 3) {
    message = isFirstClear
      ? `完美通关！获得 ${coins} 金币（含首次通关奖励）`
      : `完美通关！获得 ${coins} 金币`;
  } else if (stars === 2) {
    message = isFirstClear
      ? `不错表现！获得 ${coins} 金币（含首次通关奖励）`
      : `不错表现！获得 ${coins} 金币`;
  } else {
    message = isFirstClear
      ? `通关成功！获得 ${coins} 金币（含首次通关奖励）`
      : `通关成功！获得 ${coins} 金币`;
  }

  return { coins, items: [], message };
}

module.exports = {
  getLevelConfig,
  calcStars,
  calcReward,
  getLevelDescription,
  isSolvable,
  REWARD_CONFIG
};
