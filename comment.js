
var express = require('express');
var router = express.Router();
var pg = require('./client');


router.get("/:id", async (req, res) => {
    await pg
        .query(
            `select comment.id as id, content as content, user_id as user_id, post_id as post_id, nickname as user from comment left join reddit_user on reddit_user.id = user_id where post_id= ${req.params.id};`
        )
        .then((resp) =>{
            res.send(resp.rows).sendStatus(200);
            console.log(resp.rows);
        } )
        .catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
});

router.post(`/add`, async (req, res) => {
    await pg
        .query(
            `insert into comment (content, user_id, post_id) values ('${req.body.content}', ${req.user.id}, ${req.body.postId}) returning *;`
        ).then((resp) => {
            const io = req.app.get("socketio");
            resp.rows[0].user = req.user.nickname;
            io.emit(`comment/add`, resp.rows[0]);
            res.sendStatus(200);
        }).catch((err) => {
            console.log(err);
        });
});

router.delete("/:id", async (req, res) => {
    await pg
        .query(
            `delete from comment where id = ${req.params.id} returning id;`
        )
        .then((resp) =>{
            res.send(resp.rows);
            const io = req.app.get("socketio");
            io.emit(`comment/del`, `${req.params.id}`);
            res.sendStatus(200);
        } )
        .catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
});

module.exports = router;