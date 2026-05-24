// components/victory-dialog/victory-dialog.js - 通关胜利弹窗
Component({
  properties: {
    stars: {
      type: Number,
      value: 3
    },
    level: {
      type: Number,
      value: 1
    },
    time: {
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
      setTimeout(() => {
        this.setData({ showStars: true });
      }, 300);
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
