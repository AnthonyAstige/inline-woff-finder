/* eslint-disable no-sync */
const _ = require('lodash')
const Fontmin = require('fontmin')
const fs = require('fs')

const fontmin = new Fontmin()
	.src('../fonts/ofl/**/*.ttf')
	.use(Fontmin.glyph({
		text: '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%20' +
				'~`!@#$%^&*()-_=+{}[]\\|;:\'"<,>./?©',
		// keep ttf hint info (fpgm, prep, cvt). default = true
		hinting: true
	}))
	.use(Fontmin.ttf2woff({
		deflate: true // deflate woff
	}))
	.dest('build/fonts')

fontmin.run((err, files) => {
	if (err) {
		throw err
	}

	const infos =
		_.map(
			_.filter(files, (file) => file.history[1].match(/\.woff$/)),
			(file) => ({
				size: file.stat.size,
				name: file
					.history[1]
					.split('/')
					.pop()
					.replace(/\.woff$/, '')
					.split('-')[0],
				weightStyle: file
					.history[1]
					.split('/')
					.pop()
					.replace(/\.woff$/, '')
					.split('-')[1]
			}))
		.sort((a, b) => a.size - b.size)

	const filename = 'build/fonts-data.json'
	fs.writeFileSync(filename, JSON.stringify(infos))
	console.log(`Info on ${infos.length} fonts written to: ${filename}`)
})
