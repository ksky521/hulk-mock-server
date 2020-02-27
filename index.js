/**
 * @file hulk-mock-server
 */
const {
    resolve,
    join
} = require('path');
const {parse} = require('url');

const pathToRegexp = require('path-to-regexp');

const serveMocker = require('./serve/mock');
const {debug, loadModule} = require('./lib/utils');

/**
 * 插件化实现 middleware
 * @param {Object} options 配置
 * @param {String} options.contentBase 网站目录，跟 devServer 的 contentBase 一个
 * @param {String} options.rootDir 数据来源和 mocker 配置，默认是 工作目录/mock，配置读取rootDir/index.js
 * @param {Array} options.processors 处理器
 * @param {string} options.processors[] - 配置语法，字符串形式
 * @param {string} options.processors[].router - router语法，字符串形式，例如: /_data/*
 * @param {function} options.processors[].processor - 处理器函数，返回一个中间件函数
 * @param {object} options.processors[].options - 处理器函数配置
 *
 * 配置其他解析器：
 * processors: [
 *   {
 *          router: `router path2reg 语法`：
 *          processor?: require('server-smarty'),
 *          options?: '',
 *    }
 * ]
 *
 * // 默认 processor
 * processors:['smarty?router=/template/**&baseDir=./template&bin=php&dataDir=mockDir/_mockdata_',]
 *
 */
function middleware(options = {}) {
    debug(options);

    const contentBase = resolve(options.contentBase || '');
    const rootDir = options.rootDir ? resolve(options.rootDir || '') : join(contentBase, './mock');

    const processorOptions = options.processors || [];
    // 增加 mockdata 处理mockDir/_mockdata_ 的mock数据
    // 访问/_mockdata_ 的 json 则直接使用 mockjs 后显示
    processorOptions.push(`jsondata?router=/_data_/*&baseDir=${rootDir}&dataDir=_data_`);

    // 1. 标准化
    // 2. 创建 server
    const processors = processorOptions
        .map(option => processorOptionNormalize(contentBase, option))
        .map(option => {
            option.server = processorFactory(option.processor, option.options);
            return option;
        });

    // 将 mockserver 放在最后
    processors.push({
        router: '/*',
        server: serveMocker({
            watchFile: join(rootDir, 'index.js')
        })
    });

    return (req, res, next) => {
        try {
            run(processors, req, res, next);
        }
        catch (e) {
            next(e);
        }
    };
}

/**
 * 执行解析器
 * @param {array} processors  解析器
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
function run(processors = [], req, res, next) {
    if (!processors.length || !Array.isArray(processors)) {
        next();
    }
    else {
        const result = processors.find(({router, server}) => {
            const match = pathToRegexp(router).exec(req.path);
            debug(router, req.path, match);
            if (match) {
                debug('Find router ', router, match);
                server(req, res, next, match[1]);
                return true;
            }
            return false;
        });
        !result && next();
    }
}

/*
 * 配置其他解析器：
 * processors: [
 *   {
 *          router: `router path2reg 语法`：
 *          processor?: require('server-smarty'),
 *          options?: '',
 *    }
 * ]
 *
 * // 默认 processor
 * processors:['smarty?router=/template/**&baseDir=./template&bin=php&dataDir=mockDir/_mockdata_',]
 *
 */
function processorOptionNormalize(baseDir, options = {}) {
    if (typeof options === 'string') {
        const {pathname, query} = parse(options, true);
        return {
            router: query.router || '/*',
            processor: pathname,
            options: Object.assign({
                baseDir
            }, query)
        };
    }

    if (typeof options === 'object') {
        const rs = {};
        const processor = options.processor;
        switch (typeof processor) {
            case 'string':
                const {pathname, query = {}} = parse(processor, true);
                rs.router = query.router || '/*';
                rs.processor = pathname;
                rs.options = Object.assign({
                    baseDir
                }, query);
                break;
            case 'function':
                rs.processor = processor;
                rs.router = options.router || '/*';
                rs.options = Object.assign({
                    baseDir
                }, options.options || {});
                break;
            default:
                throw 'Processor config object type error! (processor: string | function)';
        }
        return rs;
    }

    throw 'Processor type error! (options: string | object)';
}
function processorFactory(processor, options = {}) {
    // name : string | function
    if (typeof processor === 'function') {
        return processor(options);
    }
    else if (typeof processor === 'string') {
        return loadModule(processor)(options);
    }

    return false;
}

module.exports = middleware;
