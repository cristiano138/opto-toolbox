/* ============================================================
 * wavelength.js —— 计算器②：波长 · 频率 · 光子能量
 * 公式：c = λ × ν            （波长 × 频率 = 光速，永远成立）
 *       E = hν = hc ÷ λ      （一个光子带多少能量）
 * 三个量里知道任意一个，另外两个就唯一确定了——因为光速 c 是个常数。
 * 光通信里最常用的一句话：波长越长，光子能量越小。
 * ============================================================ */
(function () {
  'use strict';

  var U = ET.util;

  /* ---------- 三个物理常数（SI 单位，国际约定值，不能改） ---------- */
  var C = 299792458;          // 真空光速 c，单位 m/s
  var H = 6.62607015e-34;     // 普朗克常数 h，单位 J·s
  var Q = 1.602176634e-19;    // 1 电子伏特 = 1.602...e-19 焦耳

  /** 科学计数法显示（光子能量用焦耳表示时数字太小，只能这么写） */
  function sci(v) {
    if (!isFinite(v)) return '—';
    return v.toExponential(3);
  }

  /** 判断这个波长属于什么波段（顺手告诉你它现实里用在哪） */
  function band(nm) {
    if (!isFinite(nm) || nm <= 0) return '—';
    if (nm < 10)   return 'X 射线 / 极紫外';
    if (nm < 380)  return '紫外（UV）';
    if (nm < 450)  return '可见光 · 紫';
    if (nm < 495)  return '可见光 · 蓝';
    if (nm < 570)  return '可见光 · 绿';
    if (nm < 590)  return '可见光 · 黄';
    if (nm < 620)  return '可见光 · 橙';
    if (nm <= 780) return '可见光 · 红';
    if (nm < 2500) {
      // 1260–1625 nm 是石英光纤损耗最低的那段，光通信全在这儿干活
      return '近红外' + (nm >= 1260 && nm <= 1625 ? '（光纤通信低损耗窗口）' : '');
    }
    return '中远红外';
  }

  ET.register({
    id: 'wavelength',
    name: '波长·频率·光子能量',
    cat: 'basic',
    icon: '🌈',
    desc: 'λ、ν、E 三选一互算。1550 nm 是多少 THz？一个光子多少 eV？',
    tags: ['波长', '频率', '光子能量', 'nm', 'THz', 'eV', 'E=hc/λ', '普朗克'],
    inputs: [
      {
        key: 'unit', type: 'select', label: '我填的这个数是什么', def: 'nm',
        options: [
          { v: 'nm',  l: '波长 nm（纳米）' },
          { v: 'um',  l: '波长 µm（微米）' },
          { v: 'm',   l: '波长 m（米）' },
          { v: 'THz', l: '频率 THz（太赫兹）' },
          { v: 'GHz', l: '频率 GHz（吉赫兹）' },
          { v: 'Hz',  l: '频率 Hz（赫兹）' },
          { v: 'eV',  l: '光子能量 eV（电子伏特）' }
        ]
      },
      { key: 'val', label: '数值', def: '1550', hint: '只填数字，单位在上面的框里选。如 1550 / 193.4 / 0.8' }
    ],
    calc: function (v) {
      var val = v.val;
      var out = [];
      if (!isFinite(val) || val <= 0) return out;

      var lam, nu;   // lam = 波长(单位 m)，nu = 频率(单位 Hz)

      switch (v.unit) {
        case 'nm':  lam = val * 1e-9;  nu = C / lam; break;
        case 'um':  lam = val * 1e-6;  nu = C / lam; break;
        case 'm':   lam = val;         nu = C / lam; break;
        case 'THz': nu = val * 1e12;   lam = C / nu; break;
        case 'GHz': nu = val * 1e9;    lam = C / nu; break;
        case 'Hz':  nu = val;          lam = C / nu; break;
        case 'eV':  nu = val * Q / H;  lam = C / nu; break;
        default:    return out;
      }

      var E = H * nu;          // 光子能量，单位 J
      var eV = E / Q;          // 同一个能量，用 eV 表示

      out.push({ label: '波长 λ', text: U.fmt(lam, 'm') });
      out.push({ label: '频率 ν', text: U.fmt(nu, 'Hz') });
      out.push({ label: '光子能量 E', text: U.sig(eV, 5) + ' eV' });
      out.push({ label: '（同一个能量的焦耳数）', text: sci(E) + ' J' });
      out.push({ label: '波段', text: band(lam * 1e9) });
      return out;
    },
    formula: 'c = λ × ν        E = hν = hc ÷ λ\n        c = 2.998×10⁸ m/s，h = 6.626×10⁻³⁴ J·s，1 eV = 1.602×10⁻¹⁹ J',
    note: '三句话记住它：① 波长 × 频率 = 光速，所以波长越长频率越低，两者成反比；② 光子能量跟频率成正比、跟波长成反比——1550 nm 的红外光子（0.8 eV）比 532 nm 的绿光光子（2.33 eV）弱得多，这就是红外光打不出光电效应的原因；③ 口算用 E(eV) ≈ 1240 ÷ λ(nm)，光通信三大窗口 850 / 1310 / 1550 nm 分别对应 1.46 / 0.95 / 0.80 eV。'
  });
})();
