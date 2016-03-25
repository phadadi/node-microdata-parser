//var request = require('request');
var htmlparser = require("htmlparser2");

function parse(data, cb) {
  cb = cb || function () {};
  var items = [];
  var scopes = [];
  var getNextText = null;
  var tags = [];
  var props = {};
  var propType = "http://schema.org/PropertyValue";
  
  var parser = new htmlparser.Parser({
    onopentag: function (name, attribs) {
      var scope = scopes.length && scopes[scopes.length - 1];

      if (attribs.hasOwnProperty('itemscope')) {
        // create a new scope
        if (attribs.itemprop && scopes.length) {
          // chain the scopes
          scope = scope[attribs.itemprop] = {};
        } else {
          scope = {};
        }
        scopes.push(scope);
        tags.push('SCOPE');
      } else {
        tags.push(false);
      }

      if (scope) {
        if (attribs.itemtype) {
          scope.type = attribs.itemtype;
        }
        if (attribs.itemprop && !attribs.hasOwnProperty('itemscope')) {
          if (attribs.content) {
            scope[attribs.itemprop] = attribs.content;
          } else if (attribs.href) {
            scope[attribs.itemprop] = attribs.href;
          } else if (attribs.src) {
            scope[attribs.itemprop] = attribs.src;
          } else {
            tags.pop();
            tags.push('TEXT');
            scope[attribs.itemprop] = '';
            getNextText = attribs.itemprop;
          }
        }
      }
    },
    ontext: function (text) {
      if (getNextText) {
        scopes[scopes.length - 1][getNextText] += text.replace(/^\s+|\s+$/g, "");
      }
    },
    onclosetag: function (tagname) {
      var tag = tags.pop();
      if (tag === 'SCOPE') {
        var item = scopes.pop();

        if (typeof item === 'object' && item.hasOwnProperty('type') && item.type === propType) {
          props[item.name] = item.value;
        }
        if (typeof item === 'object' && item.hasOwnProperty('type')) {
          delete item.type;
        }
        if (!scopes.length) {
          for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
              item[prop] = props[prop];
            }
          }
          delete item.additionalProperty;
          items.push(item);
        }
      } else if (tag === 'TEXT') {
        getNextText = false;
      }
    },
    onerror: function (err) {
      cb(err);
    },
    onend: function () {
      cb(null, items);
    }
  });

  parser.write(data);
  parser.done();
}

/*function parseUrl(url, cb) {
 cb = cb || function() {};
 
 request(url, function(err, res, body) {
 if (err) {
 return cb(err);
 }
 
 parse(body, cb);
 });
 }*/

exports.parse = parse;
//exports.parseUrl = parseUrl;