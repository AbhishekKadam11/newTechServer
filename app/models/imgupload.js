/**
 * Created by Admin on 06-07-2016.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;



var schema = new Schema({
    img: { data: Buffer, contentType: String }
});

var A = mongoose.model('A', schema);
var a = new A;

// store an img in binary in mongo
a.img.data = fs.readFileSync(imgPath);
a.img.contentType = 'image/png';
a.save(function (err, a) {
    if (err) throw err;

    console.error('saved img to mongo');

} );