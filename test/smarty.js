
const express = require('express');
// const smarty = require('../lib/smarty');
var glob = require("glob")
const pathToReg = require('path-to-regexp');
const parseUrl = require('parseurl');
var serveIndex = require('serve-index');
const app = express();
const path = require('path');
// Serve URLs like /ftp/thing as public/ftp/thing
// The express.static serves the file contents
// The serveIndex is this module serving the directory
// const index = serveIndex('.', {'icons': true});
app.use((req, res, next) => {
    var reg = pathToReg('/_mockdata_/*.tpl');
    console.log(req.path, reg, reg.exec(req.path));
    res.end(req.path + '==========' + req.pathname);
});

app.listen(3000);
