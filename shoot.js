var http = require('http');
var phantom = require('node-phantom-simple');
var gm = require('gm');
var url = require('url');

var processing = false;
var requests = [];

var processImage = function(res, result, ph, imageWidth, imageFormat){
	var imageBuffer = new Buffer(result, 'base64');
	gm(imageBuffer, 'image.jpg').trim().resize(imageWidth || 240).toBuffer(imageFormat || 'JPG', function(err, newBuffer){
		res.writeHead(200, {
			'Content-Type': 'image/' + imageFormat || 'jpg',
			'Content-Length': newBuffer.length});
		res.end(newBuffer);
		ph.exit()
		processRequest.apply(null, requests.shift());
	});
}

// Request the current page and send back as png
// Then process next request in queue if there is one
var processRequest = function(req, res){
	if(req && res){
		var queryStrings = url.parse(req.url, true).query;
		processing = true;
		phantom.create(function(err,ph) {
			return ph.createPage(function(err, page) {
				page.set('viewportSize', {
					width: 1024,
					height: 1024
				});
				return page.open(req.url.slice(1), function(err, status) {
					page.renderBase64(queryStrings.imageFormat || "JPEG", function(error, result){
						if (result) {
							processImage(res, result, ph, queryStrings.imageWidth, queryStrings.imageFormat);
						} else {
							console.log(error);
							res.send(500);
						}
					});

				});
			}, {parameters: {'ignore-ssl-errors': 'yes'}});
		});
	} else {
		processing = false;
	}
};

// Process the incoming request if not already processing
// Else put into queue
http.createServer(function (req, res) {
	if(!processing){
		processRequest(req, res);
	} else if (requests.length > 10) {
		requests = [];
		processRequest(req, res);
	} else {
		requests.push([req, res]);
	}
}).listen(process.env.PORT || 1337, function(){
	console.log('running');
});
