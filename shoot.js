var http = require('http');
var phantom = require('node-phantom-simple');
var lwip = require('lwip');

var processing = false;
var requests = [];

var processImage = function(res, result, ph){
	var imageBuffer = new Buffer(result, 'base64');
	lwip.open(imageBuffer, 'jpg', function(err, image){
		if (image) {
			image.scale(0.234375, function(err, image){
				image.toBuffer('jpg', function(err, imageBuffer){
					res.writeHead(200, {
						'Content-Type': 'image/jpg',
						'Content-Length': imageBuffer.length});
					res.end(imageBuffer);
					ph.exit()
					processRequest.apply(null, requests.shift());
				});
			});
		} else {
			console.log(err);
			res.send(500);
		}
	});
}

// Request the current page and send back as png
// Then process next request in queue if there is one
var processRequest = function(req, res){
	if(req && res){
		processing = true;
		phantom.create(function(err,ph) {
			return ph.createPage(function(err, page) {
				page.set('viewportSize', {
					width: 1024,
					height: 1024
				});
				return page.open(req.url.slice(1), function(err, status) {
					page.renderBase64("JPEG", function(error, result){
						if (result) {
							processImage(res, result, ph);
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
