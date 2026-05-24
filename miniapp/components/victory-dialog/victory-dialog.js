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
    }
  },

  data: {
    animData: {},
    showStars: false
  },

  lifetimes: {
    attached() {
      // 星星动画延迟显示
      this._starTimer = setTimeout(() => {
        this.setData({ showStars: true });
      }, 300);
    },
    detached() {
      if (this._starTimer) {
        clearTimeout(this._starTimer)
        this._starTimer = null
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
