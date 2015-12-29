# Screenshooter

Generates a screenshot of any web page - as API or command line. Powered by [PhantomJS](http://phantomjs.org).

![Screenshooter](example.png)


## How to run it

1. Install PhantomJS and get `phantomjs` in your PATH.
2. Install GraphicsMagick.
2. Install node packages: `npm install`
3. Start Screenshooter with `node shoot.js`

![Codeship build status](https://www.codeship.io/projects/2fe0e610-b368-0131-9eae-664e1beed1ef/status)


## How to use it

Browser: Open your favorite browser and take a screenshot like this: `http://localhost:1337/http://ljugare.com`

Embed a screenshot directly into an HTML `img` tag:

	<img src="http://localhost:1337/http://www.google.com" alt="Google’s website">

Command line:

	node shoot.js http://ljugare.com myimage.jpg imageWidth=500 imageHeight=400

### Parameters

E.g. `http://localhost:1337/http://ljugare.com?imageFormat=png`

* imageFormat: (default: 'jpg')
* imageWidth (default: 240)
* imageHeight (default: 240)
* browserWidth (default: 1024)
* browserHeight (default: 1024)
* gravity (default: 'North') - how images are positioned/cropped
