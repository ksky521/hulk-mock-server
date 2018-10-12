
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

module.exports = (options = {}) => {
    const baseDir = resolve(options.baseDir || '');
    const dataDir = resolve(baseDir, options.dataDir || '');
    const index = serveIndex(baseDir);
    return (req, res, next, pathname) => {
        debug(pathname);

        return new Promise((pResolve, reject) => {
            const orgiFilePath = resolve(dataDir, pathname);
            debug(orgiFilePath);
            stat(orgiFilePath).then((stat) => {
                if (stat.isDirectory()) {
                    index(req, res, next);
                    return pResolve();
                }

                readJson(orgiFilePath).then((json) => {
                    res.json(mockjs.mock(json));
                    pResolve();
                }).catch(reject);
            }).catch(reject);

        });
    };
};
