/* ============================================================
 * refraction.js —— 计算器③：折射与全反射
 * 公式：n₁·sinθ₁ = n₂·sinθ₂   （斯涅尔定律 / Snell's law）
 *       θc = arcsin(n₂ ÷ n₁)   （临界角，只在 n₁ > n₂ 时存在）
 * 一句话：光从一种介质斜着走进另一种介质，会"拐一下弯"；
 *         从"光密"走向"光疏"且角度够斜时，它干脆不进去了，全被弹回来——这叫全反射。
 * 光纤就是靠全反射把光"关"在头发丝细的玻璃丝里，一路传到几十公里外。
 * ============================================================ */
(function () {
  'use strict';

  var U = ET.util;
  var C = 299792458;        // 真空光速，单位 m/s（用来算介质里的光速 v = c/n）

  /** 常见介质折射率速查（填数字时可以直接照抄） */
  var MAT = [
    { n: 1.0003, l: '真空 ≈ 1.0000 / 空气 ≈ 1.0003' },
    { n: 1.333,  l: '水 1.333' },
    { n: 1.45,   l: '石英玻璃（光纤）≈ 1.45' },
    { n: 1.52,   l: '普通窗玻璃 ≈ 1.52' },
    { n: 1.77,   l: '蓝宝石 ≈ 1.77' },
    { n: 2.42,   l: '金刚石（钻石）2.42' },
    { n: 3.48,   l: '硅（近红外）≈ 3.48' }
  ];

  /** 把角度转成字符串，保留 2 位小数；算不出来就显示 — */
  function deg(rad) {
    if (!isFinite(rad)) return '—';
    return (rad * 180 / Math.PI).toFixed(2) + '°';
  }

  ET.register({
    id: 'refraction',
    name: '折射与全反射',
    cat: 'basic',
    icon: '🔺',
    desc: 'n₁sinθ₁ = n₂sinθ₂。光从水斜射进空气会拐多少度？临界角多大？',
    tags: ['折射', '全反射', '临界角', '斯涅尔', 'Snell', '折射率', '光纤', 'n1sinθ1'],
    inputs: [
      { key: 'n1', label: '起点介质折射率 n₁（光从这边来）', def: '1.333', hint: '水=1.333，玻璃=1.52，空气≈1.0003，钻石=2.42' },
      { key: 'n2', label: '终点介质折射率 n₂（光往这边去）', def: '1.0003', hint: '换成 1.45 可以模拟光纤包层' },
      {
        key: 'mode', type: 'select', label: '我想算什么', def: 'a1',
        options: [
          { v: 'a1',   l: '已知入射角 θ₁ → 求折射角 θ₂' },
          { v: 'a2',   l: '已知折射角 θ₂ → 倒推入射角 θ₁' },
          { v: 'crit', l: '只要临界角 θc（不看下面那个角度）' }
        ]
      },
      { key: 'ang', label: '角度（度 °）', def: '45', hint: '0° = 垂直入射（不拐弯），90° = 贴着界面走。选「只要临界角」时这格随便填' }
    ],
    calc: function (v) {
      var n1 = v.n1, n2 = v.n2, ang = v.ang;
      var out = [];
      if (!isFinite(n1) || !isFinite(n2) || n1 <= 0 || n2 <= 0) return out;

      var D = Math.PI / 180;                 // 度 → 弧度
      var t1 = NaN, t2 = NaN;                // 两个角，单位：弧度
      var tir = false;                       // 是否发生全反射（Total Internal Reflection）

      // ---- 第一步：把两个角算出来 ----
      if (v.mode === 'crit') {
        // 只要临界角，跟 ang 无关
      } else if (v.mode === 'a1') {
        if (!isFinite(ang) || ang < 0 || ang > 90) return out;
        t1 = ang * D;
        var s2 = n1 * Math.sin(t1) / n2;     // 斯涅尔定律变形：sinθ₂ = n₁sinθ₁ / n₂
        if (Math.abs(s2) > 1) {
          tir = true;                        // sin 值超过 1 = 这个角根本不存在 = 全反射
        } else {
          t2 = Math.asin(s2);
        }
      } else {                               // 'a2'：已知折射角倒推入射角
        if (!isFinite(ang) || ang < 0 || ang > 90) return out;
        t2 = ang * D;
        var s1 = n2 * Math.sin(t2) / n1;
        if (Math.abs(s1) > 1) {
          tir = true;
        } else {
          t1 = Math.asin(s1);
        }
      }

      // ---- 第二步：临界角（只有从光密走向光疏才存在）----
      var tc = NaN;
      var hasTc = n1 > n2;
      if (hasTc) tc = Math.asin(n2 / n1);

      // ---- 第三步：往页面上吐结果 ----
      if (v.mode === 'crit') {
        out.push({
          label: '临界角 θc',
          text: hasTc ? deg(tc) + '（入射角大于它就全反射）' : '不存在（n₁ ≤ n₂，不会全反射）'
        });
      } else if (tir) {
        out.push({ label: '入射角 θ₁', text: v.mode === 'a1' ? deg(t1) : '求不出（折射角给大了）' });
        out.push({ label: '折射角 θ₂', text: v.mode === 'a1' ? '不存在' : deg(t2) });
        out.push({ label: '⚠️ 结论', text: '全反射！光一点都没进去，全被弹回来了' });
      } else {
        out.push({ label: '入射角 θ₁', text: deg(t1) });
        out.push({ label: '折射角 θ₂', text: deg(t2) });
        out.push({
          label: '拐了多少',
          text: U.sig(Math.abs(t1 - t2) * 180 / Math.PI, 4).toFixed(2) + '°（' +
                (t2 > t1 ? '远离法线·变"胖"了' : t2 < t1 ? '靠近法线·变"瘦"了' : '没拐弯') + '）'
        });
      }

      if (v.mode !== 'crit') {
        out.push({
          label: '临界角 θc',
          text: hasTc ? deg(tc) + '（入射角大于它就全反射）'
                      : '不存在（光从"疏"走向"密"，永远不会全反射）'
        });
      }

      out.push({
        label: '两侧光速',
        text: U.sig(C / n1 / 1000, 4) + ' km/s → ' + U.sig(C / n2 / 1000, 4) + ' km/s'
      });
      out.push({
        label: '谁更"密"',
        text: n1 > n2 ? 'n₁ 更密 → 光从密走向疏，角度够斜就会全反射'
            : n1 < n2 ? 'n₂ 更密 → 光从疏走向密，只会靠近法线，不会全反射'
                      : '两边一样密 → 光直着走过去，不拐弯'
      });

      return out;
    },
    formula: 'n₁·sinθ₁ = n₂·sinθ₂        θc = arcsin(n₂ ÷ n₁)\n        折射率 n = c ÷ v （真空光速 ÷ 这种介质里的光速）',
    note: '三句话记住它：① 折射率 n 就是"光在这种材料里跑得多慢"，n 越大光越慢、越"密"；② 光从密走进疏（比如水→空气）会**远离法线**，斜到超过临界角 θc 就再也钻不出去，全被弹回来——这叫**全反射**；③ **光纤就是一根被全反射关住的玻璃丝**：纤芯 n≈1.468、包层 n≈1.463，临界角约 85°，所以光只要以很平的角度进去，就能一路弹着走几十公里。反过来，从疏走进密（空气→玻璃）**永远**不会全反射。'
  });
})();
