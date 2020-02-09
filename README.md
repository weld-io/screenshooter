# Screenshooter

Generates a screenshot of any web page - as API or command line. Powered by [Puppeteer](https://github.com/GoogleChrome/puppeteer).

Made by the team at **Weld** ([www.weld.io](https://www.weld.io?utm_source=github-screenshooter)), the code-free app and web creation tool:

[![Weld](https://s3-eu-west-1.amazonaws.com/weld-social-and-blog/gif/weld_explained.gif)](https://www.weld.io?utm_source=github-screenshooter)

## Screenshot

![Screenshooter](docs/example.png)

## How to run it

1. Install dependencies: `yarn`
2. Start Screenshooter with `yarn start`

![Codeship build status](https://www.codeship.io/projects/2fe0e610-b368-0131-9eae-664e1beed1ef/status)

## How to use it

Browser: Open your favorite browser and take a screenshot like this: `http://localhost:3337/?url=https://ljugare.com`

Embed a screenshot directly into an HTML `img` tag:

	<img src="http://localhost:3337/?url=https://www.google.com" alt="Google’s website">

### Parameters

E.g. `http://localhost:3337/?url=https://ljugare.com?imageFormat=png`

* `url` (required)
* `format`: `jpeg` (default) or `png`
* `width`: default 800
* `height`: default 450
* `dpr`: deviceScaleFactor, default is 1.0. Note you can use this as a zoom factor; the browser canvas has the same size, but the output image has different size.
* `time`: milliseconds or `networkidle0`

## Command line (not currently supported)

	node api/image.js http://ljugare.com myimage.jpg imageWidth=500 imageHeight=400
