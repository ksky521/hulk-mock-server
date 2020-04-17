# hulk-mock-server

hulk mock server 中间件，支持 express 单独使用，也支持 webpack dev server 使用。主要功能包括：

1. 数据接口 mock
    1. 结合 mock.js 进行 mock
    2. 本地文件指向
2. 自定义 processor，比如自定义 smarty、artTemplate 服务等
3. 接口 proxy

## 用法

```js
const mockServer = require('hulk-mock-server');
const express = require('express');
const app = express();

const middleware = mockServer(/** options 配置 **/);
// bootstrap
app.use(middleware);
// ...
```

### 配置项

-   `.contentBase`：网站目录，跟 webpackDevServer 的 contentBase 相同
-   `.rootDir`： 数据来源和 mocker 配置，默认是 `工作目录/mock`，配置读取 rootDir/index.js
-   `.processors`： 处理器
    -   `options.processors[]` - 配置语法，字符串形式
    -   `options.processors[].router` - router 语法，字符串形式，例如: `/\_data/\*`
    -   `options.processors[].processor` - 处理器函数，返回一个中间件函数
    -   `options.processors[].options` - 处理器函数配置

## 配置文件 `${rootDir}/index.js` 示例

```js
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
    _proxy: {
        proxy: {
            '/repos/*': 'https://api.github.com/',
            '/:owner/:repo/raw/:ref/*': 'http://127.0.0.1:2018',
        },
        changeHost: true,
    },
    // =====================
    'GET /api/user': {
        id: 1,
        username: 'theo',
        sex: 6,
    },
};
module.exports = proxy;
```

## processor

本质上来说，processor 是一个 express 的中间件插件，只不过内部封装了一些配置和逻辑。processor 的配置项支持 querystring 类型和 object 类型，下面两个配置是相同的：

```js
processors: [
    'jsondata?router=/_data_/*&baseDir=${baseDir}&dataDir=_data_',
    {
        router: '/_data_/*',
        processor: 'jsondata',
        options: {
            baseDir,
            dataDir: '_data_',
        },
    },
    {
        router: '/_data_/*',
        processor: require('your-processor'),
        options: {
            baseDir,
            dataDir: '_data_',
        },
    },
];
```

在 mock-server 中会将配置的`router`转发给对应的 processor 进行处理，processor 的初始化使用的是`options`。

hulk-mock-server 内部存在三个 processor：

-   serve/jsondata.js：将一个目录作为 mock 文件夹，这是一个内置 processor，不需要配置
-   serve/smarty.js：php smarty 的渲染，可以指定 mock 文件夹数据传入 smarty 进行`display`
-   serve/mock.js：根据对应文件进行读取配置 proxy、转发等

如果要自定义 processor 可以参考上面的三个实现，下面示例就是一个简单的 artTemplate 的 processor，访问`_art_/*`路径会进入这个 processor：

```js
const art = require('art-template');

const configSmarty = mockServer({
    contentBase: path.join(__dirname, './'),
    rootDir: path.join(__dirname, './mock'),
    processors: [
        {
            router: '/_art_/*',
            processor: (options) => {
                // 接收配置到的options
                const rootDir = path.resolve(options.baseDir || '');
                // 返回一个express中间件
                return (req, res, next, filename) => {
                    try {
                        // 渲染
                        const html = art(path.join(rootDir, filename), {
                            name: 'aui',
                        });
                        res.end(html);
                    } catch (e) {
                        next(e);
                    }
                };
            },
            // 自己定义参数
            options: {
                baseDir: path.join(__dirname, './art/'),
            },
        },
    ],
});
// bootstrap
app.use(configSmarty);
```

## 开发和测试

```bash
# 安装依赖
yarn
# 测试
yarn test
```
