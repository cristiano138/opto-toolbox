/* ============================================================
 * utils.js —— 数值与单位工具
 * 职责：只做「纯计算」，不碰界面、不碰 DOM
 * 挂在全局命名空间 ET 上（不用 import/export，这样双击 index.html
 * 用 file:// 打开也能跑，发布到线上同样能跑）
 * ============================================================ */
(function (global) {
  'use strict';

  var ET = global.ET || (global.ET = {});

  /* ---------- 1. 单位后缀倍数表 ----------
   * 注意大小写敏感：M = 兆(1e6)，m = 毫(1e-3)
   * 电子工程里这是最容易搞混的地方，所以严格区分
   */
  var MULT = {
    p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3,
    R: 1, r: 1,
    k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12
  };

  /* 量级前缀：3 的倍数档位，用于把 4700 显示成 "4.7 k" */
  var PREFIX = {
    12: 'T', 9: 'G', 6: 'M', 3: 'k', 0: '',
    '-3': 'm', '-6': 'µ', '-9': 'n', '-12': 'p', '-15': 'f'
  };

  /**
   * 把用户输入的字符串解析成数字，支持单位后缀
   * parseNum('4.7k')  -> 4700
   * parseNum('10uF')  -> 1e-5
   * parseNum('1M')    -> 1e6
   * parseNum('')      -> NaN
   */
  function parseNum(str) {
    if (typeof str === 'number') return str;
    if (str == null) return NaN;
    var s = String(str).trim().replace(/[,，\s]/g, '');
    if (!s) return NaN;

    // 先抓出数字部分（含小数点、科学计数法）
    var m = s.match(/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
    if (!m) return NaN;
    var num = parseFloat(m[0]);
    var rest = s.slice(m[0].length);

    // 再看剩下的是什么单位后缀
    var mult = 1;
    if (rest) {
      var ch = rest.charAt(0);
      if (MULT.hasOwnProperty(ch)) {
        mult = MULT[ch];
      } else if (ch === 'K' || ch === 'k') {
        mult = 1e3;
      }
      // 结尾是 Ω / F / H / V / A / W / Hz 等单位字母，忽略即可
    }
    return num * mult;
  }

  /** 保留 n 位有效数字，并把多余的 0 去掉（如 4.700 -> 4.7） */
  function sig(v, n) {
    n = n || 4;
    if (!isFinite(v) || v === 0) return 0;
    return parseFloat(v.toPrecision(n));
  }

  /**
   * 工程量级格式化：把数字变成带前缀的字符串
   * eng(4700)        -> { text:'4.7', unit:'k' }
   * eng(1e-9)        -> { text:'1',   unit:'n' }
   * 返回值拆开是为了让界面能把前缀和单位分别上色
   */
  function eng(v, digits) {
    digits = digits || 4;
    if (v === null || v === undefined || !isFinite(v)) {
      return { text: '—', unit: '' };
    }
    if (v === 0) return { text: '0', unit: '' };

    var abs = Math.abs(v);
    var exp = Math.floor(Math.log10(abs));           // 科学计数法指数
    var lvl = Math.floor(exp / 3) * 3;               // 落到 3 的整倍数档
    if (lvl > 12) lvl = 12;
    if (lvl < -15) lvl = -15;

    var mant = v / Math.pow(10, lvl);
    // 浮点误差会让 1000/1e3 = 1.0000000000000002，这里修一下
    mant = parseFloat(mant.toPrecision(digits));

    // 边界进位：mant 四舍五入后可能变成 1000，要进一档
    if (Math.abs(mant) >= 1000) {
      mant = mant / 1000;
      lvl += 3;
      if (lvl > 12) lvl = 12;
    }

    return {
      text: String(mant),
      unit: PREFIX[String(lvl)] || ''
    };
  }

  /** 一步到位：数字 + 单位 -> "4.7 kΩ" */
  function fmt(v, unit, digits) {
    var e = eng(v, digits);
    if (e.text === '—') return '—';
    // 工程惯例：前缀和单位连着写（4.7 kΩ），数字和它们之间留一个空格
    var tail = (e.unit || '') + (unit || '');
    return tail ? e.text + ' ' + tail : e.text;
  }

  /* ---------- 2. E24 标准阻值系列 ---------- */
  var E24 = [
    10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30,
    33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91
  ];

  /* 说明：E24 里存的是 10~91 这样的「两位数」，
   * 所以 150Ω 对应的数量级是 10^(exp-1) = 10，再用 15 × 10 = 150
   * （写成 10^exp 会得到 1000，这是个很容易踩的坑） */
  function e24Base(v) {
    return Math.pow(10, Math.floor(Math.log10(v)) - 1);
  }

  /** 找到不小于 v 的最接近的 E24 标准阻值（买得到的值） */
  function e24Up(v) {
    if (!isFinite(v) || v <= 0) return NaN;
    var base = e24Base(v);
    for (var i = 0; i < E24.length; i++) {
      var cand = E24[i] * base;
      if (cand >= v * 0.999) return parseFloat(cand.toPrecision(4));
    }
    // 这一档全都小于 v（比如 v=99×base），进位到下一档的最小值
    return parseFloat((E24[0] * base * 10).toPrecision(4));
  }

  /** 找到不大于 v 的最接近的 E24 标准阻值 */
  function e24Down(v) {
    if (!isFinite(v) || v <= 0) return NaN;
    var base = e24Base(v);
    for (var i = E24.length - 1; i >= 0; i--) {
      var cand = E24[i] * base;
      if (cand <= v * 1.001) return parseFloat(cand.toPrecision(4));
    }
    // 这一档全都大于 v，退回上一档的最大值
    return parseFloat((E24[E24.length - 1] * base / 10).toPrecision(4));
  }

  /* ---------- 3. 小工具 ---------- */

  /** 把数字格式化成百分比，保留 2 位小数 */
  function pct(v, digits) {
    if (!isFinite(v)) return '—';
    return (v * 100).toFixed(digits === undefined ? 2 : digits) + '%';
  }

  /** 限制数值范围 */
  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  /** 转义 HTML，防止用户输入里带尖括号把页面搞坏 */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 导出
  ET.util = {
    parseNum: parseNum,
    sig: sig,
    eng: eng,
    fmt: fmt,
    e24Up: e24Up,
    e24Down: e24Down,
    E24: E24,
    pct: pct,
    clamp: clamp,
    esc: esc
  };
})(typeof window !== 'undefined' ? window : this);
