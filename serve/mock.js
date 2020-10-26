/**
 * @file 参考：https://github.com/jaywcjlove/webpack-api-mocker/，修改成中间件版本
 *
 */
const path = require('path');
const parse = require('url').parse;
const bodyParser = require('body-parser');
const httpProxy = require('http-proxy');
const chokidar = require('chokidar');
const pathToRegexp = require('path-to-regexp');
const {debug} = require('../lib/utils');

const emptyServer = (r, s, n) => n();

function pathMatch(options = {}) {
    return (path) => {
        const keys = [];
        const re = pathToRegexp(path, keys, options);
        return (pathname, params) => {
            const m = re.exec(pathname);
            if (!m) {
                return false;
            }

            params = params || {};
            let key;
            let param;
            for (let i = 0; i < keys.length; i++) {
                key = keys[i];
                param = m[i + 1];
                if (!param) {
                    continue;
                }

                params[key.name] = decodeURIComponent(param);
                if (key.repeat) {
                    params[key.name] = params[key.name].split(key.delimiter);
                }

            }
            return params;
        };
    };
}

// 释放老模块的资源
function cleanCache(modulePath) {
    const module = require.cache[modulePath];
    if (!module) {
        return;
    }

    // remove reference in module.parent
    if (module.parent) {
        module.parent.children.splice(module.parent.children.indexOf(module), 1);
    }

    require.cache[modulePath] = undefined;
}

// 兼容 babel 处理过的 ESModule
function requireModule(path) {
    let module = require(path);
    if (module.default) {
        module = module.default;
    }
    return module;
}

/**
 * api-mocker 中间件
 * 参考：https://github.com/jaywcjlove/webpack-api-mocker/
 * @param {Object} options - 配置项
 * @param {String} options.watchFile - 需要监控的mock配置文件
 */
module.exports = (options = {}) => {
    const proxyHttp = httpProxy.createProxyServer({});
    const watchFile = options.watchFile;

    if (!watchFile) {
        return emptyServer;
    }

    // 注意： 这里用的是 require，所以配置文件不能用 ESModule 语法
    let proxy = requireModule(watchFile);

    if (!proxy) {
        return emptyServer;
    }

    const {proxy: proxyConf = {}, changeHost = true} = proxy._proxy || {};
    // 监听配置入口文件所在的目录，一般为认为在配置文件/mock 目录下的所有文件
    const watcher = chokidar.watch(path.dirname(watchFile));
    watcher.on('all', (event, path) => {
        if (event === 'change' || event === 'add') {
            try {
                // 当监听的可能是多个配置文件时，需要清理掉更新文件以及入口文件的缓存，重新获取
                cleanCache(path);
                if (path !== watchFile) {
                    cleanCache(watchFile);
                }

                proxy = requireModule(watchFile);
            }
            catch (ex) {
                console.error(ex);
            }
        }

    });
    // 监听文件修改重新加载代码
    // 配置热更新
    return (req, res, next) => {
        const proxyURL = `${req.method} ${req.path}`;
        const proxyNames = Object.keys(proxyConf);
        const proxyFuzzyMatch = proxyNames.filter((kname) => {
            const reg = new RegExp('^' + kname.replace(/(:\w*)[^/]/ig, '(\\w*)[^/]').replace(/\/\*$/, ''));
            if (kname.startsWith('ALL') || kname.startsWith('/')) {
                return /\*$/.test(kname) && reg.test(req.path);
            }

            return /\*$/.test(kname) && reg.test(proxyURL);
        });
        const proxyMatch = proxyNames.filter((kname) => {
            return kname === proxyURL;
        });
        // 判断下面这种情况的路由
        // => GET /api/user/:org/:name
        // => GET /api/:owner/:repo/raw/:ref/*
        const containMockURL = Object.keys(proxy).filter((kname) => {
            const replaceStr = /\*$/.test(kname) ? '' : '$';
            return (new RegExp('^' + kname.replace(/(:\w*)[^/]/ig, '(\\w*)[^/]') + replaceStr)).test(proxyURL);
        });
        if (proxy[proxyURL] || (containMockURL && containMockURL.length > 0)) {
            debug('proxy', containMockURL);

            let bodyParserMethd = bodyParser.json();
            const contentType = req.get('Content-Type');
            switch (contentType) {
                case 'text/plain':
                case 'text/html':
                    bodyParserMethd = bodyParser.text({
                        type: contentType
                    });
                    break;
                case 'application/x-www-form-urlencoded':
                    bodyParserMethd = bodyParser.urlencoded({
                        extended: false
                    });
                    break;
            }

            bodyParserMethd(req, res, () => {
                const result = proxy[proxyURL] || proxy[containMockURL[0]];
                if (typeof result === 'function') {
                    // params 参数获取
                    if (containMockURL[0]) {
                        const mockURL = containMockURL[0].split(' ');
                        if (mockURL && mockURL.length === 2 && req.method === mockURL[0]) {
                            const route = pathMatch({
                                sensitive: false,
                                strict: false,
                                end: false
                            });
                            const match = route(mockURL[1]);
                            req.params = match(parse(req.url).pathname);
                        }
                    }

                    result(req, res, next);
                }
                else {
                    res.json(result);
                }
            });
        }
        else if (proxyNames.length > 0 && (proxyMatch.length > 0 || proxyFuzzyMatch.length > 0)) {
            const currentProxy = proxyConf[proxyMatch.length > 0 ? proxyMatch[0] : proxyFuzzyMatch[0]];
            const url = parse(currentProxy);
            debug('proxy', url);
            if (changeHost) {
                req.headers.host = url.host;
            }

            proxyHttp.web(req, res, {
                target: url.href
            });
        }
        else {
            next();
        }
    };
};
