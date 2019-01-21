const path = require('path');
const http = require('http');
const mq = require('mq');
const fs = require('fs');
const vm = require('vm');
const io = require('io');
const coroutine = require('coroutine')

const fxHb = require('@fxjs/handbag');

const utils = require('./utils');

const detectPort = require('@fibjs/detect-port');

const port = detectPort(process.env.PORT);

const vbox = new vm.SandBox({});
const commonOptions = { burnout_timeout: -2000 };

;[
	['system', ['.vue']],
	['iife', ['.vjs']]
].forEach(([format, suffix]) => {
	fxHb.registers.vue.registerVueAsRollupedJavascript(vbox, {
		...commonOptions,
		suffix: suffix,
		rollup: {
			onGenerateUmdName: () => undefined,
			writeConfig: {
				output: {
					format: format
				}
			}
		}
	})
});

fxHb.registers.plain.registerAsPlain(vbox, {...commonOptions, suffix: ['.html']})
fxHb.registers.plain.registerAsPlain(vbox, {...commonOptions, suffix: ['.mp3', '.mp4']})

const fileHandler = http.fileHandler(path.resolve(__dirname, '../static'))

const jsHandler = (req, _path) => {
	req.response.write(vbox.require(`../views/${_path}`, __dirname))
	req.response.setHeader({
		'Content-Type': 'application/javascript'
	})
}

// Log app's health
coroutine.start(() => {
	while(true) {
		coroutine.sleep(2000)
		const rss = require('os').memoryUsage().rss;
		console.log('memoryUsage()', rss / (1024 * 1024));
	}
})

const VIDEO_SLIDE_SIZE = 1024 * 1024 * 6;
const MUSIC_SLIDE_SIZE = 1024 * 1024;

const getStreamHandler = (mime, slideSize = VIDEO_SLIDE_SIZE) => {
	return (req, _path) => {
		const filename = vbox.resolve(`../static/${_path}`, __dirname);
		const file = fs.openFile(filename);
		const fsize = file.size();

		req.response.setHeader({
			"Accept-Ranges": "bytes",
			"Content-Type": mime,
			'Cache-Control': 'no-cache',
		});

		// console.log('req.method', req.method);
		// if ('HEAD' == req.method) {
		//     return req.response.setHeader('Content-Length', fsize);
		// }

		const RangeValue = req.headers.first('Range') || '';
		if (!RangeValue) {
			req.response.setHeader({
				"Accept-Ranges": "bytes",
			});
			return
		}

		const parseInfo = utils.rangeParser(fsize, RangeValue)[0];
		console.log('RangeValue', RangeValue);
		// console.log('parseInfo', parseInfo);
		let { start = null, end = null } = parseInfo || {};

		console.log('parsed', end < fsize, start);
		console.log('parsed', end < fsize, fsize);
		console.log('parsed', end < fsize, end);

		if (start >= fsize || end >= fsize) {
			req.response.status = 416;
			req.response.setHeader('Content-Range', `bytes */${fsize}`);
			return
		}

		file.seek(start, fs.SEEK_SET);
		const buf = file.read(slideSize);
		const chunkSize = buf.length;
		req.response.write(buf);
		file.rewind();
		const fend = start + chunkSize;

		console.log('end before response', end, start);
		console.log('chunkSize', chunkSize);

		req.response.statusCode = 206;
		req.response.setHeader({
			"Content-Length": chunkSize,
			"Accept-Ranges": "bytes",
			'Content-Range': `bytes ${start}-${fend - 1}/${fsize}`,
		});
		console.log('response-header', req.response.headers.first('Content-Range'));

		console.log('\n');
	}
}

const routing = new mq.Routing({
	'(.*).html$': (req, _path) => req.response.write(vbox.require(`../views/${_path}`, __dirname)),
	'(.*).vue$': jsHandler,
	'(.*).vjs$': jsHandler,
	'(.*).mp3$': getStreamHandler('audio/mp3', MUSIC_SLIDE_SIZE),
	'(.*).mp4$': getStreamHandler('video/mp4', VIDEO_SLIDE_SIZE),
	// '(.*.mp3$)': [fileHandler, streamHandler],
	// '(.*.mp4$)': [fileHandler, streamHandler],
	'*': fileHandler
})

const server = new http.Server(port, routing)

server.enableCrossOrigin('Content-Type,invocation-protocol')

server.run(() => void 0);
console.log(`server started on listening ${port}`)

process.on('SIGINT', () => {
	server.stop()
	process.exit()
})
