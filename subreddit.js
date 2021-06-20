var express = require('express');
var router = express.Router();
var pg = require('./client');

router.post("/create", async (req, res) => {
    let rows = 0;
    let subredditID;
    await pg
        .query(
            `select name from subreddit where name = '${req.body.subname}'`
        ).then( async (resp) => {
            rows = resp.rows[0];
            if(resp.rows.length > 0){
                res.sendStatus(500);
                return;
            }
            else {
                await pg
                    .query(
                        `insert into subreddit (name, description) values ('${req.body.subname}', '${req.body.description}') returning id; `
                    ).then((resp) => {
                        console.log(resp.rows[0].id);
                        subredditID = resp.rows[0].id;
                    }).catch((err) => {
                        console.log(err);
                        res.sendStatus(500);
                    });
                await pg
                    .query(
                        `insert into subreddit_moderator (user_id, subreddit_id) values ('${req.user.id}', '${subredditID}'); `
                    ).then((resp) => {
                        console.log(resp);
                    }).catch((err) => {
                        console.log(err);
                    });

                await pg
                    .query(
                        `insert into subreddit_user (user_id, subreddit_id) values ('${req.user.id}', '${subredditID}'); `
                    ).then((resp) => {
                        console.log(resp);
                        res.sendStatus(200);
                    }).catch((err) => {
                        console.log(err);
                        res.sendStatus(500);
                    });
            }
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
});

router.post("/join", async (req, res) => {
    let subredditID;

    await pg
        .query(
            `select id from subreddit where name = '${req.body.subname}'`
        ).then((resp) => {
            subredditID = resp.rows[0].id;
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });

    await pg
        .query(
            `insert into subreddit_user (user_id, subreddit_id) values (${req.user.id}, ${subredditID}); `
        ).then((resp) => {
            console.log(resp);
            res.sendStatus(200);
        }).catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
});

router.post("/leave", async (req, res) => {
    let subredditID;

    await pg
        .query(
            `select id from subreddit where name = '${req.body.subname}'`
        ).then((resp) => {
            subredditID = resp.rows[0].id;
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });

    await pg
        .query(
            `delete from subreddit_user where user_id ='${req.user.id}' and subreddit_id = '${subredditID}';`
        ).then((resp) => {
            console.log(resp);
            res.sendStatus(200);
        }).catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
});

router.put(`/edit/:subname`, async (req, res) => {
    let id;
    await pg
        .query(
            `select id from subreddit where name = '${req.params.subname}'`
        ).then((resp) => {
        id = resp.rows[0].id;
    }).catch(() => {
        res.sendStatus(500);
    });
    await pg
        .query(
            `update subreddit set description = '${req.body.description}' where id = ${id};`
        ).then(()=> {
            res.sendStatus(200);
    }).catch(()=>{
        res.status(500);
    });
});
router.get(`/:subname`, async (req, res) => {
    await pg
        .query(
            `select * from subreddit where name = '${req.params.subname}'`
        ).then((resp) => {
            res.send(resp.rows[0]);
        }).catch(() => {
            res.sendStatus(500);
        });
});

module.exports = router;