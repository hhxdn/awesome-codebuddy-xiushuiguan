// components/defeat-dialog/defeat-dialog.js - 失败弹窗
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    reason: {
      type: String,
      value: '挑战失败'
    },
    level: {
      type: Number,
      value: 1
    }
  },

  data: {
    icon: '😢',
    tipText: ''
  },

  lifetimes: {
    attached() {
      // 根据失败原因设置不同图标和提示
      const reason = this.properties.reason;
      let icon = '😢';
      let tipText = '别灰心，再来一次吧！';

      if (reason === 'timeout' || reason.includes('时间')) {
        icon = '⏰';
        tipText = '下次动作要快一点哦！';
      } else if (reason === 'hp' || reason.includes('血量')) {
        icon = '💔';
        tipText = '注意躲避积水！';
      } else if (reason === 'flood' || reason.includes('淹没')) {
        icon = '🌊';
        tipText = '积水太多啦，优先维修漏水水管！';
      }

      this.setData({ icon, tipText });
    }
  },

  methods: {
    onRetry() {
      this.triggerEvent('retry');
    },

    onRevive() {
      this.triggerEvent('watchad');
    },

    stopPropagation() {}
  }
});
