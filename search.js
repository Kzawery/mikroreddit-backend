var express = require('express');
var router = express.Router();
var pg = require('./client');


router.get(`/`, async (req, res) => {
    let result = {};

    await pg
        .query(
            `select * from subreddit where position('${req.query.query}' in LOWER(name))>0 limit 10;`
        ).then((resp) => {
              result.subreddits = resp.rows;
        }).catch((err) => {
            console.log(err)});
    await pg
        .query(
            `select post.id as id, post.title as title, (select vote from post_vote where post_id = post.id and user_id = ${req.user.id}) as upvoted, post.content as content, nickname as nickname, post.video_url as videourl, post.image_path as imagepath, name as subname, cast(COALESCE(vote_count.votes, 0) as int) as votes from post left join reddit_user on user_id = reddit_user.id left join subreddit on subreddit_id = subreddit.id left join (select sum(vote) votes, post_id from post_vote group by post_id) as vote_count on vote_count.post_id = post.id where position('${req.query.query}' in LOWER(content))>0 limit 10;`
        ).then((resp) => {
            result.posts = resp.rows;
            res.send(result);
        }).catch((err) => {
            console.log(err)});
});

module.exports = router;