var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CustomerReviewSchema = new Schema({
    customerId: {
        type: String,
        required: true
    },productId: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: false
    },
    starRate: {
        type: Number,
        required: true
    },
    postDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('CustomerReview', CustomerReviewSchema);