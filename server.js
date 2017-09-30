var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectId;
var passport = require('passport');
var jwt = require('jwt-simple');
var jwtverify = require('jsonwebtoken');
var multer = require('multer');
var fs = require('fs');
var grid = require('gridfs-stream');
var formidable = require("formidable");
var util = require('util');
// var uuid = require('node-uuid');
var base64 = require('node-base64-image');

var config = require('./config/database'); // get db config file
var User = require('./app/models/user'); // get the mongoose model
var Productupload = require('./app/models/productupload');
var states = require('./app/models/states');


// get our request parameters
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(__dirname + '/'));
// log to console
// app.use(morgan('dev'));

// Use the passport package in our application
app.use(passport.initialize());

// Start server
var port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Express server listening on %d', port);
});

// connect to database
var db = mongoose.connect(config.database, { useMongoClient: true });
var conn = mongoose.connection;

//CORS middleware
var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
};
app.use(allowCrossDomain);

// pass passport for configuration
require('./config/passport')(passport);

// bundle our routes
var apiRoutes = express.Router();
// connect the api routes under /api/*
app.use('/api', apiRoutes);

function ensureAuthorized(req, res, next) {
//  var bearerToken;
  var bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== 'undefined') {
    var bearer = bearerHeader.split(" ");
    var bearerToken = bearer[0];
    req.token = bearerToken;
    req.userid = jwtverify.verify(bearerToken, config.secret);
    next();
  } else {
    res.send(403);
  }
}

apiRoutes.get('/test', function(req, res){
 res.send("testing live server");
});

// create a new user account (POST http://localhost:8080/api/signup)
apiRoutes.post('/signup', function (req, res) {
  if (!req.body.data.name || !req.body.data.passwords.password) {
    res.json({success: false, msg: 'Please enter name and password.'});
  } else {
    var newUser = new User({
      profilename: req.body.data.name,
      name: req.body.data.email,
      password: req.body.data.passwords.password
    });
    // save the user
    newUser.save(function (err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function (req, res) {
  User.findOne({
    name: req.body.name
  }, function (err, user) {
    if (err) throw err;

     console.log({error: err, res: user, data: req.body});
    if (!user) {
      res.send({success: false, msg: 'Authentication failed. User not found.', error: user});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(user._id, config.secret);
          var name = user.name;
          // return the information including token as JSON
          res.send({success: true, token: token, profilename: user.profilename});
          //     res.json({Name:user.name})
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
 });
});

// route to a restricted info (GET http://localhost:8080/api/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', {session: false}), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      name: decoded.name
    }, function (err, user) {
      if (err) throw err;

      if (!user) {
        return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
      } else {
        res.json({success: true, msg: 'Welcome in the member area ' + user + '!'});
      }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

//---------image upload-----------

apiRoutes.post('/upload', function (req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = __dirname + '/uploads';
  form.keepExtensions = true;
  form.parse(req, function (err, fields, files) {
    if (!err) {
      console.log('Files Uploaded');
      grid.mongo = mongoose.mongo;
      var gfs = grid(conn.db);
      // console.log(files);
      var writestream = gfs.createWriteStream({
        filename: files.file.name
      });
      fs.createReadStream(files.file.path).pipe(writestream);
      writestream.on('close', function (file) {
        //  callback(null, file);
        var pid = (file._id.toString());
        res.send(pid);
      });
    }
  });

});

apiRoutes.get('getfile', function (req, res) {
//  var fs_write_stream = fs.createWriteStream('write.txt');

//read from mongodb
  var readstream = gfs.createReadStream({
    filename: req
  });
  //readstream.pipe(fs_write_stream);
  //fs_write_stream.on('close', function () {
  //  console.log('file has been written fully!');
  //});
});


apiRoutes.post('/product', function (req, res) {

  var newProduct = new Productupload({
    name: req.body.data.name,
    category: req.body.data.category,
    price: req.body.data.price,
    arrivaldate: req.body.data.arrivaldate,
    productimg: req.body.data.productimg
  });

  newProduct.save(function (err) {
    if (err) {
      console.log(err);
      return res.json({success: false, msg: 'Error in inserting.'});
    } else {
      res.json({success: true, msg: 'Successful Inserted.'});
    }
  });
});

apiRoutes.get('/productlist/:id', function (req, res) {
  return Productupload.findById(req.params.id, function (err, product) {
    if (!err) {
      imgid = product._doc.productimg;
      getFileById(imgid);
      return res.send(product);

    } else {
      return console.log(err);
    }
  });
});

function getFileById(req, res, next) {
  grid.mongo = mongoose.mongo;
  var gfs = grid(conn.db);
  //  var readstream = gfs.createReadStream({
  //    ID: req
  //  });
  //
  //
  // readstream.pipe(res);
  if (req) {
    // var mime = 'image/jpeg';
    // res.set('Content-Type', mime);
    var read_stream = gfs.createReadStream({ID: req});
    read_stream.pipe(res);
  } else {
    res.json('File Not Found');
  }
}

apiRoutes.get('/state', function (req, res) {
    db.collection('states').find(function (err, result) {
    if (!err) {
      return res.send(result);
    } else {
      return console.log(err);
    }
  });
});

apiRoutes.get('/cities/:id', function (req, res) {
   db.collection('cities').find({s_id: req.params.id}).toArray().then(function(doc) {
     res.send(doc);
   }, function(error){
     console.log(error)
   })

});

apiRoutes.post('/profiledata', ensureAuthorized, function (req, res) {

  var newpassword = function (oldpassword) {
    return new Promise(function (resolve, reject) {
      if (oldpassword) {
        User.findOne({_id: req.userid}, function (err, user) {
          if (err) {
            console.log('not found user');
          } else {
            user.newPassword(oldpassword, function (err) {
              if (err) {
                reject(console.log(err));
              } else {
                resolve(user.password);
              }
            });
          }
        });
      } else {
        updateUser();
      }
    })
  };

  newpassword(req.body.password).then(function (res) {
    updateUser(res)
  }, function (err) {
    console.log(err);
  });

  function updateUser(newPass) {
    var profileData = {};
    if (req.body.username) {
      profileData['name'] = req.body.username;
    }
    if (newPass) {
      profileData['password'] = newPass;
    }
    if (req.body.imageid) {
      profileData['imageId'] = req.body.imageid;
    }
    if (req.body.firstname) {
      profileData['firstName'] = req.body.firstname;
    }
    if (req.body.middlename) {
      profileData['middleName'] = req.body.middlename;
    }
    if (req.body.lastname) {
      profileData['lastName'] = req.body.lastname;
    }
    if (req.body.mobile) {
      profileData['mobileNo'] = req.body.mobile;
    }
    if (req.body.gender) {
      profileData['gender'] = req.body.gender;
    }
    if (req.body.address) {
      profileData['address'] = req.body.address;
    }
    if (req.body.newarrival || req.body.upcomingsale) {
      profileData['extraaddon'] = {'newarrival': req.body.newarrival, 'upcomingsale': req.body.upcomingsale};
    }
    if (req.body.selectedState) {
      profileData['state_id'] = req.body.selectedState;
    }
    if (req.body.selectedCity) {
      profileData['city_id'] = req.body.selectedCity;
    }
    var condition = {_id: req.userid};
    User.findOneAndUpdate(condition, profileData, {upsert: false, new: true}, function (err, doc) {
      if (err) {
        return res.json({success: false, msg: 'Unable To save.'});
      }
      res.json({success: true, msg: 'Successful Updated.'});
    });
  }
});

apiRoutes.get('/userBasicDetails', ensureAuthorized, function (req, res) {
  var user_id = new ObjectId(req.userid);
  var userdata = {};
  db.collection('users').findOne({_id: user_id}, function (err, result) {
    if (!err) {
      setuserObjects(result)
        .then(function (success) {
          imageFound(result.imageId)
            .then(function (success) {
              return res.json({userData: userdata});
            }, function (err) {
              return res.json({userData: userdata});   //without image
            })
           // getplace(result.placeId)
           //   .then(function (success) {
           //     return res.json({userData: userdata});
           //   })
        })
    } else {
      return console.log(err);
    }
  });


  var imageFound = function (imageid) {
    return new Promise(function (resolve, reject) {
      if (imageid) {
        grid.mongo = mongoose.mongo;
        var gfs = grid(conn.db);
        try {
          var data = [];
          var readstream = gfs.createReadStream({_id: imageid});
          readstream.on('data', function (chunk) {
            data.push(chunk);
          });

          readstream.on('end', function () {
            data = Buffer.concat(data);
            var img = 'data:image/jpeg;base64,' + Buffer(data).toString('base64');
            userdata['image'] = img;
            resolve(userdata['image']);
            // res.end(img);
          });

          readstream.on('error', function (err) {
            console.log('An error occurred!', err);
            throw err;
          });
        }
        catch (err) {
          console.log(err);
          return next(errors.create(404, "File not found."));
        }
      } else {
        reject('No Image');
      }

    })
  };

  var setuserObjects = function (data) {
    return new Promise(function (resolve, reject) {
      userdata['firstname'] = data.firstName;
      userdata['middlename'] = data.middleName;
      userdata['lastname'] = data.lastName;
      userdata['username'] = data.name;
      userdata['gender'] = data.gender;
      userdata['mobile'] = data.mobileNo;
      userdata['address'] = data.address;
      userdata['upcomingsale'] = data.extraaddon.upcomingsale;
      userdata['newarrival'] = data.extraaddon.newarrival;
      userdata['selectedState'] = data.state_id;
      userdata['selectedCity'] = data.city_id;
      resolve(userdata);
    })
  };
});

apiRoutes.get('/productType', function (req, res) {
  db.collection('product_type').find({}).toArray().then(function(doc) {
    res.send(doc);
  }, function(error){
    console.log(error)
  })

});

apiRoutes.get('/users', function (req, res) {
    db.collection('users').find({}).toArray().then(function(doc) {
        res.send(doc);
    }, function(error){
        console.log(error)
    })
});
