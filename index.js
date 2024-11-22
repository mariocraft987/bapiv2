//Bark API
//Written by dumorando.
require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const ratelimit = require("express-rate-limit");
const Database = require("easy-json-database");
const cors = require("cors");
const bodyParser = require("body-parser");
const _ = require("lodash");
const requestIp = require("request-ip");
const DefaultProfilepic = require("./dataurls");
const fs = require("fs");
const Cryptr = require('cryptr');
const { Webhook } = require('discord-webhook-node');

const app = express();
const cryptr = new Cryptr(process.env.cryptrkey);

function log(text) {
  const hook = new Webhook(process.env.adminlog);
  hook.success('**Admin log**', 'Admin', text);
}

//disable cors for all routes.
app.use(cors());

//get ips for ip banning.
app.use(requestIp.mw());

//body parser for some routes like put routes.
app.use(bodyParser.json({ limit: "20mb" }));

//rate limit for project uploading.
const projectratelimit = ratelimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const Databases = {
  Accounts: "accounts.json",
  Projects: "projects.json",
  Notifications: "notifications.json",
  Comments: "comments.json",
  Usercomments: "usercomments.json",
  Admins: "admins.json",
  Banned: "banned.json"
};

//request queue. makes the server slower (by slower i mean SLOWer), but makes data reverting less common, and keeps the server safe from timing attacks. (deprecated to use mutex)
//app.use(queue({activeLimit: 1, queuedLimit: -1}))

//middleware to login with a token.
async function TokenauthMiddleware(req, res, next) {
  //banning is a feature i only added after i added like 20 routes, so we implement this in the tokenauthmiddleware function.
  //if (res.database.banned.includes(res.user.username)) return res.status(403).json({"error":"AccountBanned"});
  if (!req.query.token)
    return res.status(400).json({ error: "InvalidRequest" });
  const db = new Database(Databases.Accounts);
  res.user = db.all().find((item) => item.data.token === req.query.token);
  if (!res.user) {
    res.status(401).json({ error: "Reauthenticate" });
  } else {
    res.user = res.user.data;
    next();
  }
}

//utility function to generate profile json.
async function Generateprofilejson(user) {
  const result = {};
  console.log(user)
  result.username = user.username;
  result.bio = user.bio ?? "No bio yet";
  if (user.profilepicture === "default")
    result.profilepicture = DefaultProfilepic;
  else
    try {
      result.profilepicture = fs.readFileSync(
        `pfp/${user.username}.barkpfp`,
        "utf-8"
      );
    } catch {
      result.profilepicture = DefaultProfilepic;
    }
  return result;
}

//utility function to send a notification to a user.
/*
async function Sendnotification(user, notification) {
  const db = JSON.parse(await Readdatabase());
  db.notifications[user.username].notifications.push(notification);
  db.notifications[user.username].read = false;
  await Writedatabase(db);
}
*/

async function cleantext(text) {
  const bio = await fetch(
    `https://www.purgomalum.com/service/plain?text=${encodeURIComponent(text)}`
  ).then((data) => data.text());
  return bio;
}

//home page.
app.get("/", (req, res) => {
  let home = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bark Backend V2</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-100 text-gray-900">
    <!-- This website was made with a tempalte. I forgot the link though-->
    <!-- Navbar -->
    <nav class="bg-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0">
              <img class="h-8 w-8" src="https://bark.dumorando.com/src/images/Logo.svg" alt="Logo">
            </div>
            <div class="hidden md:ml-6 md:flex md:space-x-8">
              <a href="#" class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">Home</a>
              <a href="#" class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">Features</a>
              <a href="#" class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">Pricing</a>
              <a href="#" class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  
    <!-- Hero Section -->
    <section class="bg-white py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h1 class="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">The new Bark API</h1>
          <p class="mt-4 text-lg leading-6 text-gray-600">With more features, better performance, and more.</p>
          <div class="mt-8 flex justify-center">
            <div class="inline-flex rounded-md shadow">
              <a href="#" class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Documentation</a>
            </div>
            <div class="ml-3 inline-flex">
              <a href="#" class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50">Source code</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  
    <!-- Features Section -->
    <section class="bg-gray-50 py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="lg:text-center">
          <h2 class="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
          <p class="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">New features added in API v2</p>
          <p class="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">We added a lot of new things.</p>
        </div>
        <div class="mt-10">
          <dl class="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            <div class="relative">
              <dt>
                <div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <!-- Icon here -->
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <p class="ml-16 text-lg leading-6 font-medium text-gray-900">Fast Performance</p>
              </dt>
              <dd class="mt-2 ml-16 text-base text-gray-500">Our servers a lot faster cause we dont use anything cloud-related anymore yay!!</dd>
            </div>
            <div class="relative">
              <dt>
                <div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <!-- Icon here -->
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m0 0H6a9 9 0 018.73-6.88"></path>
                  </svg>
                </div>
                <p class="ml-16 text-lg leading-6 font-medium text-gray-900">More featrues</p>
              </dt>
              <dd class="mt-2 ml-16 text-base text-gray-500">Reworked comment system and more.</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  
    <!-- Footer -->
    <footer class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex justify-between items-center">
          <div class="text-gray-600">&copy; 2024 Bark team. All rights reserved.</div>
          <div class="flex space-x-6">
            <a href="#" class="text-gray-500 hover:text-gray-700">Privacy</a>
            <a href="#" class="text-gray-500 hover:text-gray-700">Terms</a>
            <a href="#" class="text-gray-500 hover:text-gray-700">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  
  </body>
  </html>
  
  `;
  res.send(home);
});

//route to create an account.
app.post("/api/v2/createAccount", async (req, res) => {
  if (!req.query.username || !req.query.password)
    return res.status(400).json({ error: "InvalidRequest" });

  /**
   * @type {import("easy-json-database").default}
   */
  const db = new Database(Databases.Accounts);
  if (db.has(req.query.username))
    return res.status(409).json({ error: "UserExists" });

  const usernameregex = /^(?![0-9]+$)[\w.,]+$/;

  if (!usernameregex.test(req.query.username))
    return res.status(400).json({ error: "InvalidCharacters" });

  if (req.query.username.length < 3 || req.query.username.length > 16)
    return res.status(400).json({ error: "InvalidLength" });

  db.set(req.query.username, {
    username: req.query.username,
    password: cryptr.encrypt(req.query.password),
    profilepicture: "default",
    token: crypto.randomBytes(25).toString("hex"),
    projects: [],
    ip: req.clientIp,
    datejoined: new Date()
  });

  const ucdb = new Database(Databases.Usercomments);
  ucdb.set(req.query.username, []);

  const ndb = new Database(Databases.Notifications);
  ndb.set(req.query.username, {
    read: true,
    notifications: []
  });
  
  res.json({ message: "AccountCreated" });
});

app.get("/api/v2/currentUser", TokenauthMiddleware, async (req, res) => {
  res.json(await Generateprofilejson(res.user));
});

app.get("/api/v2/users", async (req, res) => {
  //lists all the users registered.
  const db = new Database(Databases.Accounts);
  const count = db.all().length;

  let users = [];
  for (const user of db.all()) {
    console.log(user)
    users.push(await Generateprofilejson(user.data));
  }

  res.json({ count, users });
});

app.post("/api/v2/login", async (req, res) => {
  if (!req.query.username || !req.query.password)
    return res.status(400).json({ error: "InvalidRequest" });
  const db = new Database(Databases.Accounts);
  if (!db.has(req.query.username))
    return res.status(404).json({ error: "NotFound" });

  const user = db.get(req.query.username);
  
  if (cryptr.decrypt(user.password) === req.query.password) {
    res.json({
      token: user.token,
    });
  } else {
    res.status(401).json({
      error: "Reauthenticate",
    });
  }
});

app.post("/api/v2/resetToken", TokenauthMiddleware, async (req, res) => {
  const db = new Database(Databases.Accounts);

  res.user.token = crypto
    .randomBytes(25)
    .toString("hex");

  db.set(res.user.username, res.user);
  
  res.status(204).end();
});

app.put("/api/v2/setBio", TokenauthMiddleware, async (req, res) => {
  if (!req.body.bio) return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Accounts);
  const bio = await cleantext(req.body.bio);

  res.user.bio = bio;
  
  db.set(res.user.username, res.user);

  res.status(204).end();
});

app.get("/api/v2/fetchUser", async (req, res) => {
  if (!req.query.username)
    return res.status(400).json({ error: "InvalidRequest" });

  const udb = new Database(Databases.Accounts);

  if (!udb.has(req.query.username))
    return res.status(404).json({ error: "NotFound" });

  const db = new Database(Databases.Accounts);

  res.json(await Generateprofilejson(db.get(req.query.username)));
});

app.get("/api/v2/notifications", TokenauthMiddleware, async (req, res) => {
  const db = new Database(Databases.Notifications);

  res.json(db.get(res.user.username));
});

app.post("/api/v2/readNotifications", TokenauthMiddleware, async (req, res) => {
  const db = new Database(Databases.Notifications);
  const notifs = db.get(res.user.username);
  
  notifs.read = true;

  db.set(res.user.username, notifs);
  res.status(204).end();
});

app.put("/api/v2/setPFP", TokenauthMiddleware, async (req, res) => {
  if (!req.body.pfp) return res.status(400).json({ error: "InvalidRequest" });
  const db = new Database(Databases.Accounts);

  fs.writeFileSync(`./pfp/${res.user.username}.barkpfp`, req.body.pfp);

  res.user.profilepicture = "uploaded";
  
  db.set(res.user.username, res.user);
  res.status(204).end();
});

app.post(
  "/api/v2/publish",
  projectratelimit,
  TokenauthMiddleware,
  async (req, res) => {
    if (
      !req.body.projectdata ||
      !req.body.title ||
      !req.body.description ||
      !req.body.thumbnail
    )
      return res.status(400).json({ error: "InvalidRequest" });

    const { projectdata, title, description, thumbnail } = req.body;

    if (
      !String(projectdata).startsWith("data:") ||
      !String(thumbnail).startsWith("data:")
    )
      return res.status(400).json({ error: "InvalidFormat" });

    if (String(title).length > 600 || String(description).length > 4096)
      return res.status(400).json({ error: "InfoTooLong" });

    const id = String(_.random(1000000, 9999999));

    fs.writeFileSync(`projects/${id}.barkproject`, projectdata);
    fs.writeFileSync(`projects/${id}.barkthumbnail`, thumbnail);

    const db = new Database(Databases.Projects);

    db.set(id, {
      id,
      thumbnail: `https://bark-backend-api-prod.replit.app/api/v2/projectThumbnail?id=${id}`,
      data: `https://bark-backend-api-prod.replit.app/api/v2/projectData?id=${id}`,
      author: await Generateprofilejson(res.user),
      description,
      title,
    });

    const cdb = new Database(Databases.Comments);

    cdb.set(id, []);

    res.json({ id });
  }
);

app.get("/api/v2/projectThumbnail", async (req, res) => {
  if (!req.query.id) return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Projects);

  if (!db.has(req.query.id))
    return res.status(404).json({ error: "NotFound" });

  try {
    res.header("Content-Type", "text/plain");
    res.send(fs.readFileSync(`projects/${req.query.id}.barkthumbnail`, 'utf-8'));
  } catch {
    res.status(500).end();
  }
});

app.get("/api/v2/projectData", async (req, res) => {
  if (!req.query.id) return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Projects);

  if (!db.has(req.query.id))
    return res.status(404).json({ error: "NotFound" });

  try {
    res.header("Content-Type", "text/plain");
    res.send(fs.readFileSync(`projects/${req.query.id}.barkproject`));
  } catch {
    res.status(500).end();
  }
});

app.delete("/api/v2/deleteProject", TokenauthMiddleware, async (req, res) => {
  if (!req.query.id) return res.status(400).json({ error: "InvalidRequest" });

  /**
   * @type {import("easy-json-database").default}
   */
  const db = new Database(Databases.Projects);

  if (!db.has(req.query.id))
    return res.status(404).json({ error: "NotFound" });

  if (db.get(req.query.id).author.username !== res.user.username)
    return res.status(401).json({ error: "Reauthenticate" });

  const id = req.query.id;
  
  fs.unlinkSync(`projects/${req.query.id}.barkproject`);
  fs.unlinkSync(`projects/${req.query.id}.barkthumbnail`);

  db.delete(id);

  const cdb = new Database(Databases.Comments);

  cdb.delete(id);

  res.status(204).end();
});

app.put("/api/v2/projectDescription", TokenauthMiddleware, async (req, res) => {
  if (!req.body.description || !req.body.id)
    return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Projects);

  if (!db.has(req.body.id))
    return res.status(404).json({ error: "NotFound" });

  if (db.get(req.body.id).author.username !== res.user.username)
    return res.status(401).json({ error: "Reauthenticate" });

  let project = db.get(req.body.id);

  project.description = req.body.description;
  
  db.set(req.body.id, project);
  res.status(204).end();
});

app.put("/api/v2/projectTitle", TokenauthMiddleware, async (req, res) => {
  if (!req.body.title || !req.body.id)
    return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Projects);

  if (!db.has(req.body.id))
    return res.status(404).json({ error: "NotFound" });

  if (db.get(req.body.id).author.username !== res.user.username)
    return res.status(401).json({ error: "Reauthenticate" });

  let project = db.get(req.body.id);

  project.title = req.body.title;
  
  db.set(req.body.id, project);
  res.status(204).end();
});

app.get("/api/v2/project", async (req, res) => {
  if (!req.query.id) return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Projects);

  if (!db.has(req.query.id))
    return res.status(404).json({ error: "NotFound" });

  res.json(db.get(req.query.id));
});

app.get("/api/v2/projects", async (req, res) => {
  res.json({ message: "This route is Deprecated" });
});

app.get("/api/v2/profileComments", (req, res) => {
  if (!req.query.username)
    return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Usercomments);
  const udb = new Database(Databases.Accounts);

  if (!udb.has(req.query.username))
    return res.status(404).json({ error: "NotFound" });

  res.json(db.get(req.query.username));
});

const CommentRatelimit = ratelimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function RequiresAdmin(req,res,next) {
  const adb = new Database(Databases.Admins);
  if (adb.get('admins').includes(res.user.username)) {
    next();
  } else {
    res.status(401).send({error:'FeatureDisabledForThisAccount'});
  }
}

app.post(
  "/api/v2/postProfileComment",
  CommentRatelimit,
  TokenauthMiddleware,
  async (req, res) => {
    if (!req.query.username || !req.query.comment)
      return res.status(400).json({ error: "InvalidRequest" });

    const udb = new Database(Databases.Accounts);

    if (!udb.has(req.query.username))
      return res.status(404).json({ error: "NotFound" });

    const db = new Database(Databases.Usercomments);

    let comments = db.get(req.query.username);

    comments.unshift({
      user: await Generateprofilejson(res.user.username),
      content: await cleantext(req.query.comment),
      id: `${_.random(0, 578943)}`,
    });

    db.set(req.query.username, comments);

    res.status(204).end();
  }
);

app.delete(
  "/api/v2/deleteProfileComment",
  TokenauthMiddleware,
  async (req, res) => {
    if (!req.query.id || !req.query.username)
      return res.status(400).json({ error: "InvalidRequest" });

    const udb = new Database(Databases.Accounts);

    if (!udb.has(req.query.username))
      return res.status(404).json({ error: "NotFound" });

    const db = new Database(Databases.Usercomments);

    let comments = db.get(req.query.username);

    const comment = comments.find(
      (comment) => comment.id === req.query.id
    );

    if (!comment) return res.status(404).json({ error: "CommentNotFound" });

    if (!comment.user.username !== res.user.username)
      return res.status(401).json({ error: "Reauthenticate" });

    delete comments[req.query.username][
      comments.indexOf(comment)
    ];

    db.set(req.query.username, comments);

    res.status(204).end();
  }
);

app.post(
  "/api/v2/postProjectComment",
  CommentRatelimit,
  TokenauthMiddleware,
  async (req, res) => {

    if (!req.query.project || !req.query.comment)
      return res.status(400).json({ error: "InvalidRequest" });

    const pdb = new Database(Databases.Projects);

    if (!pdb.has(req.query.project))
      return res.status(404).json({ error: "NotFound" });

    const db = new Database(Databases.Comments);

    let comments = db.get(req.query.project);

    comments.unshift({
      user: await Generateprofilejson(res.user.username),
      content: await cleantext(req.query.comment),
      id: `${_.random(100000, 999999)}`,
    });

    db.set(req.query.project, comments);
    res.status(204).end();
  }
);

app.delete(
  "/api/v2/deleteProjectComment",
  TokenauthMiddleware,
  async (req, res) => {
    if (!req.query.id || !req.query.project)
      return res.status(400).json({ error: "InvalidRequest" });

    const pdb = new Database(Databases.Projects);

    if (!pdb.has(req.query.project))
      return res.status(404).json({ error: "NotFound" });

    const db = new Database(Databases.Comments);

    let comments = db.get(req.query.project);

    const comment = comments.find(
      (comment) => comment.id === req.query.id
    );

    if (!comment) return res.status(404).json({ error: "CommentNotFound" });

    if (!comment.user.username !== res.user.username)
      return res.status(401).json({ error: "Reauthenticate" });

    delete comments[
      comments.indexOf(comment)
    ];

    db.set(req.query.project, comments);

    res.status(204).end();
  }
);

app.get("/api/v2/admins", async (req, res) => {
  const db = new Database(Databases.Admins);
  res.json(db.get('admins') ?? []);
});

app.post("/api/v2/giveAdmin", TokenauthMiddleware, async (req, res) => {
  const adb = new Database(Databases.Admins);

  if (!adb.get("admins").includes(res.user.username))
    return res.status(401).json({ error: "FeatureDisabledForThisAccount" });

  if (!req.query.target)
    return res.status(400).json({ error: "InvalidRequest" });

  const udb = new Database(Databases.Accounts);

  if (!udb.has(req.query.target))
    return res.status(404).json({ error: "NotFound" });

  db.push("admins", req.query.target);

  log(`${res.user.username} just gave ${req.query.target} admin`);

  res.status(204).end();
});

app.put(
  "/api/v2/projectDescription/admin",
  TokenauthMiddleware,
  RequiresAdmin,
  async (req, res) => {
    if (!req.body.description || !req.body.id)
      return res.status(400).json({ error: "InvalidRequest" });
  
    const db = new Database(Databases.Projects);
  
    if (!db.has(req.body.id))
      return res.status(404).json({ error: "NotFound" });
  
    let project = db.get(req.body.id);
  
    project.description = req.body.description;
    
    db.set(req.body.id, project);

    log(`${res.user.username} just changed ${req.query.project}'s description`);

    res.status(204).end();
  }
);

app.put("/api/v2/projectTitle/admin", TokenauthMiddleware, RequiresAdmin, async (req, res) => {
  if (!req.body.title || !req.body.id)
    return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Projects);

  if (!db.has(req.body.id))
    return res.status(404).json({ error: "NotFound" });

  let project = db.get(req.body.id);

  project.title = req.body.title;
  
  db.set(req.body.id, project);

  log(`${res.user.username} just changed ${req.query.project}'s title`);

  res.status(204).end();
});

app.delete(
  "/api/v2/deleteProject/admin",
  TokenauthMiddleware,
  RequiresAdmin,
  async (req, res) => {
    if (!req.query.id) return res.status(400).json({ error: "InvalidRequest" });

    /**
     * @type {import("easy-json-database").default}
     */
    const db = new Database(Databases.Projects);

    if (!db.has(req.query.id))
      return res.status(404).json({ error: "NotFound" });

    const id = req.query.id;
    
    fs.unlinkSync(`projects/${req.query.id}.barkproject`);
    fs.unlinkSync(`projects/${req.query.id}.barkthumbnail`);

    db.delete(id);

    const cdb = new Database(Databases.Comments);

    cdb.delete(id);

    log(`${res.user.username} just deleted ${req.query.project}`);

    res.status(204).end();
  }
);

app.delete(
  "/api/v2/deleteProjectComment/admin",
  TokenauthMiddleware,
  RequiresAdmin,
  async (req, res) => {
    if (!req.query.id || !req.query.project)
      return res.status(400).json({ error: "InvalidRequest" });

    const pdb = new Database(Databases.Projects);

    if (!pdb.has(req.query.project))
      return res.status(404).json({ error: "NotFound" });

    const db = new Database(Databases.Comments);

    let comments = db.get(req.query.project);

    const comment = comments.find(
      (comment) => comment.id === req.query.id
    );

    if (!comment) return res.status(404).json({ error: "CommentNotFound" });

    delete comments[
      comments.indexOf(comment)
    ];

    db.set(req.query.project, comments);

    log(`${res.user.username} just deleted a comment on ${req.query.project}`);

    res.status(204).end();
  }
);

app.delete(
  "/api/v2/deleteProfileComment/admin",
  TokenauthMiddleware,
  RequiresAdmin,
  async (req, res) => {
    if (!req.query.id || !req.query.username)
      return res.status(400).json({ error: "InvalidRequest" });

    const udb = new Database(Databases.Accounts);

    if (!udb.has(req.query.username))
      return res.status(404).json({ error: "NotFound" });

    const db = new Database(Databases.Usercomments);

    let comments = db.get(req.query.username);

    const comment = comments.find(
      (comment) => comment.id === req.query.id
    );

    if (!comment) return res.status(404).json({ error: "CommentNotFound" });

    delete comments[req.query.username][
      comments.indexOf(comment)
    ];

    db.set(req.query.username, comments);

    log(`${res.user.username} just deleted a comment on ${req.query.username}`);

    res.status(204).end();
  }
);

/*
app.post("/api/v2/banUser", TokenauthMiddleware, async (req, res) => {
  if (!res.database.admins.includes(res.user.username))
    return res.status(401).json({ error: "FeatureDisabledForThisAccount" });
  if (!req.query.target)
    return res.status(400).json({ error: "InvalidRequest" });
  if (!res.database.users[req.query.target])
    return res.status(404).json({ error: "NotFound" });
  res.database.banned.push(res.database.users[req.query.target].ip);
  await Writedatabase(res.database);
  res.status(204).end();
});
*/

app.put("/api/v2/setPFP/admin", TokenauthMiddleware, RequiresAdmin, async (req, res) => {
  if (!req.body.pfp || !req.query.target) return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Accounts);

  if (!db.has(req.query.target))
    return res.status(404).json({ "error": "NotFound" });

  fs.writeFileSync(`./pfp/${res.user.username}.barkpfp`, req.body.pfp);

  let account = db.get(req.query.target);

  account.profilepicture = "uploaded";
  
  db.set(req.query.target, account);
  log(`${res.user.username} just changed ${req.query.target}'s pfp`);
  res.status(204).end();
});

app.put("/api/v2/setBio/admin", TokenauthMiddleware, RequiresAdmin, async (req, res) => {
  if (!req.body.bio || !req.query.target) return res.status(400).json({ error: "InvalidRequest" });

  const db = new Database(Databases.Accounts);

  if (!db.has(req.query.target))
    return res.status(404).json({ "error": "NotFound" });

  const bio = await cleantext(req.body.bio);

  let account = db.get(req.query.target);
  account.bio = bio;
  
  db.set(req.query.target, account);

  log(`${res.user.username} just changed ${req.query.target}'s Bio`);

  res.status(204).end();
});

app.put(
  "/api/v2/setProjectPictureAdmin",
  TokenauthMiddleware,
  RequiresAdmin,
  async (req, res) => {
    if (!req.query.target)
      return res.status(400).json({ error: "InvalidRequest" });

    if (!req.body.picture)
      return res.status(400).json({ error: "InvalidRequest" });

    log(`${res.user.username} just changed ${req.query.target}'s Thumbnail`);

    const pdb = new Database(Databases.Projects);

    if (!pdb.has(req.query.target))
      return res.status(404).json({ error: "NotFound" });

    fs.writeFileSync(`projects/${req.query.target}.barkthumbnail`, req.body.picture);

    res.status(204).end;
  }
);

app.listen(3000, "0.0.0.0", () => {
  console.log("Express server initialized");
});
