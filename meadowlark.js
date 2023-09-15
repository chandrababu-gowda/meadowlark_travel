var express = require("express");
var http = require("http");
var bodyParser = require("body-parser");
var formidable = require("formidable");
var session = require("express-session");
var mongoose = require("mongoose");
var fortune = require("./lib/fortune.js");
var credentials = require("./credentials.js");
var Vacation = require("./models/vacation.js");
var app = express();

// switch (app.get("env")) {
//   case "development":
//     app.use(require("morgan")("dev"));
//     break;
//   case "production":
//     app.use(
//       require("express-logger")({ path: __dirname + "/log/requests.log" })
//     );
//     break;
// }

switch (app.get("env")) {
  case "development":
    mongoose.connect(credentials.mongo.development.connectionString);
    break;
  case "production":
    mongoose.connect(credentials.mongo.production.connectionString);
    break;
  default:
    throw new Error(`Unknown execution environment: ${app.get("env")}`);
}

app.disable("x-powered-by");

// var mailTransport = nodemailer.createTransport("SMTP", {
//   service: "Gmail",
//   auth: {
//     user: credentials.gmail.user,
//     pass: credentials.gmail.password,
//   },
// });

// mailTransport.sendMail(
//   {
//     from: `'Meadowlark Travel' <info@meadowlarktravel.com>`,
//     to: "chandrababugowda3042003@gmail.com",
//     subject: "Your Meadowlark Travel Tour",
//     text: "Thank you for booking your trip with Meadowlark trave, We look forward to your visit",
//   },
//   (err) => {
//     if (err) console.error(`Unable to send email: ${error}`);
//   }
// );

// Set up handlebar view engine

var handlebars = require("express3-handlebars").create({
  defaultLayout: "main",
});
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

app.set("port", process.env.PORT || 3000);

// Close the server if there is an uncaught exception
app.use((req, res, next) => {
  // Create a domain for this request
  var domain = require("domain").create();

  // Handle error on this domain
  domain.on("error", (err) => {
    console.log("DOMAIN ERROR CAUGHT \n", err.stack);
    try {
      // Failsafe shutdown in 5 seconds
      setTimeout(() => {
        console.error("Failsafe shutdown");
        process.exit(1);
      }, 5000);

      // Disconnect from the server
      var worker = require("cluster").worker;
      if (worker) {
        worker.disconnect();
      }

      // Stop taking new requests
      server.close();

      try {
        // Attempt to use Express error route
        next(err);
      } catch (err) {
        // If Express error route failed, try plain Node response
        console.error("Express error mechanism failed \n", err.stack);
        res.statusCode = 500;
        res.setHeader("content-type", "text/plain");
        res.end("Server error");
      }
    } catch (err) {
      console.error("Unable to send 500 response.\n", err.stack);
    }
  });

  // Add the request and response objects to the domain
  domain.add(req);
  domain.add(res);

  // Execute the rest of the request chain in the domain
  domain.run(next);
});

var dataDir = `${__dirname}/data`;
var vacationPhotoDir = `${dataDir}/vacation-photo`;
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

function saveContestEntry(contestName, email, year, month, photoPath) {}

app.use(express.static(__dirname + "/public"));

app.use((req, res, next) => {
  res.locals.showTests =
    app.get("env") !== "production" && req.query.test === "1";
  next();
});

app.use(function (req, res, next) {
  if (!res.locals.partials) res.locals.partials = {};
  res.locals.partials.weather = getWeatherData();
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(require("cookie-parser")(credentials.cookieSecret));
app.use(
  session({
    secret: "cookie_secret",
    resave: true,
    saveUninitialized: true,
  })
);

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use((req, res, next) => {
  var cluster = require("cluster");
  if (cluster.isWorker) {
    console.log(`Worker ${cluster.worker.id} recevied request`);
  }
  next();
});

app.get("/", (req, res) => {
  req.session.userName = null;
  res.render("home");
});

app.get("/about", (req, res) => {
  res.render("about", {
    fortune: fortune.getFortune(),
    pageTestScript: "/qa/tests-about.js",
  });
});

app.get("/fail", (req, res) => {
  throw new Error("Nope!");
});

app.get("/epic-fail", (req, res) => {
  process.nextTick(() => {
    throw new Error("Kaboom!");
  });
});

app.get("/tours/hood-river", (req, res) => {
  res.render("tours/hood-river");
});

app.get("/tours/request-group-rate", (req, res) => {
  res.render("tours/request-group-rate");
});

app.get("/headers", (req, res) => {
  res.set("Content-type", "text/plain");
  var s = "";
  for (var name in req.headers) s += name + ": " + req.headers[name] + "\n";
  res.send(s);
});

app.get("/newsletter", (req, res) => {
  res.render("newsletter", { csrf: "CSRF tokens goes here" });
});

app.get("/thank-you", (req, res) => {
  res.render("thank-you");
});

app.get("/contest/vacation-photo", (req, res) => {
  var now = new Date();
  res.render("contest/vacation-photo", {
    year: now.getFullYear(),
    month: now.getMonth(),
  });
});

app.post("/contest/vacation-photo/:year/:month", (req, res) => {
  var form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.redirect(303, "/error");
    }
    if (err) {
      res.session.flash = {
        type: "danger",
        intro: "Oops!",
        message:
          "There was an error processing your submission, Please try again",
      };
      return res.redirect(303, "/contest/vacation-photo");
    }
    var photo = files.photo;
    var dir = `${vacationPhotoDir}/${Date.now()}`;
    var path = `${dir}/${photo.name}`;
    fs.mkdirSync(dir);
    fs.renameSync(photo.path, `${dir}/${photo.name}`);
    saveContestEntry(
      "vacation-photo",
      fields.email,
      req.params.year,
      req.params.month,
      path
    );
    req.session.flash = {
      type: "success",
      intro: "Good luck!",
      message: "You have been entered into the contest",
    };
    return res.redirect(303, "/contest/vacation-photo/entries");
  });
});

app.post("/process", (req, res) => {
  console.log(`Form (from querystring): ${req.query.form}`);
  console.log(`CSRF tokens (from hidden form field): ${req.body._csrf}`);
  console.log(`Name: ${req.body.name}`);
  console.log(`Email: ${req.body.email}`);
  res.redirect(303, "/thank-you");
});

// Custom 404 page
app.use((req, res) => {
  res.status(404);
  res.render("404");
});

// Custom 500 page
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500);
  res.render("500");
});

// app.listen(app.get("port"), () => {
//   console.log(`Express started on https://localhost${app.get("port")}`);
// });

function startServer() {
  http.createServer(app).listen(app.get("port"), () => {
    console.log(
      `Express started in ${app.get("env")} mode in http://localhost:${app.get(
        "port"
      )}`
    );
  });
}

if (require.main === module) {
  startServer();
} else {
  module.exports = startServer;
}

function getWeatherData() {
  return {
    locations: [
      {
        name: "Portland",
        forecastUrl: "https://www.wunderground.com/US/OR/Portland.html",
        iconUrl: "https://icons-ak.wxug.com/i/c/k/cloudy.gif",
        weather: "Overcast",
        temp: "12.3 C",
      },
      {
        name: "Bend",
        forecastUrl: "https://www.wunderground.com/US/OR/Bend.html",
        iconUrl: "https://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
        weather: "Partly Cloudy",
        temp: "12.8 C",
      },
      {
        name: "Manzanita",
        forecastUrl: "https://www.wunderground.com/US/OR/Manzanita.html",
        iconUrl: "https://icons-ak.wxug.com/i/c/k/rain.gif",
        weather: "Light Rain",
        temp: "12.8 C",
      },
    ],
  };
}
