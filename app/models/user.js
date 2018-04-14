
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcryptjs');

// set up a mongoose model
var UserSchema = new Schema({
  // _id: {
  //       type: String
  //   },
  email: {
        type: String,
        unique: true,
        required: true
    },
  password: {
        type: String,
        required: true
    },
  profilename: {
        type: String
    },
  profilePic: {
    type: String
  },
  firstName: {
    type: String
  },
  middleName: {
    type: String
  },
  lastName: {
    type: String
  },
  mobileNo: {
    type: String
  },
  gender: {
    type: String
  },
  address: {
    type: String
  },
  city_id: {
    type: String
  },
  state_id: {
    type: String
  },
  extraaddon: {
    type: Object
  }
},{ versionKey: false
});


UserSchema.pre('save', function (next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

UserSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

UserSchema.methods.newPassword = function (newpass, next) {
  var user = this;
  bcrypt.genSalt(10, function (err, salt) {
    if (err) {
      return console.error(err);
    }
    bcrypt.hash(newpass, salt, function (err, hash) {
      if (err) {
        return console.error(err);
      }
      user.password = hash;
      next();
    });
  });
};

module.exports = mongoose.model('User', UserSchema);

