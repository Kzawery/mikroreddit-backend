var passport = require("./passport");
var express = require('express');
var app = express();
var cors = require('cors');

var userRouter = require('./user')
var authRouter = require('./auth')
var postRouter = require('./post')
var commentRouter = require('./comment')
var subredditRouter = require('./subreddit')
var searchRouter = require('./search')


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(`/uploads`, express.static('./uploads'));
app.use("", express.static("C:/Users/Robert/Desktop/vue projects/projekt/mikroreddit/dist"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.set('socketio',io);

app.use('/auth', authRouter)
app.use('/search', passport.authenticate("jwt", { session: false }), searchRouter)
app.use('/users', passport.authenticate("jwt", { session: false }), userRouter)
app.use('/posts', passport.authenticate("jwt", { session: false }), postRouter)
app.use('/comments', passport.authenticate("jwt", { session: false }), commentRouter)
app.use('/subreddits', passport.authenticate("jwt", { session: false }), subredditRouter)




