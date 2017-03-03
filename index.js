// TODO: Refactor all of this stuff

/* eslint-disable no-sync */
const _ = require('lodash')
const Fontmin = require('fontmin')
const fs = require('fs-extra')
const fontkit = require('fontkit')
const deleteEmpty = require('delete-empty')

// Glyph config
const az = 'abcdefghijklmnopqrstuvwxyz'
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const digits = '1234567890'
const space = '%20'
const special = '~`!@#$%^&*()-_=+{}[]\\|;:\'"<,>./?'
const glyphs = `${az}${AZ}${digits}${space}${special}`
const numberGlyphs = glyphs.length - 2 // %20 is only one character (The space)

// Fonts loading config
const quickDevMode = false

// OFL Fonts from Google
let fontsPath = '/home/anthony/fonts/ofl'

if (quickDevMode) {
	// Dev Fonts (just a few locally)
	fontsPath = `${__dirname}/fonts`
}

// Clear build folder before each run
const buildPath = `${__dirname}/build`
fs.removeSync(buildPath)

/**
 * Setup font processing
 */
const fontmin = new Fontmin()
	.src(`${fontsPath}/**/*.ttf`)
	.use(Fontmin.glyph({
		text: glyphs,
		// keep ttf hint info (fpgm, prep, cvt). default = true
		hinting: true
	}))
	.use(Fontmin.ttf2woff({
		deflate: true // deflate woff
	}))
	.dest('build/fonts')

// Process fonts
fontmin.run((err, cbFiles) => {
	if (err) {
		throw err
	}

	// Only keep .woff files (Can figure out the rest from these
	// * Simpler not to have dupes
	let files = cbFiles.filter((file) => file.history[1].match(/\.woff$/))

	/**
	 * Add Meta data
	 */
	files =
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
					.split('-')[1],
				fp: file
					.history[0]
					.replace(`${fontsPath}/`, '')
					.replace('.ttf', '')
			}))
		.sort((a, b) => a.size - b.size)

	/**
	 * Remove & erase jank fonts from data output & filesystem
	 * * Too large (> 10kb with full glyph subset)
	 * * Missing glyphs from full subset
	 **/
	const builtPath = (subPath) => `${__dirname}/build/fonts/${subPath}`
	const maxSize = 10 * 1024
	function isJank(file) {
		const p = builtPath(`${file.fp}.woff`)
		return	!fs.existsSync(p) ||								// Already deleted
				file.size > maxSize ||								// Too large
				(fontkit.openSync(p).numGlyphs !== numberGlyphs)	// Missing glyphs
	}
	_.forEach(files.filter(isJank), (eraseMe) => {	// Erase jank files
		['ttf', 'woff'].forEach((ext) => fs.removeSync(builtPath(`${eraseMe.fp}.${ext}`)))
	})
	deleteEmpty.sync(buildPath, { silent: true })	// Erase empty folders
	files = files.filter((f) => !isJank(f))			// Remove erased jank from JSON

	/**
	 * Ouput JSON data
	 */
	const filename = 'build/fonts-data.js'
	fs.writeFileSync(filename, `var fontsData=${JSON.stringify(files)}`)
	console.log(`Info on ${files.length} fonts written to: ${filename}`)
})
