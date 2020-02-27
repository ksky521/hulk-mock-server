/**
 * @file 测试入口
 */

const path = require('path');
const supertest = require('supertest');
const should = require('should');
const shouldHttp = require('should-http');
const art = require('art-template');

const express = require('express');
const app = express();
const {name} = require('../package.json');
const debug = require('debug')(`${name}:test`);

const mockServer = require('../');

const configSmarty = mockServer({
    contentBase: path.join(__dirname, './'),
    rootDir: path.join(__dirname, './mock'),
    processors: [
        `smarty?router=/template/*&baseDir=${path.join(__dirname, './template')}&dataDir=${path.join(
            __dirname,
            './mock/_data_'
        )}`,
        {
            router: '/_art_/*',
            processor: options => {
                const rootDir = path.resolve(options.baseDir || '');
                return (req, res, next, filename) => {
                    try {
                        debug(path.join(rootDir, filename));
                        const html = art(path.join(rootDir, filename), {
                            name: 'aui'
                        });
                        res.end(html);
                    } catch (e) {
                        next(e);
                    }
                };
            },
            options: {
                baseDir: path.join(__dirname, './art/')
            }
        },
        {
            router: '/newspage',
            processor() {
                return (req, res) => {
                    res.end('/newspage');
                };
            }
        },
        {
            router: '/news/*',
            processor() {
                return (req, res) => {
                    res.end(req.path);
                };
            }
        }
    ]
});
// bootstrap
app.use(configSmarty);

// 为了测试 next 可以透传到最底层 router
app.get('/*', (req, res) => {
    res.end('hello');
});

const request = supertest(app);

describe('test jsondata.js', () => {
    it('index.json', done => {
        request.get('/_data_/demo/index.json').expect(200, require('./mock/_data_/demo/index.json'), done);
    });
    it('get mock.json', done => {
        request
            .get('/_data_/demo/mock.json')
            .expect(200)
            .expect(res => {
                res.should.be.json();
                res.body.list.should.be.an.Array().and.not.empty();
            })
            .end(done);
    });
    it('serve index', done => {
        request.get('/_data_/demo/').expect(200, /title="(index|mock)\.json"/, done);
    });
});
describe('test mockapi.js', () => {
    it('api user', done => {
        request
            .get('/api/user')
            .expect(200)
            .expect(res => {
                res.should.be.json();
                res.body.username.should.be.equal('theo');
                res.body.sex.should.be.equal(6);
            })
            .end(done);
    });
    const app2018 = express();

    app2018.get('/:owner/:repo/raw/:ref/*', (req, res, next) => {
        // const {owner, repo} = req.params;
        res.json(req.params);
    });
    app2018.listen(2018);
    it('proxy 2018 port', done => {
        request
            .get('/owner/repo/raw/ref/test')
            .expect(200)
            .expect(res => {
                res.should.be.json();
                res.body.owner.should.be.equal('owner');
            })
            .end(done);
    });
    it('proxy github repo api', done => {
        request
            .get('/repos/ksky521/mpspider')
            .expect(200)
            .expect(res => {
                res.should.be.json();
                res.body.html_url.should.be.equal('https://github.com/ksky521/mpspider');
            })
            .end(done);
    });
});
describe('test smarty.js', () => {
    it('file not found', done => {
        request.get('/template/demo/index.html').expect(200, 'hello', done);
    });
    it('template parse', done => {
        request
            .get('/template/demo/index.tpl')
            .buffer()
            .parse((res, next) => {
                res.data = '';
                res.on('data', chunk => {
                    res.data += chunk;
                });
                res.on('end', () => {
                    next(null, res);
                });
            })
            .end((err, res) => {
                const data = res.body.data;
                res.status.should.equal(200);
                data.should.be.match(/<title>百度<\/title>/);
                data.should.be.match(/杨幂邀请自家艺人助阵“明日之子”，众星纷纷表白！<\/p>/);
                done();
            });
    });
    // 保证报错404，扔给 next 处理
    it('dir index', done => {
        request.get('/template/').expect(200, 'hello', done);
    });
});
describe('art-template processor addon', () => {
    it('template with include', done => {
        request
            .get('/_art_/index/index.html')
            .expect(200)
            .expect(res => {
                debug(res.text);
                res.text.should.be.match(/aui/);
                res.text.should.be.match(/糖饼/);
            })
            .end(done);
    });
});

describe('测试目录类型', () => {
    it('/news/*', done => {
        request
            .get('/news/index/index.html')
            .expect(200)
            .expect(res => {
                debug(res.text);
                res.text.should.be.equal('/news/index/index.html');
            })
            .end(done);
    });
    it('newspage', done => {
        request
            .get('/newspage')
            .expect(200)
            .expect(res => {
                debug(res.text);
                res.text.should.be.equal('/newspage');
            })
            .end(done);
    });
});
