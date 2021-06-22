const passport = require("passport");
var pg = require("./client");
var express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");

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
            if (response.rows.length > 0) {
                res.status(403).send("User with that email already exists");
            }
            else {
                pg
                    .query(
                        `select * from reddit_user where nickname= '${req.body.username}'`
                    )
                    .then((response) => {
                        if (response.rows.length > 0) {
                            res.status(403).send("User with that username already exists");
                        } else {
                            pg.query(
                                `insert into reddit_user (nickname,password, email) values('${req.body.username}', '${req.body.password}' , '${req.body.email}')`
                            )
                                .then(() => {
                                    res.sendStatus(200);
                                }).catch((err) => {
                                    console.log(err);
                                    res.sendStatus(500);
                                });
                        }
                    }).catch((err) => {
                        console.log(err);
                        res.status(500).send("There was a problem registering the user.");
                    });
            }
        }).catch((err) => {
            console.log(err);
            res.status(500).send("There was a problem registering the user.");
        });
});


module.exports = router;