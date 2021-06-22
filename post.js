var express = require('express');
var router = express.Router();
var pg = require('./client');
var storage = require('./multer')

router.get("/", async (req, res) => {
    const index = parseInt(req.query.page) * 10;
    let orderby = 'order by creation_date DESC';
    if(req.query.sort === 'best') {
        orderby = 'order by votes DESC';
    }

    let query = `select user_id as user_id, post.id as id, post.title as title, (select vote from post_vote where post_id = post.id and user_id = ${req.user.id}) as upvoted, post.content as content, nickname as nickname, post.video_url as videourl, post.image_path as imagepath, name as subname, cast(COALESCE(vote_count.votes, 0) as int) as votes from post left join reddit_user on user_id = reddit_user.id left join subreddit on subreddit_id = subreddit.id left join (select sum(vote) votes, post_id from post_vote group by post_id) as vote_count on vote_count.post_id = post.id  ${orderby} OFFSET ${index} ROWS FETCH NEXT 10 ROWS ONLY; `;
    if (req.query.subname !== undefined) {
        query = `select user_id as user_id, post.id as id, post.title as title, (select vote from post_vote where post_id = post.id and user_id = ${req.user.id}) as upvoted, post.content as content, nickname as nickname, post.video_url as videourl, post.image_path as imagepath, name as subname, cast(COALESCE(vote_count.votes, 0) as int) as votes from post left join reddit_user on user_id = reddit_user.id left join subreddit on subreddit_id = subreddit.id left join (select sum(vote) votes, post_id from post_vote group by post_id) as vote_count on vote_count.post_id = post.id where subreddit.name='${req.query.subname}' ${orderby} OFFSET ${index} ROWS FETCH NEXT 10 ROWS ONLY ; `;
    }

    await pg
        .query(
            query
        )
        .then((resp) =>{
            res.send(resp.rows);
            console.log(resp.rows);
        } )
        .catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
});

router.post("/", storage.single('file'), async (req, res) => {
    let subredditID;
    let id;
    await pg
        .query(
            `select id from subreddit where name = '${req.body.subreddit}'`
        ).then((resp) => {subredditID  = resp.rows[0].id;})
        .catch((err) => {
            console.log(err);
        });

    await pg
        .query(
            `insert into post (title, content, creation_date, subreddit_id, user_id, video_url) values ('${req.body.title}', '${req.body.content}', current_timestamp, ${subredditID}, ${req.user.id}, '${req.body.link}') returning id`
        ).then((resp) => {
            id = resp.rows[0].id;
            res.sendStatus(200);
        }).catch((err) => {
            console.log(err);
        });

    if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        await pg.query(
            `update post set image_path = '${fileUrl}' where id = ${id}`
        );
    }
    await pg.query(
        `insert into post_vote (vote,user_id,post_id) values(1,${req.user.id}, ${id});`
    )
    await pg.query(
        `select post.id as id, post.title as title, (select vote from post_vote where post_id = post.id and user_id = ${req.user.id}) as upvoted, post.content as content, nickname as nickname, post.video_url as videourl, post.image_path as imagepath, name as subname, cast(COALESCE(vote_count.votes, 0) as int) as votes from post left join reddit_user on user_id = reddit_user.id left join subreddit on subreddit_id = subreddit.id left join (select sum(vote) votes, post_id from post_vote group by post_id) as vote_count on vote_count.post_id = post.id where post_id = ${id}; `
    ).then((resp) => {
        const io = req.app.get("socketio");
        io.emit(`post/add`, resp.rows[0]);
    })

});

router.get("/:id", async (req, res) => {
    let postId = parseInt(req.params.id);
    await pg
        .query(
            `select user_id as user_id, post.id as id, post.title as title, (select vote from post_vote where post_id = ${postId} and user_id = ${req.user.id}) as upvoted, post.content as content, nickname as nickname, post.video_url as videourl, post.image_path as imagepath, name as subname, cast(COALESCE(vote_count.votes, 0) as int) as votes from post left join reddit_user on user_id = reddit_user.id left join subreddit on subreddit_id = subreddit.id left join (select sum(vote) votes, post_id from post_vote group by post_id) as vote_count on vote_count.post_id = post.id where post_id = ${postId};`
        )
        .then((resp) =>{
            if (resp.rows.length === 0) {
                pg.query(
                    `select post.id as id, post.title as title, 0 as upvoted, post.content as content, nickname as nickname, post.video_url as videourl, post.image_path as imagepath, name as subname, 0 as votes from post left join reddit_user on reddit_user.id = user_id left join subreddit on subreddit_id = subreddit.id where post.id = ${postId};`
                ).then((resp)=>{
                    res.send(resp.rows);
                }).catch((err) =>{
                    console.log(err);
                    res.sendStatus(500);
                })
            } else {
                res.send(resp.rows);
                console.log(resp.rows);
            }
        }).catch(() => {})

})

router.post("/upvote/:id",  async(req, res) => {
    let rows;
    await pg
        .query(
            `select vote from post_vote where post_id = ${req.params.id} and user_id = ${req.user.id}`
        ).then((resp) => {
            rows = resp.rows[0];
        }).catch((err) => {
            console.log(err);
        });
    if(rows === undefined) {
        // Create record
        await pg
            .query(
                `insert into post_vote (vote, user_id, post_id) values (1, ${req.user.id}, ${req.params.id})`
            ).then((resp) => {
                console.log(resp);
            }).catch((err) => {
                console.log(err);
            });
    } else {
        if(rows['vote'] === 1) {
            // Delete record
            await pg
                .query(
                    `delete from post_vote where user_id = ${req.user.id} and post_id = ${req.params.id};`
                ).then((resp) => {
                    console.log(resp)}).catch((err) => {
                    console.log(err)});
        } else {
            // Update record
            await pg
                .query(
                    `update post_vote set vote=1 where post_id = ${req.params.id} and user_id = ${req.user.id}`
                ).then(() => {
                    res.sendStatus(200);
                }).catch(() => {
                    res.sendStatus(500);
                });
        }
    }
});

router.post("/downvote/:id",  async(req, res) => {
    let rows;
    await pg
        .query(
            `select vote from post_vote where post_id = ${req.params.id} and user_id = ${req.user.id}`
        ).then((resp) => {
            rows = resp.rows[0];
        }).catch((err) => {
            console.log(err);
        });
    if(rows === undefined) {
        // Create record
        await pg
            .query(
                `insert into post_vote (vote, user_id, post_id) values (-1, ${req.user.id}, ${req.params.id})`
            ).then((resp) => {
                console.log(resp);
            }).catch((err) => {
                console.log(err);
            });
    } else {
        if(rows['vote'] === -1) {
            // Delete record
            await pg
                .query(
                    `delete from post_vote where user_id = ${req.user.id} and post_id = ${req.params.id};`
                ).then((resp) => {
                    console.log(resp)}).catch((err) => {
                    console.log(err)});
        } else {
            // Update record
            await pg
                .query(
                    `update post_vote set vote=-1 where post_id = ${req.params.id} and user_id = ${req.user.id}`
                ).then(() => {
                    res.sendStatus(200);
                }).catch(() => {
                    res.sendStatus(500);
                });
        }
    }
});


router.post("/delete", async (req, res) => {
    let subredditId;
    await pg
        .query(
            `select id from subreddit where name = '${req.body.subname}'`
        ).then((resp) => {
            subredditId = resp.rows[0].id;
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(503);
        });

    await pg
        .query(
            `select * from subreddit_moderator where user_id = ${req.user.id} and subreddit_id = ${subredditId}`
        ).then(() => {
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(503);
        });

    await pg
        .query(
            `delete from post_vote where post_id = ${req.body.id};`
        ).then((resp) => {
            console.log(resp);
        }).catch((err) => {
            console.log(err);
        });
    await pg
        .query(
            `delete from comment where post_id = ${req.body.id};`
        ).then((resp) => {
            console.log(resp);
        }).catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });

   await pg
        .query(
            `delete from post where id = ${req.body.id};`
        ).then((resp) => {
            console.log(resp);
            const io = req.app.get("socketio");
            io.emit(`post/del`, `${req.body.id}`);
            res.sendStatus(200);
        }).catch((err) => {
            console.log(err);
            res.sendStatus(500);
        });
});


module.exports = router;