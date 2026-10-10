/* ============================================================
 * dbm.js —— 计算器①：光功率换算 dBm ↔ mW
 * 公式：P(dBm) = 10 × lg(P / 1mW)
 *       P(mW)  = 1mW × 10^(dBm / 10)
 * dBm 是光通信的"普通话"：光模块、光纤功率计、链路预算全用它说话。
 * ============================================================ */
(function () {
  'use strict';

  var U = ET.util;

  ET.register({
    id: 'dbm',
    name: '光功率换算',
    cat: 'fiber',
    icon: '📡',
    desc: 'dBm 与 mW / W 互转。光模块和功率计都在用的单位',
    tags: ['dBm', 'mW', '光功率', '功率', '发射功率', '灵敏度'],
    inputs: [
      {
        key: 'dir', type: 'select', label: '换算方向', def: 'toMw',
        options: [
          { v: 'toMw',  l: 'dBm → mW（我知道 dBm）' },
          { v: 'toDbm', l: 'mW → dBm（我知道 mW）' }
        ]
      },
      { key: 'val', label: '数值', def: '0', hint: '如 10、-3、0.5' }
    ],
    calc: function (v) {
      var dbm, mW, out = [];
      if (v.dir === 'toDbm') {
        mW = v.val;
        if (!isFinite(mW) || mW <= 0) return out;
        dbm = 10 * Math.log(mW) / Math.LN10;
        out.push({ label: '输入功率', text: U.fmt(mW / 1000, 'W') });
        out.push({ label: '换算结果', text: U.sig(dbm, 4) + ' dBm' });
      } else {
        dbm = v.val;
        if (!isFinite(dbm)) return out;
        mW = Math.pow(10, dbm / 10);
        out.push({ label: '输入功率', text: U.sig(dbm, 4) + ' dBm' });
        out.push({ label: '换算结果', text: U.fmt(mW / 1000, 'W') });
      }
      return out;
    },
    formula: 'P(dBm) = 10 × lg(P / 1 mW)        P(mW) = 1 mW × 10^(dBm ÷ 10)',
    note: '口诀：0 dBm = 1 mW；每 +3 dBm 功率翻一倍；每 +10 dBm 功率 ×10（-10 dBm 就是 ÷10）。dBm 可以是负数：-15 dBm 比 -5 dBm 弱 10 倍。光模块参数里的发射功率、接收灵敏度都拿 dBm 说话。'
  });
})();
