// utils/level.js - 关卡生成算法
// 支持200关，每关参数变化剧烈，确保玩家明显感受不同难度

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

  // 每2关增加1个水管，变化更明显
  const pipeCount = Math.min(40, 3 + Math.floor(n / 2));
  // 漏水点数紧跟水管数，每2关增加1处
  const leakCount = Math.min(pipeCount, Math.max(1, 1 + Math.floor(n / 2)));

  const config = {
    level: n,
    // 场景类型：5种场景逐关轮换
    sceneType: n % 5,

    // 水管总数：基础3个 + 每2关增加1个，上限40个（第1关:3, 第200关:40）
    pipeCount,

    // 初始漏水数：基础1个 + 每2关增加1个，和水管同步增长
    leakCount,

    // 单次领取扳手数：开始8个，每25关减少1个，最少1个
    // 第1关:8 第50关:6 第100关:4 第150关:2 第200关:1
    wrenchPerPickup: Math.max(1, 8 - Math.floor(n / 25)),

    // 关卡时限（秒）：开始150秒，每关减少0.7秒，最低15秒
    // 第1关:150 第50关:115 第100关:80 第150关:45 第200关:15
    timeLimit: Math.max(15, Math.floor(150 - n * 0.7)),

    // 积水速度系数：基础1，每关增加0.015（原0.005，3倍增速）
    // 第1关:1.015 第50关:1.75 第100关:2.5 第150关:3.25 第200关:4.0
    waterSpeed: 1 + n * 0.015,

    // 爆管概率：最大0.5，起始0.01，每关增加0.003
    // 第1关:1.3% 第50关:16% 第100关:31% 第150关:46% 第200关:50%
    burstProb: Math.min(0.5, 0.01 + n * 0.003),

    // 维修所需时间（帧数，60fps）：每关增加1帧，越来越难修
    // 第1关:21帧 第50关:70帧 第100关:120帧 第200关:220帧
    repairFrames: Math.max(15, 20 + n),

    // 积水扩散间隔（帧）：大幅递减，越往后积水蔓延越快
    // 第1关:18帧 第50关:11帧 第100关:8帧 第150关:6帧 第200关:5帧
    waterSpreadInterval: Math.max(3, Math.floor(20 / (1 + n * 0.015))),

    // 血量掉落速度：随关卡递增
    // 第1关:10 第50关:17 第100关:25 第150关:32 第200关:40
    hpLossRate: Math.min(40, Math.floor(10 + n * 0.15)),
  };

  // 星级评定时间阈值：基于当前关卡时限的百分比，确保所有关卡都理论可达
  // 3星: 时限的20%  2星: 时限的40%  1星: 时限的70%
  config.starThresholds = {
    three: Math.max(5, Math.floor(config.timeLimit * 0.2)),
    two: Math.max(8, Math.floor(config.timeLimit * 0.4)),
    one: Math.max(12, Math.floor(config.timeLimit * 0.7))
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
