// TODO: Refactor all of this stuff

// Script Config
const quickDevMode = true

/* eslint-disable no-sync */
const _ = require('lodash')
const Fontmin = require('fontmin')
const FontsSimilarizer = require('fonts-similarizer')
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

// OFL Fonts from Google
let fontsPath = '/home/anthony/fonts/ofl'

if (quickDevMode) {
	// Dev Fonts (just a few locally)
	fontsPath = `${__dirname}/fonts`
}

// Clear build folder before each run
const buildPath = `${__dirname}/build`
fs.removeSync(buildPath)

const builtPath = (subPath) => `${__dirname}/build/fonts/${subPath}`

/**
 * Remove & erase jank fonts from data output & filesystem
 * * Too large (> 10kb with full glyph subset)
 * * Missing glyphs from full subset
 **/
function removeJank(files) {
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
	return files.filter((f) => !isJank(f))			// Remove erased jank from JSON
}

/**
 * Remove too similar of fonts
 */
function removeSimilar(files) {
	// console.log('Removing dupes (this could take a few minutes..)')
	// console.time('RemoveDupes')
	for (let ii = 0; ii < files.length; ii++) {
		const fullPathII = `${buildPath}/fonts/${files[ii].fp}.ttf`
		for (let jj = ii; jj < files.length; jj++) {
			if ((ii === jj) || files[jj].dupe) {
				continue
			}
			const fullPathJJ = `${buildPath}/fonts/${files[jj].fp}.ttf`
			const fontsSimilarizer = new FontsSimilarizer(fullPathII, fullPathJJ)
			const similarity = fontsSimilarizer.getVisualSimilarity()
			// If too similar, remove the prior font and move on
			if (similarity > 0.99) {
				files[jj].dupe = true
				continue
			}
		}
	}
	// Erase dupe files
	_.forEach(files.filter((f) => f.dupe), (eraseMe) => {
		['ttf', 'woff'].forEach((ext) => fs.removeSync(builtPath(`${eraseMe.fp}.${ext}`)))
	})
	// Erase now empty folder
	deleteEmpty.sync(buildPath, { silent: true })	// Erase empty folders
	// console.timeEnd('RemoveDupes')
	return files.filter((f) => !f.dupe) // Remove dupes from JSON
}

console.log('Generating subset fonts')

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
	console.log('Adding font Meta Data & sorting by size')
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

	console.log('Removing jank fonts (missing glyphs, too big, ...)')
	files = removeJank(files)

	console.log('Removing dupe fonts (too similar looking)')
	files = removeSimilar(files)

	/**
	 * Ouput JSON data
	 */
	const filename = 'build/fonts-data.js'
	fs.writeFileSync(filename, `var fontsData=${JSON.stringify(files)}`)
	console.log(`\nInfo on ${files.length} fonts written to: ${filename}`)
})
