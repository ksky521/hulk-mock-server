/**
 * @file mock server 配置
 * 详细见：https://github.com/jaywcjlove/webpack-api-mocker
 * 支持 mockjs：http://mockjs.com/examples.html
 * import mockjs from 'mockjs'
 */
const proxy = {
    // Priority processing.
    // apiMocker(app, path, option)
    // This is the option parameter setting for apiMocker
    // webpack-api-mocker@1.5.15 support
    '_proxy': {
        proxy: {
            '/repos/*': 'https://api.github.com/',
            '/:owner/:repo/raw/:ref/*': 'http://127.0.0.1:2018'
        },
        changeHost: true
    },
    // =====================
    'GET /api/user': {
        id: 1,
        username: 'kenny',
        sex: 6
    }
};
module.exports = proxy;
