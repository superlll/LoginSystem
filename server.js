var http = require("http");
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var sha256 = require('js-sha256');
mongoose.connect('mongodb://localhost/user');
console.log("Started server");

const USER = "info";
const LOG = "log";
const STATIC = __dirname + "/client/";

var genericSchema = new mongoose.Schema({}, { strict: false });

var createDoc = function(document, collection, callback){
  var Model = mongoose.model('Model', genericSchema, collection);
  Model.create(document, function(err, document){
    if(!err){
      callback(document);
    }
  });
};

var findDocs = function(collection, filter, callback){
  var Model = mongoose.model('Model', genericSchema, collection);
  Model.find(filter).exec(function(err, documents){
    if (!err){
      callback(documents);
    }
  });
};

var updateDoc = function(collection, match, changes, callback){
  var Model = mongoose.model('Model', genericSchema, collection);
  Model.update(match, {$set: changes}, function(err, document){
    if (!err){
      callback(document);
    }
  });
};

var deleteDoc = function(collection, id, callback){
  var Model = mongoose.model('Model', genericSchema, collection);
  Model.findByIdAndRemove(id, function(err, document){
    if (!err){
      callback(document);
    }
  });
};

var secure = function(pwd) {
  //var pwd = encodeURI(pwd);
  return sha256(pwd);
};

var log = function(docs) {
  var output = '<h1>Previous login time</h1>';
  for (var i=0; i<docs.length; i++){
    output += '<p>' + docs[i].toObject().time + '</p>';
  }
  return output;
};

var app = express();
var myServer = http.createServer(app);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/users/:userid', function(req, res){
   res.send("You asked for data from User "+req.params.userid); 
});


// Github OAuth
const config = require('./config.js');
app.get('/github', function(req, res) {
   var path = "https://github.com/login/oauth/authorize";
        path += '?client_id=' + config.client_id;
        path += '&scope=' + config.scope;
        path += '&state=' + (new Date()).valueOf();
    res.redirect(path); 
});

var request = require('request');
app.get('/oauth/callback', function(req, res) {
   const options = {
        url: 'https://github.com/login/oauth/access_token',
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        form: { client_id: config.client_id,
                client_secret: config.client_secret,
                code: req.query.code }
    };
    request(options, function(error, response, body){
      if (!error && response.statusCode == 200) {
        const args = response.body.split('&'), 
                  arg = args[0].split('='), 
                  access_token = arg[1];
        request({
          url: 'https://api.github.com/user?access_token=' + access_token,
          headers: {'User-Agent': 'mean'}
        }, function(e, r, b){
            const name = JSON.parse(r.body).login;
            // res.json(name);
            createDoc({"name":name, "time": new Date()}, LOG, function(docs) {});
            findDocs(LOG, {"name": name}, function(docs) {
                res.write(log(docs));
            });
        });
      }
    });
});

app.post('/login', function(req, res){
  var name = req.body.name, pwd = secure(req.body.pwd);
  findDocs(USER, {"name": name, "password": pwd}, function(docs){
      if (docs.length > 0) {
          createDoc({"name":name, "time": new Date()}, LOG, function(docs) {});
          findDocs(LOG, {"name": name}, function(docs) {
              res.write(log(docs));
          });
      }
      else {
        res.write("<p>Your password is incorrect.</p>");
      }
  });
});

app.post('/signup', function(req, res){
  var name = req.body.name, pwd = secure(req.body.pwd);
  findDocs(USER, {"name": name}, function(docs){
      console.log(docs);
      if (docs.length == 0 ) {
        createDoc({"name": name, "password": pwd}, USER, function(docs){
            res.write("<p>Your account is created successfully.</p>");
            res.write('<a href = "/login">login</a>');
        });
      }
      else {
        res.write("<p>Your username is already used.</p>");
      }
  });
});

app.post('/change', function(req, res){
  var name = req.body.name, 
      oldPwd = secure(req.body.oldPwd),
      newPwd = secure(req.body.newPwd);
  findDocs(USER, {"name": name, "password": newPwd}, function(docs){
      if (docs.length == 0 ) {
        updateDoc(USER, {"name": name}, {"password": newPwd}, function(docs){
          if (docs.nModified > 0) {
            res.write("<p>Your password is updated.</p>");
            res.write('<a href = "/login">login</a>');
          } 
          else {
            res.write("<p>An error occurs.</p>");
          }
        });
      }
      else {
        res.write("<p>Your password is incorrect.</p>");
      }
  });
});

app.get("/change-pwd-page", function(req, res){
  res.sendfile(STATIC + 'change.html');
});

app.get("/login", function(req, res){
  res.sendfile(STATIC + 'index.html');
});

app.get("/register",function(req,res){
  res.sendfile(STATIC + 'register.html');
});

myServer.listen(8080, '0.0.0.0');