var http = require('http');
//var phantom=require('node-phantom-simple');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
  // phantom.create(function(err,ph) {
  //   return ph.createPage(function(err, page) {
  //     return page.open(req.url.slice(1), function(err, status) {
  //       //Wait for a bit for AJAX content to load on the page. Better solution?
  //       setTimeout(function() {
  //         page.renderBase64("PNG", function(error, result){
  //           var imageBuffer = new Buffer(result, 'base64');
  //           res.writeHead(200, {
  //             'Content-Type': 'image/png',
  //             'Content-Length': imageBuffer.length});
  //           res.end(imageBuffer);
  //           ph.exit()
  //         });
  //       }, 2000);
  //     });
  //   });
  // });
  // phantom.create(function(err,ph) {
  //   return ph.createPage(function(err, page) {
  //     return page.open(req.url.slice(1), function(err, status) {
  //       //Wait for a bit for AJAX content to load on the page. Better solution?
  //       setTimeout(function() {
  //         page.renderBase64("PNG", function(error, result){
  //           var imageBuffer = new Buffer(result, 'base64');
  //           res.writeHead(200, {
  //             'Content-Type': 'image/png',
  //             'Content-Length': imageBuffer.length});
  //           res.end(imageBuffer);
  //           ph.exit()
  //         });
  //       }, 2000);
  //     });
  //   });
  // });
}).listen(process.env.PORT || 1337, function(){
  console.log('Server running at port 1337');
});


