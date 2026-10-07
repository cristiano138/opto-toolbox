/* 冒烟测试：每加完一个计算器就跑一次，看看有没有把页面搞坏
 *
 * 怎么用：在这个文件夹里打开终端，输入
 *           node test.js
 *         看到「0 项失败」就说明没问题。
 *
 * 原理：这些 js 本来是给浏览器用的（它们挂在 window 上），
 *       这里把 global.window 指向 global，就能在 node 里直接跑。
 */
global.window = global;

var fs = require('fs');

require('./js/core/utils.js');
require('./js/core/registry.js');

// 自动加载 js/calc 下的所有计算器（按文件名排序，不用手动加）
var dir = './js/calc';
fs.readdirSync(dir)
  .filter(function (f) { return /\.js$/.test(f); })
  .sort()
  .forEach(function (f) { require(dir + '/' + f); });

var U = ET.util;
var pass = 0, fail = 0;

function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); }
}
function near(name, got, want, tol) {
  var d = Math.abs(got - want);
  var lim = tol === undefined ? Math.abs(want) * 0.001 + 1e-9 : tol;
  ok(name + ' = ' + got, d <= lim, 'got ' + got + ' want ' + want);
}

console.log('\n[1] 单位解析（输入 4.7k、100n 这类写法能不能认）');
near('parseNum(4.7k)', U.parseNum('4.7k'), 4700);
near('parseNum(100n)', U.parseNum('100n'), 1e-7);
near('parseNum(1M)', U.parseNum('1M'), 1e6);
near('parseNum(20m)', U.parseNum('20m'), 0.02);
ok('parseNum(空) 是 NaN', isNaN(U.parseNum('')));

console.log('\n[2] 数字格式化（结果要显示成 1.5 mW 这种）');
ok('fmt(4700,Ω) = 4.7 kΩ', U.fmt(4700, 'Ω') === '4.7 kΩ', U.fmt(4700, 'Ω'));
ok('fmt(1e-9,F) = 1 nF', U.fmt(1e-9, 'F') === '1 nF', U.fmt(1e-9, 'F'));
ok('fmt(0) = 0 Ω', U.fmt(0, 'Ω') === '0 Ω', U.fmt(0, 'Ω'));

console.log('\n[3] 注册情况');
var all = ET.all();
console.log('       一共 ' + all.length + ' 个计算器');
if (all.length === 0) console.log('       （还是空的，快去加第一个）');
var ids = all.map(function (c) { return c.id; });
ok('id 没有重名', new Set(ids).size === ids.length);
ET.cats().forEach(function (c) { console.log('       分类「' + c.name + '」：' + c.count + ' 个'); });

// 用每个计算器自己的默认值跑一遍，模拟用户打开就看到的结果
function run(c) {
  var vals = {};
  c.inputs.forEach(function (it) {
    // 下拉框的值是字符串（比如单位 'nm'），不能拿去做数字解析
    vals[it.key] = it.type === 'select' ? it.def : U.parseNum(it.def);
  });
  return c.calc(vals, vals);
}

console.log('\n[4] 每个计算器用默认值都能算出结果');
all.forEach(function (c) {
  var out;
  try { out = run(c); } catch (e) { ok(c.id + ' 不报错', false, e.message); return; }
  var bad = out.some(function (r) {
    return r.value !== undefined && !isFinite(r.value);
  });
  ok(c.id + ' 输出 ' + out.length + ' 项且没有 NaN', out.length > 0 && !bad);
});

console.log('\n[5] 乱填一气也不崩（全空、全零）');
all.forEach(function (c) {
  var vals = {};
  c.inputs.forEach(function (it) {
    vals[it.key] = it.type === 'select' ? it.def : NaN;
  });
  var out;
  try { out = c.calc(vals, vals); } catch (e) { ok(c.id + ' 空输入不报错', false, e.message); return; }
  ok(c.id + ' 空输入不崩', Array.isArray(out));
});

console.log('\n===== ' + pass + ' 项通过，' + fail + ' 项失败 =====');
process.exit(fail ? 1 : 0);
