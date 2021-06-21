var express = require('express');
var router = express.Router();
var pg = require('./client');


router.get("/", async (req, res) => {
    const index = 10;
    await pg
        .query(
            `select * from reddit_user OFFSET ${index} ROWS FETCH NEXT 10 ROWS ONLY`
        )
        .then((resp) => res.send(resp.rows))
        .catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
    res.sendStatus(500);
});

router.post("/changepassword/",  async(req, res) => {
    pg
        .query(
            `select * from reddit_user where id = ${req.user.id} and password='${req.body.currentpassword}';`
        ).then((resp)=> {
            if(resp.rows.length > 0) {
                pg
                    .query(
                        `update reddit_user set password='${req.body.newpassword}' where id = ${req.user.id} and password='${req.body.currentpassword}'`
                    ).then((resp) => {
                    console.log(resp.rows);
                    res.sendStatus(200);
                }).catch((err) => {
                    console.log(err);
                    res.sendStatus(403);
                });
            } else {
                res.sendStatus(403);
            }
        }).catch(() => {
            res.sendStatus(500);
    });
});

router.get("/subreddit/:name", async (req, res) => {
    await pg
    .query(
        `select * from subreddit_user left join subreddit on subreddit.id = subreddit_id where subreddit.name='${req.params.name}' and user_id = ${req.user.id};`
    )
    .then((resp) => res.send(resp))
    .catch((err) => {
        console.log(err);
        res.sendStatus(403);
    });
});
router.get("/subreddit/moderator/:name", async (req, res) => {
    await pg
        .query(
            `select * from subreddit_moderator inner join subreddit on subreddit.id = subreddit_moderator.subreddit_id where user_id=${req.user.id} and name = '${req.params.name}';`
        ).then((resp) => {
            res.send(resp);
        }).catch((err) => {
            console.log(err);
        });
});
module.exports = router;