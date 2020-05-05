const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const dotenv = require('dotenv').config();
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');
const async = require('async');
const moment = require('moment');
const { body, validationResult, sanitizeBody } = require('express-validator');

const dev_db_url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-gevd4.azure.mongodb.net/craigslist?retryWrites=true&w=majority`
const mongoDb = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDb, {useUnifiedTopology: true, useNewUrlParser: true});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

// MONGO SCHEMA // 
const User = mongoose.model(
    'User',
    {
        first_name: {type: String, required: true, min: 1},
        last_name: {type: String, required: true, min: 1},
        username: {type: String, required: true, unique: true},
        password: {type: String, required: true},
        isAdmin: {type: Boolean},
        email: {type: String, required: true},
        phone_num: {type: String, required: true}
    }
)

const Post = mongoose.model(
    'Post',
    {
        title: {type: String, required: true, min: 1},
        description: {type: String, required: true, min: 1},
        username: {type: Schema.Types.ObjectId, ref: 'User'},
        image: {type: String, required: true},
        price: {type: String, required: true, min: 1},
        category: {type: Schema.Types.ObjectId, ref: 'Category'},
        date: {type: Date, default: Date.now},
    }
)

const Category = mongoose.model(
    'Category',
    {
        category: {type: String, required: true, min: 1},
        description: {type: String, required: true, min: 1},
        image: {type: String, required: true, min: 1}
    }
)


const app = express();
app.set('views', __dirname);
app.set('view engine', 'ejs');

passport.use(
    new LocalStrategy((username, password, done) => {
        User.findOne({username: username}, (err, user) => {
            if(err) {
                return done(err);
            }
            if(!user) {
                return done(null, false, {msg: 'Incorrect username'});
            }
            bcrypt.compare(password, user.password, (err, res) => {
                if(res) {
                    return done(null, user);
                } else {
                    return done(null, false, {msg: 'Incorrect Password'});
                }
            })
        })
    })
)

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

app.use(session({ secret: "cats", resave: false, saveUninitialized: true, cookie: {maxAge: 3600000} }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '/public')));

// homepage
app.get('/', (req, res, next) => {
    async.parallel({
        posts: function(callback) {
            Post.find({})
                .populate('username')
                .exec(callback)
        }
    },
    function(err, results) {
        res.render('./views/index.ejs', {user: req.user, posts: results.posts})
    })
})

// login page
app.get('/login', (req, res) => {
    res.render('./views/login');
})

// login post
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}))

// logout post
app.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
})

// login signup 
app.get('/signup', (req, res) => {
    res.render('./views/signup', { error: req.session.error });
})

// signup post
app.post('/signup', (req, res, next) => {
    // validate fields 
    bcrypt.hash(req.body.password, 10, (err, hashed) => {
        if(err) {return next(err)}
        else {
            const user = new User(
                {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    username: req.body.username,
                    password: hashed,
                    email: req.body.email,
                    phone_num: req.body.phone_num
                }
            )
            User.findOne({username: req.body.username}, (err, example) => {
                if(err) console.log(err);
                if(example) {
                    req.session.error = 'Username has been taken';
                    res.redirect('/signup');
                } else {
                    user.save((err) => {
                        if(err) {
                            return next(err)
                        } else {
                            res.redirect('/')
                        }
                    })
                }
            });
        }
    })
})

// create post // 
app.get('/createpost', (req, res, next) => {
    Category.find({}, (err, categories) => {
        if(err) {
            return next(err);
        } else {
            res.render('./views/create_post_form.ejs', {categories: categories});
        }
    })
})

app.post('/createpost', (req, res, next) => {
    const post = new Post(
        {
            title: req.body.title,
            description: req.body.description,
            image: req.body.image,
            category: req.body.category,
            price: req.body.price,
            username: req.user
        }
    )

    post.save((err) => {
        if(err) {
            return next(err);
        } else {
            res.redirect('/post/' + post._id);
        }
    })
    }
)
app.get('/createcategory', (req, res) => {
    res.render('./views/create_category_form.ejs');
})

app.post('/createcategory', (req, res, next) => {
    const category = new Category(
        {
            category: req.body.title,
            description: req.body.description,
            image: req.body.image
        }
    )
    Category.findOne({category: req.body.title}, (err, duplicate) => {
        if(err) {
            return next(err);
        }
        if(duplicate) {
            req.session.err = 'Category has already been created';
            res.redirect('/createcategory');
        } else {
            category.save((err) => {
                if(err) {
                    return next(err);
                } else {
                    res.redirect('/');
                }
            })
        }
    })
})

app.get('/adminaccess', (req, res) => {
    res.render('./views/adminaccess', {user: req.user});
})

app.post('/adminaccess', (req, res, next) => {
    let userId = req.session.passport.user;
    if(req.body.adminPass === 'cgAdmin123') {
        bcrypt.hash(req.body.password, 10, (err, hashed) => {
            if(err) {
                return next(err);
            } else {
                const user = new User(
                    {
                        first_name: req.body.first_name,
                        last_name: req.body.last_name,
                        username: req.body.username,
                        password: hashed,
                        _id: userId,
                        isAdmin: true
                    }
                )
                User.findByIdAndUpdate(userId, user, {}, function(err) {
                    if(err) {
                        return next(err)
                    } else {
                        res.redirect('/');
                    }
                })
            }
        })
    } else {
        res.redirect('/adminaccess');
    }
})

// post detail
app.get('/post/:id', (req, res, next) => {
    async.parallel({
        post: function(callback) {
            Post.findById(req.params.id)
                .populate('username')
                .populate('category')
                .exec(callback)
        }
    }, function(err, results) {
        if(err) {
            return next(err)
        } else {
            res.render('./views/post_detail', {user: req.user, post: results.post})
        }
    })
})

// update post
app.get('/update/:id', (req, res) => {
    // get category and post info based on id
    async.parallel(
        {
            post: function(callback) {
                Post.findById(req.params.id)
                    .populate('category')
                    .populate('username')
                    .exec(callback)
            },
            category: function(callback) {
                Category.find({})
                    .exec(callback)
            }
        }, function(err, results) {
            //res.send(results);
            res.render('./views/update_post_form.ejs', {post: results.post, categories: results.category})
        }
    )
})

app.post('/update/:id', (req, res, next) => {
    const post = new Post(
        {
            title: req.body.title,
            description: req.body.description,
            image: req.body.image,
            category: req.body.category,
            price: req.body.price,
            username: req.user,
            _id: req.params.id
        }
    )

    Post.findByIdAndUpdate(req.params.id, post, {}, function(err) {
        if(err) {
            return next(err);
        } else {
            res.redirect('/post/' + req.params.id);
        }
    })
})

// categories page
app.get('/categories', (req, res, next) => {
    async.parallel({
        categories: function(callback) {
            Category.find({})
                .exec(callback);
        }
    }, function(err, results) {
        if(err) {
            return next(err);
        } else {
            res.render('./views/categories', {user: req.user, categories: results.categories});
        }
    }
    )
})

app.get('/categories/:id', (req, res, next) => {
    async.parallel(
        {
            post: function(callback) {
                Post.find({'category': req.params.id})
                    .populate('category')
                    .populate('username')
                    .exec(callback)
            }
        }, function(err, results) {
            if(err) {
                return next(err);
            } else {
                res.render('./views/category_detail', {user: req.user, post: results.post})
            }
        }
    )
})

app.get('/yourlistings/:id', (req, res, next) => {
    async.parallel({
        posts: function(callback) {
            Post.find({'username': req.params.id})
            .populate('category')
            .populate('username')
            .exec(callback)
        }
    }, function(err, results) {
        if(err) {
            return next(err);
        } else {
            res.render('./views/yourlistings', {user: req.user, post: results.posts})
        }
    }
    )
})

app.listen(process.env.PORT || 3000, () => {
    console.log(`app is listening at port ${process.env.PORT}`);
})