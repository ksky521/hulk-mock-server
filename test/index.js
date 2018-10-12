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

const port = 3000;
const mockServer = require('../');

const configSmarty = mockServer({
    contentBase: path.join(__dirname, './'),
    rootDir: path.join(__dirname, './mock'),
    processors: [`smarty?router=/template/*&baseDir=${path.join(__dirname, './template')}&dataDir=${path.join(__dirname, './mock/_data_')}`]
});

app.use(configSmarty);

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
            .expect(200)
            .expect(res => {
                res.should.be.html();
                // debug(res.text)
                res.text.should.match(/title="mock\.json"/);
                res.text.should.match(/title="index\.json"/);
            })
            .end(done);
    });
});
// describe('test mock.js', () => {

// });
describe('test smarty.js', () => {
    it('template not exist', done => {
        request
            .get('/template/demo/index.html')
            .expect(404, done);
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
            .expect(404, done);
    });
});
// describe('test processor addon', () => {
// });
// it('mock api')
// it('mock proxy')
// it('jsondata dir')
// it('jsondata dir without slash')
// it('smarty dir')
// it('smarty dir without slash')
// it('smarty tpl')

// it('art processor')
