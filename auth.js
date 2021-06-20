const passport = require("passport");
var pg = require("./client");
var express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");
var uuid = require("uuid");

router.post("/login", (req, res) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (err) {
            return res.status(404).json({ message: err });
        }
        req.login(user, { session: false }, (err) => {
            if (err) res.send(err);
            const token = jwt.sign(user, "secret");
            return res.json({ user, token });
        });

    })(req, res);
});

router.post("/register", async (req, res) => {
    await pg
        .query(
            `select * from reddit_user where email= '${req.body.email}'`
        )
        .then((response) => {
            if (response.rows.length > 0){
                res.status(403).send("User with that email already exists")
            }
        }).catch((err) => {
            console.log(err)
            res.status(500).send("There was a problem registering the user.");
        });
    await pg
        .query(
            `select * from reddit_user where username= '${req.body.username}'`
        )
        .then((response) => {
            if (response.rows.length > 0){
                res.status(403).send("User with that username already exists")
            }
        }).catch((err) => {
            console.log(err)
            res.status(500).send("There was a problem registering the user.");
        });

    await pg.query(`insert into reddit_user (nickname,password, email, activation_guid, activation_expire_date) values('${req.body.username}', '${req.body.password}' , '${req.body.email}', '${uuid.v4()}', CURRENT_TIMESTAMP + '1 day')`)
        .then(() => {
        res.sendStatus(200);
    }).catch((err) => {
            console.log(err);
            res.sendStatus(500);
        })
});


module.exports = router;