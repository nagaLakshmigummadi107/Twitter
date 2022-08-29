const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertFollowerDbObjectToResponseObject = (dbObject) => {
  return {
    name: dbObject.name,
  };
};

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
}

const validatePassword = (password) => {
  return password.length > 5;
};

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await db.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username,password,name,gender)
     VALUES
      (
       '${username}',
       '${hashedPassword}',
       '${name}',
       '${gender}'         
      );`;
    if (validatePassword(password)) {
      await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//User login API 2

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;
  const getTweetsQuery = `
    SELECT
      username,tweet,date_time
    FROM
      user join tweet on user.user_id=tweet.user_id  LIMIT 4;`;
  const tweetsArray = await db.all(getTweetsQuery);
  response.send(tweetsArray);
});

//API 4
app.get("/user/following/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      distinct name
    FROM
      user join follower on user.user_id=follower.following_user_id;`;
  const followersArray = await db.all(getStatesQuery);
  response.send(
    followersArray.map((eachFollower) =>
      convertFollowerDbObjectToResponseObject(eachFollower)
    )
  );
});
//API 5

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      distinct name
    FROM
      user join follower on user.user_id=follower.follower_user_id;`;
  const followersArray = await db.all(getStatesQuery);
  response.send(
    followersArray.map((eachFollower) =>
      convertFollowerDbObjectToResponseObject(eachFollower)
    )
  );
});
//API 9

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { username } = request;
  const getTweetsQuery = `
    SELECT
      tweet,count(like_id) as likes,
      count(reply_id) as replies,
      date_time
    FROM
      user 
      join like on user.user_id=like.user_id
      join reply user.user_id=reply.user_id
      join tweet user.user_id=tweet.user_id
      where username='${username}';`;
  const tweetsArray = await db.all(getTweetsQuery);
  response.send(tweetsArray);
});

//API 10

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweets } = request.body;
  const postDistrictQuery = `
  INSERT INTO
    district (state_id, district_name, cases, cured, active, deaths)
  VALUES
    (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`;
  await database.run(postDistrictQuery);
  response.send("District Successfully Added");
});

//API11

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const { tweetId } = request.params;
    const tweet_id = `SELECT tweet_id from user join tweet where user.user_id=tweet.user_id and username='${username}';`;
    if (tweetId === tweet_id) {
      const deleteTweetQuery = `
  DELETE FROM
    tweet
  WHERE
    tweetId = ${tweet_id} 
  `;
      await database.run(deleteTweetQuery);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
