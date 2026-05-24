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
 * 水管类型
 */
const PIPE_TYPE = {
  NORMAL: 'normal',           // 普通水管
  HIGH_PRESSURE: 'high_pressure' // 高压水管：维修慢、积水扩展快、爆管概率高
};

/**
 * 道具类型配置
 */
const POWERUP_TYPES = {
  SPEED_BOOST: {
    key: 'speed_boost',
    icon: '🏃',
    name: '加速鞋',
    color: '#4CAF50',
    duration: 5000,  // 持续5秒
    desc: '移动速度翻倍'
  },
  SHIELD: {
    key: 'shield',
    icon: '🛡️',
    name: '护盾',
    color: '#2196F3',
    duration: 6000,
    desc: '免疫积水伤害'
  },
  FREEZE: {
    key: 'freeze',
    icon: '❄️',
    name: '冻结',
    color: '#00BCD4',
    duration: 5000,
    desc: '积水停止扩散'
  },
  AOE_REPAIR: {
    key: 'aoe_repair',
    icon: '💥',
    name: '范围维修',
    color: '#FF9800',
    duration: 0,  // 一次性效果
    desc: '下次维修修复周围所有漏水'
  },
  COIN_BONUS: {
    key: 'coin_bonus',
    icon: '💰',
    name: '金币加成',
    color: '#FFC107',
    duration: 0,
    desc: '通关额外获得50%金币'
  }
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
  // 高压水管数量：第15关开始出现，每10关增加1个
  const highPressureCount = n >= 15 ? Math.min(Math.floor(pipeCount * 0.4), Math.floor(n / 10)) : 0;

  const config = {
    level: n,
    // 场景类型：5种场景逐关轮换
    sceneType: n % 5,

    // 水管总数：基础3个 + 每2关增加1个，上限40个（第1关:3, 第200关:40）
    pipeCount,

    // 初始漏水数：基础1个 + 每2关增加1个，和水管同步增长
    leakCount,

    // 高压水管数：第15关起出现，最多占40%
    highPressureCount,

    // 单次领取扳手数：开始8个，每25关减少1个，最少1个
    wrenchPerPickup: Math.max(1, 8 - Math.floor(n / 25)),

    // 关卡时限（秒）：开始150秒，每关减少0.7秒，最低15秒
    timeLimit: Math.max(15, Math.floor(150 - n * 0.7)),

    // 积水速度系数：基础1，每关增加0.015
    waterSpeed: 1 + n * 0.015,

    // 爆管概率：最大0.5，起始0.01，每关增加0.003
    burstProb: Math.min(0.5, 0.01 + n * 0.003),

    // 维修所需时间（帧数，60fps）：每关增加1帧
    repairFrames: Math.max(15, 20 + n),

    // 积水扩散间隔（帧）：大幅递减
    waterSpreadInterval: Math.max(3, Math.floor(20 / (1 + n * 0.015))),

    // 血量掉落速度：随关卡递增
    hpLossRate: Math.min(40, Math.floor(10 + n * 0.15)),
  };

  // 星级评定时间阈值：基于当前关卡时限的百分比
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
  REWARD_CONFIG,
  PIPE_TYPE,
  POWERUP_TYPES
};
