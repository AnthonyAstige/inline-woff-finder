/* eslint-disable no-sync */
const _ = require('lodash')
const Fontmin = require('fontmin')
const fs = require('fs')
const fontkit = require('fontkit')

const glyphs = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%20' +
				'~`!@#$%^&*()-_=+{}[]\\|;:\'"<,>./?©'
const numberGlyphs = glyphs.length - 2 // %20 is only one character (The space)
const fontmin = new Fontmin()
	.src('../fonts/ofl/**/*.ttf') // OFL from Google
//	.src('fonts/**/*.ttf') // Dev
	.use(Fontmin.glyph({
		text: glyphs,
		// keep ttf hint info (fpgm, prep, cvt). default = true
		hinting: true
	}))
	.use(Fontmin.ttf2woff({
		deflate: true // deflate woff
	}))
	.dest('build/fonts')

fontmin.run((err, cbFiles) => {
	if (err) {
		throw err
	}
	// open a font synchronously
	const files = _.filter(cbFiles, (file) => {
		// Only .woff files
		if (!file.history[1].match(/\.woff$/)) {
			return false
		}
		// Ensure all Glyphs we want are present
		return fontkit.openSync(file.history[2]).numGlyphs === numberGlyphs
	})

	const infos =
		_.map(files,
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
