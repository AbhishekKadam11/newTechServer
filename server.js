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
var async = require("async");
var base64 = require('node-base64-image');
var await = require('asyncawait/await');
var asyncawait = require('asyncawait/async');
var shortid = require('shortid');
var base64Img = require('base64-img');

var config = require('./config/database'); // get db config file
var User = require('./app/models/user'); // get the mongoose model
var Productupload = require('./app/models/productupload');
var states = require('./app/models/states');
var OrderRequest = require('./app/models/placeorder');
var CustomerReview = require('./app/models/userreview');

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
// var db = mongoose.connect(config.database, { useMongoClient: true });
// var conn = mongoose.connection;
mongoose.connect(config.database, { useMongoClient: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log("mongoose connected");
});

//CORS middleware
var allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
};
app.use(allowCrossDomain);

// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });

// pass passport for configuration
require('./config/passport')(passport);

// bundle our routes
var apiRoutes = express.Router();
// connect the api routes under /api/*
app.use('/api', apiRoutes);

function ensureAuthorized(req, res, next) {
    var bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== 'undefined') {
        var bearer = bearerHeader.split(" ");
        var bearerToken = bearer[0];
        req.token = bearerToken;
        req.userid = jwtverify.verify(bearerToken, config.secret);
        next();
    } else {
        res.status(401).send('Un-authorized user');
    }
}

apiRoutes.get('/test', function (req, res) {
    res.send("testing live server");
});

// create a new user account (POST http://localhost:8080/api/signup)
apiRoutes.post('/signup', function (req, res) {
    if (!req.body.data.name || !req.body.data.passwords.password) {
        res.json({ success: false, msg: 'Please enter name and password.' });
    } else {
        var newUser = new User({
            profilename: req.body.data.name,
            name: req.body.data.email,
            password: req.body.data.passwords.password
        });
        // save the user
        newUser.save(function (err) {
            if (err) {
                return res.json({ success: false, msg: 'Username already exists.' });
            }
            res.json({ success: true, msg: 'Successful created new user.' });
        });
    }
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function (req, res) {
    User.findOne({
        name: req.body.name
    }, function (err, user) {
        if (err) throw err;

        if (!user) {
            res.send({ success: false, msg: 'Authentication failed. User not found.', error: user });
        } else {
            // check if password matches
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (isMatch && !err) {
                    // if user is found and password is right create a token
                    var token = jwt.encode(user._id, config.secret);
                    var name = user.name;
                    // return the information including token as JSON
                    res.send({ success: true, token: token, profilename: user.profilename });
                    //     res.json({Name:user.name})
                } else {
                    res.send({ success: false, msg: 'Authentication failed. Wrong password.' });
                }
            });
        }
    });
});

// route to a restricted info (GET http://localhost:8080/api/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false }), function (req, res) {
    var token = getToken(req.headers);
    if (token) {
        var decoded = jwt.decode(token, config.secret);
        User.findOne({
            name: decoded.name
        }, function (err, user) {
            if (err) throw err;

            if (!user) {
                return res.status(403).send({ success: false, msg: 'Authentication failed. User not found.' });
            } else {
                res.json({ success: true, msg: 'Welcome in the member area ' + user + '!' });
            }
        });
    } else {
        return res.status(403).send({ success: false, msg: 'No token provided.' });
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

// apiRoutes.post('/upload', function (req, res) {
//   var form = new formidable.IncomingForm();
//   var imagedata;
//   form.uploadDir = __dirname + '/uploads';
//   form.keepExtensions = true;
//   form.hash = true;
//     // form.on('file', function(field, file) {
//     //     //rename the incoming file to the file's name
//     //     fs.rename(file.path, form.uploadDir + "/" + file.name);
//     // });
//     // form.on('fileBegin', function(name, file) {
//     //     console.log(file);
//     // });
//     form.on('fileBegin', function(field, file) {
//         //rename the incoming file to the file's name
//         file.path = form.uploadDir + "/" + file.name;
//     });
//   form.parse(req, function (err, fields, files) {
//       if (!err) {
//           console.log('Files Uploaded');
//           grid.mongo = mongoose.mongo;
//           var gfs = grid(db.db);
//           if (files['image']) {
//               imagedata = files['image'];
//             //  console.log(files);
//               var writestream = gfs.createWriteStream({
//                   filename: imagedata['name']
//               });
//
//              // fs.rename(file.path, form.uploadDir + "/" + file.name);
//               fs.createReadStream(imagedata['path']).pipe(writestream);
//               writestream.on('close', function (file) {
//                   //  callback(null, file);
//                   var pid = (file._id.toString());
//               //    console.log(file);
//                   res.send(pid);
//               });
//           }
//       }
//   });
//
// });

apiRoutes.post('/upload', function (req, res) {
    var form = new formidable.IncomingForm();
    var imagedata;
    form.uploadDir = __dirname + '/uploads';
    form.keepExtensions = true;
    form.parse(req, function (err, fields, files) {
        if (!err) {
            console.log('Files Uploaded');
            grid.mongo = mongoose.mongo;
            var gfs = grid(db.db);
            if (files['image']) {
                imagedata = files['image'];
                var writestream = gfs.createWriteStream({
                    filename: imagedata['name']
                });
                var filename = imagedata['path'].substr(44);
                //  imagedata['path'] =  __dirname+ "/uploads/" + filename;
                //  console.log(imagedata['path']);
                var result = fs.createReadStream(imagedata['path']).pipe(writestream);

                writestream.on('close', function (file) {
                    //   var pid = (file._id.toString());
                    //   console.log(pid);
                    res.send(filename);
                });
            }
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

function getFileById(req, res, next) {
    grid.mongo = mongoose.mongo;
    var gfs = grid(db.db);
    //  var readstream = gfs.createReadStream({
    //    ID: req
    //  });
    //
    //
    // readstream.pipe(res);
    if (req) {
        // var mime = 'image/jpeg';
        // res.set('Content-Type', mime);
        var read_stream = gfs.createReadStream({ ID: req });
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
    db.collection('cities').find({ s_id: req.params.id }).toArray().then(function (doc) {
        res.send(doc);
    }, function (error) {
        console.log(error)
    })

});

apiRoutes.post('/profiledata', ensureAuthorized, function (req, res) {

    var newpassword = function (oldpassword) {
        return new Promise(function (resolve, reject) {
            if (oldpassword) {
                User.findOne({ _id: req.userid }, function (err, user) {
                    if (err) {
                        console.log('user not found');
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
            profileData['extraaddon'] = { 'newarrival': req.body.newarrival, 'upcomingsale': req.body.upcomingsale };
        }
        if (req.body.selectedState) {
            profileData['state_id'] = req.body.selectedState;
        }
        if (req.body.selectedCity) {
            profileData['city_id'] = req.body.selectedCity;
        }
        var condition = { _id: req.userid };
        User.findOneAndUpdate(condition, profileData, { upsert: false, new: true }, function (err, doc) {
            if (err) {
                return res.send({ success: false, msg: 'Unable To save.' });
            }
            res.send({ success: true, msg: 'Successful Updated.' });
        });
    }
});

apiRoutes.get('/userBasicDetails', ensureAuthorized, function (req, res) {
    // var user_id = new ObjectId(req.userid);
    // var userdata = {};
    // db.collection('users').findOne({_id: user_id}, function (err, result) {
    //   if (!err) {
    //     setuserObjects(result)
    //       .then(function (success) {
    //         imageFound(result.imageId)
    //           .then(function (success) {
    //             return res.json({userData: userdata});
    //           }, function (err) {
    //             return res.json({userData: userdata});   //without image
    //           })
    //          // getplace(result.placeId)
    //          //   .then(function (success) {
    //          //     return res.json({userData: userdata});
    //          //   })
    //       })
    //   } else {
    //     return console.log(err);
    //   }
    userbasicData(req.userid)
        .then(function (success) {
            return res.json(success);
        }, function (err) {
            return res.json(err);   //without image
        })
});




var imageFound = function (imageid) {
    return new Promise(function (resolve, reject) {
        if (imageid) {
            grid.mongo = mongoose.mongo;
            var gfs = grid(db.db);
            try {
                var data = [];
                var readstream = gfs.createReadStream({ _id: imageid });
                readstream.on('data', function (chunk) {
                    data.push(chunk);
                });

                readstream.on('end', function () {
                    data = Buffer.concat(data);
                    var img = 'data:image/jpeg;base64,' + Buffer(data).toString('base64');
                    //  userdata['image'] = img;
                    resolve(img);
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
    let userdata = {};
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

let userbasicData = function (userid) {
    var user_id = new ObjectId(userid);
    let userdata = {};
    return new Promise(function (resolve, reject) {
        db.collection('users').find({ _id: user_id }).limit(1).next(function (err, result) {
            if (result) {
                setuserObjects(result)
                    .then(function (success) {
                        // console.log(success);
                        resolve(success);
                        //  imageFound(result.imageId)
                        //      .then(function (success) {
                        //          return {userData: success};
                        //      }, function (err) {
                        //          return {userData: err};   //without image
                        //      })
                        // getplace(result.placeId)
                        //   .then(function (success) {
                        //     return res.json({userData: userdata});
                        //   })
                    })
            } else {
                return null;
            }
        })

    })
};

apiRoutes.get('/productDropdownData', function (req, res) {
    var data = {};

    async.parallel({
        category: function (callback) {
            db.collection('category').find({}).toArray().then(function (cat) {
                data['category'] = cat.map(item => ({
                    text: item.name,
                    id: item._id
                }));
                callback(null, data['category']);
            }, function (error) {
                console.log(error)
            });
        },
        brand: function (callback) {
            db.collection('brands').find({}).toArray().then(function (brnd) {
                data['brand'] = brnd.map(item => ({
                    text: item.name,
                    id: item._id
                })
                );
                callback(null, data['brand']);
                //    res.send(data);
            }, function (error) {
                console.log(error)
            })
        }
    }, function (err, results) {
        res.send(results);
    });
});

apiRoutes.post('/newproduct', function (req, res) {
    var arrivaldate;
    if (req.body.data.arrivaldate) {
        arrivaldate = new Date(req.body.data.arrivaldate);
    } else {
        arrivaldate = new Date();
    }

    var newProduct = new Productupload({
        title: req.body.data.title,
        brand: req.body.data.brand,
        category: req.body.data.category,
        modalno: req.body.data.modalno,
        price: req.body.data.price,
        arrivaldate: arrivaldate,
        productimages: req.body.data.productimages,
        image: req.body.data.image,
        shortdescription: req.body.data.shortdescription,
        fulldescription: req.body.data.fulldescription
    });

    newProduct.save(function (err) {
        if (err) {
            res.status(404).send({ success: false, msg: err });
        } else {
            res.status(200).send({ success: true, msg: 'Successful inserted.' });
        }
    });
});

apiRoutes.get('/dashboardProductlist', function (req, res) {

    db.collection('productuploads').find({}).toArray().then(function (data) {
        productExtraction(data).then(function (result) {
            return res.json(result);
        }, function (err) {
            return res.json('Unable to fetch data');
        });
    }, function (error) {
        res.json('Unable to fetch data');
    });
});

function productExtraction(data) {

    let dashboardProduct = {};
    let motherboardArray = [], proceessorArray = [], graphicArray = [], monitorArray = [], routerArray = [];
    return new Promise((resolve, reject) => {
        var productData = asyncawait(function () {
            data.forEach(function (value) {
                var product = {};
                if (value['category'] === 'Motherboard') {
                    product['data'] = value;
                    product['image'] = value['image'];
                    motherboardArray.push(product);
                }
                if (value['category'] === 'Processor') {
                    product['data'] = value;
                    product['image'] = value['image'];
                    proceessorArray.push(product);
                }
                if (value['category'] === 'Graphic Card') {
                    product['data'] = value;
                    product['image'] = value['image'];
                    graphicArray.push(product);
                }
                if (value['category'] === 'Monitor') {
                    product['data'] = value;
                    product['image'] = value['image'];
                    monitorArray.push(product);
                }
                if (value['category'] === 'Router') {
                    product['data'] = value;
                    product['image'] = value['image'];
                    routerArray.push(product);
                }
            });
            if (motherboardArray.length !== 0) {
                dashboardProduct['motherboard'] = motherboardArray
            }
            if (proceessorArray.length !== 0) {
                dashboardProduct['processor'] = proceessorArray
            }
            if (graphicArray.length !== 0) {
                dashboardProduct['graphiccard'] = graphicArray
            }
            if (monitorArray.length !== 0) {
                dashboardProduct['monitor'] = monitorArray
            }
            if (routerArray.length !== 0) {
                dashboardProduct['router'] = routerArray
            }
            resolve(dashboardProduct);
            //    console.log(dashboardProduct);
        });
        productData();
    });
} //<--function end

function getImage(imageid) {
    return new Promise(function (resolve, reject) {
        if (imageid) {
            grid.mongo = mongoose.mongo;
            var gfs = grid(db.db);
            try {
                var data = [];
                var readstream = gfs.createReadStream({ _id: imageid });
                readstream.on('data', function (chunk) {
                    data.push(chunk);
                });

                readstream.on('end', function () {
                    data = Buffer.concat(data);
                    var img = 'data:image/jpeg;base64,' + Buffer(data).toString('base64');
                    // var filepath = base64Img.imgSync(img, '', '2');
                    // console.log(filepath);
                    //   userdata['image'] = img;
                    resolve(img);
                    // res.end(img);
                });

                readstream.on('error', function (err) {
                    console.log('An error occurred!', err);
                    //  throw err;
                    resolve(null);
                });
            }
            catch (err) {
                console.log(err);
                return next(errors.create(404, "File not found."));
            }
        } else {
            //  reject('No Image');
        }
    })
    // return new Promise(function (resolve, reject) {
    //     let image_id = new ObjectId(imageid);
    //     grid.mongo = mongoose.mongo;
    //     var gfs = grid(db.db);
    //     gfs.files.findOne({_id: image_id} , function (err, files) {
    //
    //         console.log(files['filename']);
    //     })
    //    // resolve (img);
    // })
}

apiRoutes.get('/productDescriptionData', function (req, res) {

    let productSearch = {};
    if (req.query.pid) {
        productSearch._id = new ObjectId(req.query.pid);
    }
    db.collection('productuploads').find(productSearch).toArray().then(function (data) {
        if (data.length > 0) {
            productImageExtraction(data).then(function (result) {
                return res.json(result);
            }, function (err) {
                return res.json('Unable to fetch data');
            });
        } else {
            res.json('Unable to fetch data');
        }

        //  return res.send(product);
    }, function (error) {
        res.json('Unable to fetch data');
    });
});

function productImageExtraction(data) {
    let product = {};
    let imgarray = [];
    let productimages = [];
    return new Promise((resolve, reject) => {
        var productData = asyncawait(function () {
            product['image'] = data[0]['image'];
            product['data'] = data[0];
            imgarray = data[0]['productimages'];
            imgarray.forEach(function (value) {
                var productimg;
                productimg = value;
                productimages.push(productimg);
            }
            );
            product['imagearray'] = productimages;
            resolve(product);
        });
        productData();
    })
}

apiRoutes.get('/productList', function (req, res) {
    let productSearch = {};
    if (req.query.ptype) {
        productSearch.category = req.query.ptype;
    }
    if (req.query.selectedChoices) {
        productSearch.brand = { $in: req.query.selectedChoices.split(',') };
    }

    db.collection('productuploads').find(productSearch).toArray().then(function (data) {
        productExtraction(data).then(function (result) {
            return res.json(result);
        }, function (err) {
            return res.json('Unable to fetch data');
        });
    }, function (error) {
        res.json('Unable to fetch data');
    });
});

apiRoutes.post('/placeOrder', ensureAuthorized, function (req, res) {
    let customerId = new ObjectId(req.userid);
    var arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 10);

    //    var rev = reverseString(str);
    //  console.log(shortid.generate());

    let newOrder = new OrderRequest({
        customerId: customerId,
        orderData: req.body.data.orderData,
        orderId: shortid.generate(),
        totalamount: req.body.data.totalamount,
        arrivaldate: arrivalDate
    });

    newOrder.save(function (err) {
        if (err) {
            res.status(404).send({ success: false, msg: err });
        } else {
            res.status(200).send({ success: true, msg: 'Order placed successfully.' });
        }
    });
});

function reverseString(str) {
    var newString = "";
    for (var i = str.length - 1; i >= 0; i--) {
        newString += str[i];
    }
    return newString;
}

apiRoutes.get('/searchItem', function (req, res) {
    let searchKey, selectedCategories, quartParams;
    if (req.query.searchKey) {
        searchKey = req.query.searchKey;
        quartParams = {
            $or: [{ "title": { '$regex': '.*' + searchKey + '.*', '$options': 'im' } },
            { "brand": { '$regex': searchKey, '$options': 'i' } }]
        }
    }

    if (req.query.categories && req.query.categories !== 'undefined') {
        selectedCategories = { $in: req.query.categories.split(',') };
        quartParams = {
            $or: [{ "title": { '$regex': '.*' + searchKey + '.*', '$options': 'im' } },
            { "brand": { '$regex': searchKey, '$options': 'i' } }],
            $and: [{ "category": selectedCategories }]
        }
    }

    db.collection('productuploads').find({
        $and: [
            quartParams
        ]
    }).toArray().then(function (data) {
        if (data.length !== 0) {
            return res.status(200).send(data);
        } else {
            return res.status(404).send("No item found with this keywords");
        }
    }, function (error) {
        res.json('Unable to fetch data');
    });
});

apiRoutes.post('/productReview', ensureAuthorized, function (req, res) {

    let customerId = new ObjectId(req.userid);
    let customerReview = new CustomerReview({
        customerId: customerId,
        starRate: req.body.starRate,
        productId: req.body.productId,
        comment: req.body.userReview
    });

    customerReview.save(function (err) {
        if (err) {
            res.status(404).send({ success: false, msg: err });
        } else {
            res.status(200).send({ success: true, msg: 'Customer review posted successfully.' });
        }
    });
});

apiRoutes.get('/productReview', function (req, res) {
    let productSearch = {};
    if (req.query.productId) {
        productSearch.productId = req.query.productId;
    }
    let review;
    let customerData;
    let customerReview = [];
    db.collection('customerreviews').find(productSearch).toArray().then(function (data) {
       if(data.length > 0){
        var productData = asyncawait(function () {
            data.map(obj => {
                userbasicData(obj['customerId'])
                    .then(function (userData) {
                        obj['name'] = userData['firstname'] + ' ' + userData['lastname'];
                        delete obj['__v'];
                        customerReview.push(obj);
                        if (customerReview.length === data.length) {
                            res.status(200).json(customerReview);
                        }
                    }, function (error) {
                        // res.status(404).json('Unable to fetch data');
                    });
            })
        })
        productData();
       }
    }, function (error) {
        res.status(404).json('Unable to fetch data');
    });

});