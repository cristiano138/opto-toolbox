/* ============================================================
 * ui.js —— 界面渲染层
 * 职责：把 registry 里的「数据」画成界面
 * 这里不写任何计算公式，所有数值都来自 calc 模块的返回值
 * ============================================================ */
(function (global) {
  'use strict';

  var ET = global.ET || (global.ET = {});
  var U = ET.util;
  var esc = U.esc;

  var el = {};            // 缓存 DOM 节点
  var current = null;     // 当前打开的计算器
  var curCat = '';        // 当前分类筛选

  /** 算颜色亮度，用来决定色块上配黑字还是白字（0~255，越大越亮） */
  function luma(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  /* ---------- 初始化：把节点抓到手 ---------- */
  function init() {
    el.home = document.getElementById('home');
    el.detail = document.getElementById('detail');
    el.cats = document.getElementById('cats');
    el.grid = document.getElementById('grid');
    el.q = document.getElementById('q');
    el.dName = document.getElementById('d-name');
    el.dDesc = document.getElementById('d-desc');
    el.dInputs = document.getElementById('d-inputs');
    el.dRes = document.getElementById('d-results');
    el.dFormula = document.getElementById('d-formula');
    el.dNote = document.getElementById('d-note');

    bindEvents();
    renderHome();
  }

  function bindEvents() {
    // 搜索框：输入即时过滤
    el.q.addEventListener('input', renderHome);

    // 分类标签：事件委托（标签会被重建，所以绑在容器上）
    el.cats.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== el.cats && !t.getAttribute('data-cat')) t = t.parentNode;
      if (!t || t === el.cats) return;
      curCat = t.getAttribute('data-cat');
      renderHome();
    });

    // 卡片：事件委托
    el.grid.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== el.grid && !t.getAttribute('data-id')) t = t.parentNode;
      if (!t || t === el.grid) return;
      open(t.getAttribute('data-id'));
    });

    // 输入变化时实时重算
    el.dInputs.addEventListener('input', recalc);
    el.dInputs.addEventListener('change', recalc);

    // 返回按钮
    document.getElementById('back').addEventListener('click', goHome);

    // 浏览器前进/后退
    global.addEventListener('hashchange', route);
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    var kw = el.q.value.trim();
    var list = kw ? ET.search(kw) : (curCat ? ET.all(curCat) : ET.all());

    // 分类标签
    var cs = ET.cats();
    var chips = ['<button class="chip' + (curCat === '' ? ' on' : '') + '" data-cat="">全部 ' + ET.all().length + '</button>'];
    cs.forEach(function (c) {
      chips.push('<button class="chip' + (curCat === c.key ? ' on' : '') +
        '" data-cat="' + c.key + '">' + esc(c.name) + ' ' + c.count + '</button>');
    });
    el.cats.innerHTML = chips.join('');

    // 卡片网格
    if (!list.length) {
      el.grid.innerHTML = '<div class="empty">没找到「' + esc(kw) + '」相关的计算器</div>';
      return;
    }
    el.grid.innerHTML = list.map(function (c) {
      return '<button class="card" data-id="' + c.id + '">' +
        '<div class="c-ico">' + c.icon + '</div>' +
        '<div class="c-name">' + esc(c.name) + '</div>' +
        '<div class="c-desc">' + esc(c.desc) + '</div>' +
        '</button>';
    }).join('');
  }

  /* ---------- 详情页 ---------- */
  function open(id) {
    var c = ET.get(id);
    if (!c) return;
    current = c;
    location.hash = '#' + id;      // 记进地址栏，刷新/前进后退都能回到这里
    paintDetail();
  }

  function goHome() {
    current = null;
    location.hash = '';
    el.detail.hidden = true;
    el.home.hidden = false;
    document.body.classList.remove('detail-open');
    global.scrollTo(0, 0);
  }

  /** 地址栏变化时同步页面（支持直接粘贴 #rc-filter 进来） */
  function route() {
    var id = (location.hash || '').replace(/^#/, '');
    if (!id) { goHome(); return; }
    var c = ET.get(id);
    if (!c) { goHome(); return; }
    current = c;
    paintDetail();
  }

  function paintDetail() {
    var c = current;
    el.home.hidden = true;
    el.detail.hidden = false;
    document.body.classList.add('detail-open');

    el.dName.innerHTML = c.icon + ' ' + esc(c.name);
    el.dDesc.textContent = c.desc || '';
    el.dDesc.style.display = c.desc ? '' : 'none';

    // 输入表单
    el.dInputs.innerHTML = c.inputs.map(function (it) {
      var lbl = '<label class="fld"><span class="f-l">' + esc(it.label) + '</span>';
      if (it.type === 'select') {
        var opts = it.options.map(function (o) {
          // 选项可以带颜色（比如电阻色环），给个背景色更直观
          var st = '';
          if (o.color) st = ' style="background:' + o.color + ';color:' + (luma(o.color) > 140 ? '#111' : '#fff') + '"';
          return '<option value="' + esc(o.v) + '"' + st +
            (String(o.v) === String(it.def) ? ' selected' : '') + '>' +
            esc(o.l) + '</option>';
        }).join('');
        // 也套一层 f-wrap，让下拉框和输入框外观一致
        lbl += '<span class="f-wrap"><select class="f-in" data-key="' + it.key + '">' +
          opts + '</select></span>';
      } else {
        lbl += '<span class="f-wrap"><input class="f-in" type="text" inputmode="decimal" ' +
          'data-key="' + it.key + '" value="' + esc(it.def == null ? '' : it.def) +
          '" placeholder="' + esc(it.hint || '如 4.7k') + '">' +
          (it.unit ? '<span class="f-u">' + esc(it.unit) + '</span>' : '') + '</span>';
      }
      return lbl + '</label>';
    }).join('');

    el.dFormula.textContent = c.formula || '';
    el.dFormula.style.display = c.formula ? '' : 'none';
    el.dNote.innerHTML = c.note ? esc(c.note) : '';
    el.dNote.style.display = c.note ? '' : 'none';

    recalc();
  }

  /** 读表单 -> 调 calc -> 画结果 */
  function recalc() {
    if (!current) return;
    var c = current;
    var raw = {}, vals = {}, missing = [];

    // 1. 收集输入
    var nodes = el.dInputs.querySelectorAll('[data-key]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-key');
      raw[k] = nodes[i].value;
      var v = U.parseNum(nodes[i].value);
      vals[k] = v;
      if (!isFinite(v)) {
        // 找到这一项的名字，好在提示里说清楚缺哪个
        // optional 的项允许留空（比如欧姆定律只要填两个量）
        for (var j = 0; j < c.inputs.length; j++) {
          if (c.inputs[j].key === k && !c.inputs[j].optional) {
            missing.push(c.inputs[j].label);
          }
        }
      }
    }

    // 2. 输入不全：给出明确提示，而不是显示 NaN
    if (missing.length) {
      el.dRes.innerHTML = '<div class="empty">请填写：' + esc(missing.join('、')) + '</div>';
      return;
    }

    // 3. 调计算函数（用 try 包住，某个模块算错也不至于白屏）
    var out;
    try {
      out = c.calc(vals, raw) || [];
    } catch (err) {
      el.dRes.innerHTML = '<div class="empty">计算出错了：' + esc(err.message) + '</div>';
      return;
    }

    // 4. 画结果
    if (!out.length) {
      el.dRes.innerHTML = '<div class="empty">没有可显示的结果</div>';
      return;
    }
    el.dRes.innerHTML = out.map(renderOne).join('');
  }

  /** 渲染单条结果 */
  function renderOne(r) {
    // 色环可视化：把颜色数组画成一排色块
    if (r.bands) {
      return '<div class="res"><div class="res-l">' + esc(r.label) + '</div>' +
        '<div class="bands">' + r.bands.map(function (b) {
          return '<span class="band" style="background:' + b.c + '" title="' + esc(b.t) + '"></span>';
        }).join('') + '</div>' +
        '<div class="res-n">' + esc(r.text || '') + '</div></div>';
    }
    var shown = r.text != null ? r.text : U.fmt(r.value, r.unit || '');
    return '<div class="res' + (r.tone ? ' ' + r.tone : '') + '">' +
      '<div class="res-l">' + esc(r.label) + '</div>' +
      '<div class="res-v">' + esc(shown) + '</div>' +
      (r.note ? '<div class="res-n">' + esc(r.note) + '</div>' : '') +
      '</div>';
  }

  ET.ui = { init: init, open: open, route: route, goHome: goHome };
})(typeof window !== 'undefined' ? window : this);
