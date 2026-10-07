/* ============================================================
 * sw.js —— 离线缓存
 * 策略：网络优先（拿不到再回退缓存）
 * 原因：这是一个会持续更新的工具箱，用「缓存优先」会把用户
 *       钉死在旧版本上（足球速报项目里踩过这个坑），所以这里
 *       一律先问网络，断网才用本地缓存
 * ============================================================ */
var CACHE = 'po-v1';

var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/core/utils.js',
  './js/core/registry.js',
  './js/core/ui.js',
  './js/core/app.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 安装：把静态资源塞进缓存
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function (err) {
        // 某一个文件挂了不能让整个 sw 装不上
        console.warn('[sw] 部分资源缓存失败：', err);
      });
    })
  );
});

// 激活：清掉旧版本的缓存
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 拦截请求：先走网络，断了再用缓存
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      // 顺手把新版本更新进缓存，下次断网就能用
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      // 断网：回退缓存；缓存里也没有就退回首页
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
