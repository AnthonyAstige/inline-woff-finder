const Fontmin = require('fontmin')

const fontmin = new Fontmin()
	.src('fonts/*.ttf')
	.use(Fontmin.glyph({
		text: '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%20~`!@#$%^&*()-_=+{}[]\\|;:\'"<,>./?©',
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

	console.log(files)
})
