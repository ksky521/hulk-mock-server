/**
 * @file 测试入口
 */

const path = require('path');
const supertest = require('supertest');
const should = require('should');
const shouldHttp = require('should-http');
const express = require('express');
const app = express();
const {name} = require('../package.json');
const debug = require('debug')(`${name}:test`);

const mockServer = require('../');

const configSmarty = mockServer({
    contentBase: path.join(__dirname, './'),
    rootDir: path.join(__dirname, './mock'),
    processors: [
        `smarty?router=/template/*&baseDir=${path.join(__dirname, './template')}&dataDir=${path.join(__dirname, './mock/_data_')}`
    ]
});

app.use(configSmarty);

app.get('/*', (req, res) => {
    // 为了测试 next 可以透传到最底层 router
    res.end('hello');
});

const request = supertest(app);

describe('test jsondata.js', () => {
    it('index.json', done => {
        request
            .get('/_data_/demo/index.json')
            .expect(200, require('./mock/_data_/demo/index.json'), done);
    });
    it('mock.json', done => {
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
        request
            .get('/_data_/demo/')
            .expect(200, /title="(index|mock)\.json"/, done);
    });
});
describe('test mock.js', () => {
    it('api user', done => {
        request.get('/api/user')
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
    it('proxy github repo/*', done => {
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
    it('template not exist', done => {
        request
            .get('/template/demo/index.html')
            .expect(200, 'hello', done);
    });
    it('template parse', done => {
        request
            .get('/template/demo/index.tpl')
            .buffer()
            .parse((res, next) => {
                res.data = '';
                res.on('data', (chunk) => {
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
        request
            .get('/template/')
            .expect(200, 'hello', done);
    });
});
describe('test processor addon', () => {
    it('art processor', done => {

    });
});
