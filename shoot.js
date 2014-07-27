var http = require('http');
var phantom = require('node-phantom-simple');

var processing = false;
var requests = [];

// Request the current page and send back as png
// Then process next request in queue if there is one
var process = function(req, res){
	if(req && res){
		processing = true;
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
							process.apply(null, requests.shift());
						});
					}, 1000);
				});
			});
		});
	} else {
		processing = false;
	}
};

// Process the incoming request if not already processing
// Else put into queue
http.createServer(function (req, res) {
	if(!processing){
		process(req, res);
	} else {
		requests.push([req, res]);
	}
}).listen(process.env.PORT || 1337, function(){
	console.log('running');
});
