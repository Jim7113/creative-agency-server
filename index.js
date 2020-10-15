const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
require("dotenv").config();
const jwt_decode = require("jwt-decode");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster-zero.xfaee.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("doctors"));
app.use(fileUpload());

const port = 8080;

app.get("/", (req, res) => {
  res.send("welcome to creative agency");
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    app.get("/services", (req, res) => {
      client
        .db("creative-agency")
        .collection("services")
        .find({})
        .toArray((error, result) => {
          if (error) {
            res.status(500).send(error);
          } else {
            res.send(result);
          }
        });
    });

    app.get("/review", (req, res) => {
      client
        .db("creative-agency")
        .collection("review-data")
        .find({})
        .toArray((error, result) => {
          if (error) {
            res.status(500).send(error);
          } else {
            res.send(result);
          }
        });
    });

    app.get("/order-list", (req, res) => {
      const bearer = req.headers.authorization;
      if (bearer && bearer.startsWith("Bearer ")) {
        const idToken = bearer.split(" ")[1];
        const decodedToken = jwt_decode(idToken);
        const tokenEmail = decodedToken.email;
        client
          .db("creative-agency")
          .collection("admins")
          .findOne({ email: tokenEmail })
          .then((result) => {
            if (result) {
              client
                .db("creative-agency")
                .collection("order-data")
                .find({})
                .toArray((error, result) => {
                  if (error) {
                    res.status(500).send(error);
                  } else {
                    res.send(result);
                  }
                });
            } else {
              client
                .db("creative-agency")
                .collection("order-data")
                .find({ email: tokenEmail })
                .toArray((error, result) => {
                  if (error) {
                    res.status(500).send(error);
                  } else {
                    res.send(result);
                  }
                });
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });

    app.post("/update-state", (req, res) => {
      const bearer = req.headers.authorization;
      const { _id, state } = req.body;
      if (bearer && bearer.startsWith("Bearer ")) {
        const idToken = bearer.split(" ")[1];
        const decodedToken = jwt_decode(idToken);
        const tokenEmail = decodedToken.email;
        client
          .db("creative-agency")
          .collection("admins")
          .findOne({ email: tokenEmail })
          .then((result) => {
            if (result) {
              client
                .db("creative-agency")
                .collection("order-data")
                .updateOne(
                  {
                    _id: new ObjectID(_id),
                  },
                  {
                    $set: {
                      state: state,
                    },
                  }
                )
                .then((result) => {
                  res.send({ successMsg: "successfully updated!" });
                })
                .catch((error) => {
                  res.status(500).send({ message: "could not update!" });
                });
            } else {
              res.status(400).send({ message: "Authorization Error" });
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });

    app.post("/add-services", (req, res) => {
      const file = req.files.file;
      const serviceTitle = req.body.serviceTitle;
      const description = req.body.description;
      const newImg = file.data;
      const encImg = newImg.toString("base64");

      let image = {
        contentType: file.mimetype,
        size: file.size,
        img: Buffer.from(encImg, "base64"),
      };

      client
        .db("creative-agency")
        .collection("services")
        .insertOne({ serviceTitle, description, image })
        .then((result) => {
          res.send(result.insertedCount > 0);
        });
    });

    app.post("/service-order", (req, res) => {
      let orderData = req.body;
      orderData.state = "Pending";
      const bearer = req.headers.authorization;
      if (bearer && bearer.startsWith("Bearer ")) {
        const idToken = bearer.split(" ")[1];
        const decodedToken = jwt_decode(idToken);
        const tokenEmail = decodedToken.email;
        if (tokenEmail === orderData.email) {
          client
            .db("creative-agency")
            .collection("order-data")
            .insertOne(orderData, (error, result) => {
              if (error) {
                res.send(error);
              } else {
                res.send({
                  successMsg: "Successfully registered",
                });
              }
            });
        } else {
          res.send({ errMsg: "Invalid Credentials" });
        }
      } else {
        console.log("error");
      }
    });

    app.post("/add-admin", (req, res) => {
      let admin = req.body;
      const bearer = req.headers.authorization;
      if (admin.email === admin.madeBy) {
        return res.status(400).send();
      }

      client
        .db("creative-agency")
        .collection("admins")
        .findOne({ email: admin.email })
        .then((result) => {
          if (result) {
            return res.status(400).send();
          }
          if (bearer && bearer.startsWith("Bearer ")) {
            const idToken = bearer.split(" ")[1];
            const decodedToken = jwt_decode(idToken);
            const tokenEmail = decodedToken.email;
            if (tokenEmail === admin.madeBy) {
              client
                .db("creative-agency")
                .collection("admins")
                .insertOne({ email: admin.email }, (error, result) => {
                  if (error) {
                    res.send(error);
                  } else {
                    res.send({
                      successMsg: "Successfully registered as admin",
                    });
                  }
                });
            } else {
              res.send({ errMsg: "Invalid Credentials" });
            }
          } else {
            console.log("error");
          }
        });
    });

    app.post("/review", (req, res) => {
      let reviewData = req.body;
      const bearer = req.headers.authorization;
      if (bearer && bearer.startsWith("Bearer ")) {
        const idToken = bearer.split(" ")[1];
        const decodedToken = jwt_decode(idToken);
        const tokenEmail = decodedToken.email;
        if (tokenEmail === reviewData.email) {
          client
            .db("creative-agency")
            .collection("review-data")
            .insertOne(reviewData, (error, result) => {
              if (error) {
                res.send(error);
              } else {
                res.send({
                  successMsg: "Successfully Posted Review",
                });
              }
            });
        } else {
          res.send({ errMsg: "Invalid Credentials" });
        }
      } else {
        console.log("error");
      }
    });

    app.get("/isAdmin/:email", (req, res) => {
      const email = req.params.email;
      client
        .db("creative-agency")
        .collection("admins")
        .find({ email: email })
        .toArray((error, result) => {
          if (error) {
            return res.status(500).send();
          }
          res.send(result.length > 0);
        });
    });
  }
});

app.listen(process.env.PORT || port);
