
const {
    resolve
} = require('path');
const mockjs = require('mockjs');

const {
    existsSync,
    readJson
} = require('fs-extra');

const {debug} = require('../lib/utils');

module.exports = (options = {}) => {
    const baseDir = resolve(options.baseDir || '');

    return (req, res, next, pathname) => {
        return new Promise((pResolve, reject) => {
            const orgiFilePath = resolve(baseDir, pathname);
            debug(orgiFilePath);
            if (existsSync(orgiFilePath)) {
                readJson(orgiFilePath).then((json) => {
                    res.json(mockjs.mock(json));
                    pResolve();
                }).catch(reject);
            }
            else {
                reject();
            }
        });
    };
};
