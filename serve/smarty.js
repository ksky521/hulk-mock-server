/**
 * @file smarty server
 */
const {exec, execSync} = require('child_process');
const path = require('path');
const {
    resolve,
    extname,
    join
} = path;

const Mock = require('mockjs');
const which = require('which');
const userHome = require('user-home');
const {
    existsSync,
    readJsonSync,
    pathExistsSync,
    stat
} = require('fs-extra');

const {name} = require('../package.json');
const {debug} = require('../lib/utils');

const PHP_FILE_PATH = resolve(__dirname, '../smarty/mocker.php');

/**
 * smarty server
 */
function serveSmarty(options) {
    const baseDir = resolve(options.baseDir || '');

    // 获取 php 路径
    let {
        bin,
        dataDir = resolve(baseDir, './mock/_data_'),
        ext = '.tpl'
    } = options;

    // 处理成标准目录
    dataDir = resolve(dataDir);

    if (!bin) {
        bin = which.sync('php', {
            nothrow: true
        });
    }
    else {
        bin = resolve(bin);
    }

    try {
        execSync(`${bin} -v`);
    }
    catch (e) {
        throw e;
    }

    // 判断template dir是否存在

    if (!pathExistsSync(baseDir)) {
        throw `Smarty template directory does not exist! ${baseDir}`;
    }

    const useMockData = pathExistsSync(dataDir);

    return (req, res, next, filename) => {
        debug(filename, ext);

        return new Promise((pResolve, reject) => {
            if (filename.startsWith('.') || filename.endsWith('/')) {
                return reject();
            }

            if (ext && extname(filename) !== ext) {
                filename += ext;
            }

            // 提前将确定量加入 cmd
            const cmd = [bin, PHP_FILE_PATH];

            // 将 smarty cache 放到 userhome 下面
            cmd.push(`--cache=${getQuoteString(join(userHome, `.${name}`))}`);
            cmd.push(`--dir=${getQuoteString(baseDir)}`);
            cmd.push(`--name=${getQuoteString(filename)}`);

            stat(join(baseDir, filename)).then(stat => {
                if (stat.isDirectory()) {
                    return reject();
                }

                const tplName = filename.replace(new RegExp(`${ext}$`), '');
                debug(tplName);

                const dataArgs = [];
                const dataFilePath = resolve(dataDir, `./${tplName}.json`);
                console.log(dataFilePath, useMockData);

                if (useMockData && existsSync(dataFilePath)) {
                    let data = Mock.mock(readJsonSync(dataFilePath));
                    mockDataFilePath = dataFilePath;
                    dataArgs.push(`--data=${getQuoteString(JSON.stringify(data))}`);
                }

                const code = cmd.concat(dataArgs).join(' ');

                debug(code);

                exec(code, (err, stdout, stderr) => {
                    debug(stdout);
                    if (err) {
                        debug(err, stderr);
                        stderr ? res.end(stderr) : stdout ? res.end(stdout) : res.end(err.toString());
                    }
                    else {
                        const info = ['<!--created by smarty', ...cmd, `--data=${dataFilePath}`, '--->'].join('\n');
                        const body = stdout + `${info}`;
                        res.setHeader('Content-Type', 'text/html; charset=utf-8');
                        res.setHeader('Content-Length', body.length);
                        res.end(body);
                    }
                    pResolve();
                });
            }).catch(reject);

        });
    };
}

function getQuoteString(str) {
    return JSON.stringify(str);
}
module.exports = serveSmarty;
