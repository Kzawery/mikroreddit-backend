const passport = require("passport"),
  LocalStrategy = require("passport-local").Strategy;
var pg = require("./client.js");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

passport.initialize();
passport.use(
  new LocalStrategy({}, async function (username, password, done) {
    const re = await pg.query(
      `select reddit_user.id, reddit_user.nickname, reddit_user.activation_guid, reddit_user.password, reddit_user.email, role.role_name as role from reddit_user ` +
        `left join user_role on reddit_user.id = user_role.user_id left join role on user_role.role_id = role.id ` +
        `where nickname = '${username}'`
    );

    if (re.rows.length === 0) {
      return done(null, false, { message: "Incorrect username." });
    }
    const user = re.rows[0];
    if (user.password !== password) {
      return done(null, false, { message: "Incorrect password." });
    }

    delete user.activation_guid;
    return done(null, user);
  })
);
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: "secret",
    },
    async (jwtPayload, cb) => {
      const res = await pg.query(
        `select reddit_user.id, reddit_user.nickname, reddit_user.password, reddit_user.email, role.role_name as role from reddit_user ` +
          `left join user_role on reddit_user.id = user_role.user_id left join role on user_role.role_id = role.id ` +
          `where nickname = '${jwtPayload.nickname}'`
      );
      if (
        res.rows.length === 0 ||
        res.rows[0].password !== jwtPayload.password
      ) {
        return cb("Invalid username or password");
      }
      return cb(null, res.rows[0]);
    }
  )
);
module.exports = passport;
