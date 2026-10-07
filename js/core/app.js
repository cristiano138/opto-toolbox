/* ============================================================
 * app.js —— 启动器
 * 职责：页面加载后的初始化、PWA 安装引导、离线缓存注册
 * ============================================================ */
(function (global) {
  'use strict';

  var ET = global.ET || (global.ET = {});

  function boot() {
    // 1. 渲染界面
    ET.ui.init();

    // 2. 地址栏里有 #xxx 就直接打开对应计算器（支持分享链接直达）
    ET.ui.route();

    // 3. 显示当前装了几个计算器
    var n = document.getElementById('count');
    if (n) n.textContent = ET.all().length;

    // 4. 注册离线缓存（Service Worker）
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('[ET] sw 注册失败（不影响使用）：', e.message);
      });
    }

    // 5. 安装引导
    setupInstall();
  }

  /* ---------- 装到手机/电脑的引导 ----------
   * 思路：安卓和电脑 Chrome 会触发 beforeinstallprompt，直接弹「安装」按钮；
   * iOS 和微信内永远不触发，所以要按浏览器类型给不同的文字提示
   */
  var deferred = null;

  function setupInstall() {
    var btn = document.getElementById('install');
    var hint = document.getElementById('hintbar');
    if (!btn || !hint) return;

    // 已经装过了（以独立窗口打开）就不提示
    var standalone = global.matchMedia('(display-mode: standalone)').matches ||
      global.navigator.standalone === true;
    // 双击本地文件打开时也没有「安装」这回事，别误导
    var isLocalFile = location.protocol === 'file:';
    if (standalone || isLocalFile || localStorage.getItem('et_hint_off')) {
      hint.hidden = true;
      return;
    }

    // 安卓 / 电脑 Chrome：浏览器主动给安装事件
    global.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      btn.hidden = false;
      btn.addEventListener('click', function () {
        btn.hidden = true;
        deferred.prompt();
        deferred.userChoice.then(function () {
          deferred = null;
          hint.hidden = true;
        });
      });
    });

    // 其他情况：按浏览器给文案
    var ua = navigator.userAgent;
    var isiOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isWeChat = /MicroMessenger/i.test(ua);
    var isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|FxiOS/i.test(ua);
    var msg = document.getElementById('hint-text');

    if (isWeChat) {
      msg.textContent = '微信里装不了：点右上角 ··· → 用浏览器打开，再安装';
    } else if (isiOS && !isSafari) {
      msg.textContent = 'iPhone 请用 Safari 打开，再点「分享 ⬆️ → 添加到主屏幕」';
    } else if (isiOS) {
      msg.textContent = '点底部「分享 ⬆️」→「添加到主屏幕」，装完就是个 APP';
    } else if (!/Chrome|Edg/i.test(ua)) {
      msg.textContent = '用 Chrome 或 Edge 打开，菜单栏里能找到「安装应用」';
    } else {
      msg.textContent = '装到桌面后点图标直接用，不用每次输网址';
    }

    document.getElementById('hint-close').addEventListener('click', function () {
      hint.hidden = true;
      localStorage.setItem('et_hint_off', '1');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
