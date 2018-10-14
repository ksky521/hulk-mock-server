/**
 * @file 工具函数库
 */
const {name} = require('../package.json');
exports.debug = require('debug')(name);

exports.loadModule = (moduleName) => {
    const isNotFoundError = err => {
        return err.message.match(/Cannot find module/);
    };
    try {
        // 优先项目内 serve 文件夹下
        if (!/^(\/|\.)/.test(moduleName)) {
            return require('../serve/' + moduleName);
        }

        throw new Error('Cannot find module');
    }
    catch (e) {
        if (isNotFoundError(e)) {
            try {

                return require(moduleName);
            }
            catch (err) {
                if (isNotFoundError(err)) {
                    try {
                        return require('import-global')(moduleName);
                    }
                    catch (err2) {
                        if (isNotFoundError(err2)) {
                            console.log();
                            console.log(
                                `  Processor [${moduleName}] requires a global addon to be installed.`
                            );
                            console.log();
                            process.exit(1);
                        }
                        else {
                            throw err2
                        }
                    }
                }
                else {
                    throw err
                }
            }
        }
        else {
            throw e;
        }
    }
};
