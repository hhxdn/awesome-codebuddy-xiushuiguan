// components/victory-dialog/victory-dialog.js - 通关胜利弹窗
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    stars: {
      type: Number,
      value: 3
    },
    level: {
      type: Number,
      value: 1
    },
    timeUsed: {
      type: Number,
      value: 0
    },
    // 奖励相关
    rewardCoins: {
      type: Number,
      value: 0
    },
    rewardMessage: {
      type: String,
      value: ''
    },
    totalCoins: {
      type: Number,
      value: 0
    },
    isFirstClear: {
      type: Boolean,
      value: false
    }
  },

  data: {
    animData: {},
    showStars: false,
    showReward: false
  },

  lifetimes: {
    attached() {
      // 星星动画延迟显示
      setTimeout(() => {
        this.setData({ showStars: true });
      }, 300);
    }
  },

  observers: {
    'show, rewardCoins'(show, coins) {
      if (show && coins > 0) {
        // 奖励动画延迟出现
        setTimeout(() => {
          this.setData({ showReward: true });
        }, 800);
      } else {
        this.setData({ showReward: false });
      }
    }
  },

  methods: {
    onNextLevel() {
      this.triggerEvent('next');
    },

    onReplay() {
      this.triggerEvent('replay');
    },

    onShare() {
      this.triggerEvent('share');
    },

    onRewardAd() {
      this.triggerEvent('watchad');
    },

    // 阻止冒泡
    stopPropagation() {}
  }
});
