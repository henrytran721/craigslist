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
        username: {type: String, required: true},
        password: {type: String, required: true} 
    }
)

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
})

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err,user) {
        done(err, user);
    })
})

const app = express();
app.set('views', __dirname);
app.set('view engine', 'ejs');

app.use(session({ secret: "cats", resave: false, saveUninitialized: true, cookie: {maxAge: 360000} }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
    res.render('./views/index', {user: req.user});
    console.log(req.user);
})

app.get('/login', (req, res) => {
    res.render('./views/login');
})

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}))

app.get('/signup', (req, res) => {
    res.render('./views/signup');
})

app.post('/signup', (req, res, next) => {
    bcrypt.hash(req.body.password, 10, (err, hashed) => {
        if(err) {return next(err)}
        else {
            const user = new User(
                {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    username: req.body.username,
                    password: hashed
                }
            ).save((err) => {
                if(err) {
                    return next(err)
                } else {
                    res.redirect('/')
                }
            })
        }
    })
})

app.listen(3030, () => {
    console.log(`app is listening at port 3000`);
})