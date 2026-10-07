/* ============================================================
 * registry.js —— 计算器注册中心
 * 职责：收集所有计算器模块，提供检索能力
 * 新增一个计算器 = 在 js/calc/ 下加一个文件 + 在 index.html 里引一行
 * 核心引擎完全不需要改动（这就是「数据与界面分离」的好处）
 * ============================================================ */
(function (global) {
  'use strict';

  var ET = global.ET || (global.ET = {});

  /* ---------- 分类表（顺序即首页展示顺序） ---------- */
  var CATS = [
    { key: 'basic',  name: '基础电路' },
    { key: 'part',   name: '元件识别' },
    { key: 'signal', name: '信号与频率' },
    { key: 'ic',     name: '芯片与定时' },
    { key: 'comm',   name: '通信与串口' }
  ];

  var calcs = [];      // 所有已注册的计算器
  var index = {};      // id -> 计算器，方便按 id 查

  /**
   * 注册一个计算器
   * @param {Object} cfg
   *   id      唯一标识（英文小写，如 'rc-filter'）
   *   name    中文名
   *   cat     分类 key（必须在 CATS 里）
   *   icon    一个 emoji，首页卡片上显示
   *   desc    一句话说明
   *   inputs  输入项数组
   *   calc    计算函数：输入 {key:数值} -> 返回结果数组
   *   formula 公式文本（显示在结果下方）
   *   note    工程师经验 / 注意事项（可省略）
   */
  function register(cfg) {
    // 防御式校验：模块写错了只警告、不让它把整个页面搞崩
    var problems = [];
    if (!cfg || !cfg.id) problems.push('缺少 id');
    else if (index[cfg.id]) problems.push('id 重复：' + cfg.id);
    if (!cfg || !cfg.name) problems.push('缺少 name');
    if (!cfg || typeof cfg.calc !== 'function') problems.push('缺少 calc 函数');
    if (!cfg || !Array.isArray(cfg.inputs)) problems.push('inputs 必须是数组');

    if (problems.length) {
      console.warn('[ET] 计算器注册失败：', problems.join('；'), cfg);
      return false;
    }

    // 分类不存在就归到「其他」，不让模块作者背锅
    if (!cfg.cat || !catExists(cfg.cat)) cfg.cat = 'other';
    if (!cfg.icon) cfg.icon = '🧮';
    if (!cfg.desc) cfg.desc = '';

    calcs.push(cfg);
    index[cfg.id] = cfg;
    return true;
  }

  function catExists(key) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].key === key) return true;
    return key === 'other';
  }

  /** 按 id 取一个计算器 */
  function get(id) {
    return index[id] || null;
  }

  /** 列出全部（可只取某个分类） */
  function all(cat) {
    if (!cat) return calcs.slice();
    return calcs.filter(function (c) { return c.cat === cat; });
  }

  /** 分类清单，带每个分类下的数量 */
  function cats() {
    return CATS.map(function (c) {
      return {
        key: c.key,
        name: c.name,
        count: all(c.key).length
      };
    }).filter(function (c) { return c.count > 0; });
  }

  /**
   * 搜索：名字 / 说明 / 标签 里任意命中就算
   * 空关键词返回全部
   */
  function search(q) {
    var kw = String(q || '').trim().toLowerCase();
    if (!kw) return calcs.slice();
    return calcs.filter(function (c) {
      var hay = [c.name, c.desc, c.id, (c.tags || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(kw) >= 0;
    });
  }

  ET.CATS = CATS;
  ET.register = register;
  ET.get = get;
  ET.all = all;
  ET.cats = cats;
  ET.search = search;
  /* 调试用：在浏览器控制台里输 ET._calcs 能看到所有模块 */
  ET._calcs = calcs;
})(typeof window !== 'undefined' ? window : this);
