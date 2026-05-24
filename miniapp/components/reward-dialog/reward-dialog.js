// components/reward-dialog/reward-dialog.js - 激励视频福利弹窗
Component({
  data: {
    rewards: [
      {
        type: 'wrench',
        icon: '🔧',
        title: '+3 扳手',
        desc: '获得3个额外扳手，更快修完水管',
        color: '#FF9800'
      },
      {
        type: 'time',
        icon: '⏱',
        title: '+30秒时间',
        desc: '增加30秒过关时间，从容应对',
        color: '#2196F3'
      },
      {
        type: 'hp',
        icon: '❤',
        title: '满血复活',
        desc: '立刻恢复全部血量到100',
        color: '#F44336'
      }
    ]
  },

  methods: {
    onSelect(e) {
      const type = e.currentTarget.dataset.type;
      this.triggerEvent('select', { type });
    },

    onClose() {
      this.triggerEvent('close');
    },

    stopPropagation() {}
  }
});
