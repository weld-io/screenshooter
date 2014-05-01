var http = require('http');
var phantom=require('node-phantom-simple');

http.createServer(function (req, res) {
  phantom.create(function(err,ph) {
    return ph.createPage(function(err, page) {
      return page.open(req.url.slice(1), function(err, status) {
        //Wait for a bit for AJAX content to load on the page. Better solution?
        setTimeout(function() {
          page.renderBase64("PNG", function(error, result){
            var imageBuffer = new Buffer(result, 'base64');
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': imageBuffer.length});
            res.end(imageBuffer);
            ph.exit()
          });
        }, 1000);
      });
    });
  });
}).listen(process.env.PORT || 1337, function(){
  console.log('running');
});
