var express = require("express");
var request = require("request");
var monk = require("monk");
var app = express();
var db = monk('mongodb://username:password@ds039261.mongolab.com:39261/heroku_qbhgwl37');

app.use(function (req, res, next) {
  req.db = db;
  next();
});

app.use(express.static('public'));

app.get('/new/*', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    
    var url = req.url.match(/\/new\/(.+)([?]allow=true)?/)[1];
    var urls = req.db.get('urls');
    var absoluteUrl = req.headers['x-forwarded-proto'] + "://" + req.headers.host + "/";
    
    urls.find({
      url: url
    }, function (err, result) {
        if (err) throw err;
        
        if (result.length) {
          
          res.end(JSON.stringify({
            original_url: result[0].url,
            short_url: absoluteUrl + result[0]._id
          }));
          
        } else {
          
          if (req.query.allow === 'true') {
            res = addAndShow(url, urls, res, absoluteUrl);  
          } else {
            request(url, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                res = addAndShow(url, urls, res, absoluteUrl);
              } else {
                res.end(JSON.stringify({error:'URL invalid'}));
              }
            });
          }
          
        }
        
    });
    
});

app.get('/', function (req, res) {
    res.sendfile('index.html');
});

app.get('/:identifier', function(req, res) {
    var id = parseInt(req.params.identifier);
    var urls = req.db.get('urls');
    
    try {
      urls.find({
        _id: id
      }, function(err, result) {
        if (err) throw err;
        
        if (result.length) {
          res.writeHead(301, {Location: result[0].url});
          res.end();
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({error: 'No short url found for given input'}));
        }
      });  
    } catch (ex) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error: 'No short url found for given input'}));
    }
});

app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function () {
    console.log('listening');
});

function addAndShow (url, urls, res, absoluteUrl) {
  urls.findAndModify({
    query: { _id: 1 },
    update: { $inc: {seq: 1} },
    new: true
  }, function (err, result) {
    if (err) throw err;
    
    urls.insert({
      _id: result.seq,
      url: url
    }, function (err, result) {
      if (err) throw err;
      
      res.end(JSON.stringify({
        original_url: result.url,
        short_url: absoluteUrl + result._id
      }));
    });
    
  });
  
  return res;
}