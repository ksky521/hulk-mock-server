
/**
 * @file mock json变成可以访问的地址
 * 为了防止 url 冲突，约定`/_data_`目录作为数据真实存放路径
 * rootDIr/mock/_data_
 */
const {
    resolve
} = require('path');
const mockjs = require('mockjs');

const serveIndex = require('serve-index');
const {
    readJson,
    stat
} = require('fs-extra');

const {debug} = require('../lib/utils');
/**
 * mock data server
 * localhost/_data_
 * @param {Object} options 参数配置
 * @param {String} options.baseDir - router的目录
 * @param {String} options.dataDir - data 的目录
 */
module.exports = (options = {}) => {
    const baseDir = resolve(options.baseDir || '');
    const dataDir = resolve(baseDir, options.dataDir || '');
    const index = serveIndex(baseDir);
    return (req, res, next, pathname) => {
        debug(pathname);

        const orgiFilePath = resolve(dataDir, pathname);
        debug(orgiFilePath);
        stat(orgiFilePath).then((stat) => {
            if (stat.isDirectory()) {
                return index(req, res, next);
            }

            readJson(orgiFilePath).then((json) => {
                res.json(mockjs.mock(json));
            }).catch(next);
        }).catch(next);

    };
};
