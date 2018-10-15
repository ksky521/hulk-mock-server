# mock-server

hulk mock server 中间件，支持 express 单独使用，也支持 webpack dev server 使用。

```js
const configSmarty = mockServer({
    contentBase: path.join(__dirname, './'),
    rootDir: path.join(__dirname, './mock'),
    processors: [
        `smarty?router=/template/*&baseDir=${path.join(__dirname, './template')}&dataDir=${path.join(__dirname, './mock/_data_')}`,
        {
            router: '/_art_/*',
            processor: (options) => {
                const rootDir = path.resolve(options.baseDir || '');
                return (req, res, next, filename) => {

                    try {
                        debug(path.join(rootDir, filename));
                        const html = art(path.join(rootDir, filename), {
                            name: 'aui'
                        });
                        res.end(html);
                    }
                    catch (e) {
                        next(e);
                    }
                };

            },
            options: {
                baseDir: path.join(__dirname, './art/')
            }
        }
    ]
});
// bootstrap
app.use(configSmarty);
```
