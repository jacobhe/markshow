
var http = require('http');
//var MarkShow = require(__dirname+'/markshow');
//var converter = new MarkShow();
//var markdown = converter.makeHtml;
var showdown = require(__dirname + "/showdown");
var converter = new showdown.Converter({tables: true, ghCodeBlocks: true});
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var _ = require('underscore');
var express = require('express');
var app = express();
var mdDir = '/api-docs';

var mainDir = __dirname + '/..';

var config = require('../config');

var mainTitle = config.title || 'MarkShow';

fs.readFile(mainDir + '/template.html', 'utf8', function (error, templateStr) {
  var html = _.template(templateStr);
  app.use(function (req, res, next) {
    var isIndex = false;
    var isDirPossible = false;
    var notFoundMd = "# 404 - Not found! \n\n We couldn't find \""+req.url+"\". \n\n";
    var url = req.url;
    if(url.split('/')[url.split('/').length-1] == ''){
      isIndex = true;
      url += 'index';
    }
    var filePath = mainDir + mdDir + decodeURIComponent(url);
    if(path.basename(filePath).split('.').length == 1){
      isDirPossible = true;
      filePath += '.md';
    }
    var dirPath = path.dirname(filePath);
    var links = [];
    var parts = req.url.split('/').slice(0,req.url.split('/').length-2);
    var indexlink = {
      name: '',
      url: ''
    };
    fs.readdir(dirPath, function(err, files){
      fs.readFile(filePath, 'utf8', function (error, data) {
        if (error) {
          if(isIndex){
            filePath = filePath.slice(0,filePath.length-(isIndex?9:3));
            fs.readdir(filePath, function(err, files){
              if(err){
                return next();
              } else {
                return serveResponse(files, '');
              }
            });
          } else if(isDirPossible){
            return res.redirect(302, req.url+'/');
          } else {
            return next();
          }
        } else if(filePath.slice(filePath.length-3,filePath.length)=='.md'){
          return serveResponse(files, data);
        } else {
          return next();
        }
      });
    });
    function serveResponse(files, data){
      _.each(files,function(file){
        if(file[0]=='.') return;
        if(file=='index.md'){
          var name = dirPath.split('/').pop();
          var urlParts = req.url.split('/');
          urlParts.pop();
          var url = urlParts.join('/') + '/';
          indexlink = {
            name: name,
            url: url,
            active: req.url==url,
            bold: true
          }
        } else {
          var name = file;
          if(name.split('.md').length>1){
            name = name.slice(0,name.length-3);
          }
          links.push({
            name: name,
            url: name,
            active: req.url.split('/')[req.url.split('/').length-1]==name
          });
        }
      });
      links.unshift(indexlink);
      links.unshift({
        name: '..',
        url: '../'
      });
      var parts =  req.url.split('/');
      var title = (parts[parts.length-1] == '') ? parts[parts.length-2] : parts[parts.length-1];
      res.send(html({
        title: mainTitle + (title ? ' | '+title : ''),
        body: converter.makeHtml(data),
        url: req.url,
        links: links,
        useMin: config.useMin
      }));
    }
  });

  app.use(express.static(mainDir+mdDir));

  var port = config.port || 8888;
  app.listen(port, function(err){
    if(err) console.error(err);
    else console.log('MarkShow started at http://localhost:'+port+'/');
  });
  
});
