# 把电子工具箱打包成一个「自包含的单文件 HTML」
#
# 为什么要这么做：资料库（Library）目前只接受单个 .html / .zip 上传，
# 而 .zip 通道在本机会报「上传凭证响应缺少 uploadUrl 或 cosKey」（2026-10-07 实测，连试 4 次都失败）。
# 所以走单文件路线：把 css、全部 js、manifest（含 base64 图标）、图标
# 全部内联进一个 html，再上传。
#
# 用法：
#   python bundle.py
# 产出 E:\workbuddy\_电子工具箱-单文件.html，然后：
#   python <资料库脚本>/page/import_html.py "E:\workbuddy\_电子工具箱-单文件.html" --space-id <空间ID> --parent-id <文件夹ID>
#
# 注意：单文件版里去掉了 sw 注册（没有独立的 sw.js，留着只会 404）。
import os, re, json, base64, urllib.parse

src = r'E:\workbuddy\电子工具箱'
out = r'E:\workbuddy\_电子工具箱-单文件.html'

html = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(src, 'css', 'style.css'), encoding='utf-8').read()

# 1) 样式内联
html = html.replace('<link rel="stylesheet" href="css/style.css">',
                    '<style>\n' + css + '\n</style>')

# 2) 各个 js 内联（保持 index.html 里的加载顺序）
def inline_js(m):
    p = os.path.join(src, m.group(1))
    return '<script>\n' + open(p, encoding='utf-8').read() + '\n</script>'

html, n = re.subn(r'<script src="([^"]+)"></script>', inline_js, html)

# 3) manifest 内联成 data URI（图标也转成 base64 塞进去，保证自包含）
def b64(name):
    return base64.b64encode(open(os.path.join(src, name), 'rb').read()).decode()

mf = json.load(open(os.path.join(src, 'manifest.json'), encoding='utf-8'))
for ic in mf['icons']:
    ic['src'] = 'data:image/png;base64,' + b64(ic['src'])
mf_uri = 'data:application/manifest+json;charset=utf-8,' + \
         urllib.parse.quote(json.dumps(mf, ensure_ascii=False))
html = html.replace('<link rel="manifest" href="manifest.json">',
                    '<link rel="manifest" href="' + mf_uri + '">')

# 4) 图标内联
svg = open(os.path.join(src, 'icon.svg'), encoding='utf-8').read()
html = html.replace('<link rel="icon" href="icon.svg">',
                    '<link rel="icon" href="data:image/svg+xml;charset=utf-8,' +
                    urllib.parse.quote(svg) + '">')
html = html.replace('<link rel="apple-touch-icon" href="icon-192.png">',
                    '<link rel="apple-touch-icon" href="data:image/png;base64,' +
                    b64('icon-192.png') + '">')

# 5) 顺手把 sw 注册去掉（单文件版没有 sw.js，留着只会 404 报错）
html = html.replace("navigator.serviceWorker.register('sw.js')", "Promise.reject()")

open(out, 'w', encoding='utf-8').write(html)
print('OUT=' + out)
print('INLINED_JS=' + str(n))
print('SIZE=' + str(os.path.getsize(out)))
print('LEFT_SRC_REF=' + str(len(re.findall(r'(?:src|href)="(?!data:|#|https?:)([^"]+)"', html))))
