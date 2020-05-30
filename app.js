//jshint esversion: 6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const redisClient = require("redis").createClient;
const redis = redisClient(6379, 'redis-server');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
//let studentMap = new Map();

mongoose.connect("mongodb://mongo:27017/mongorediscomposeDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}, function(err) {
  if (!err) {
    console.log("successfully connected");
  }
});

redis.on("connect", function() {
  console.log('connected to Redis');
});

app.listen(3000, function() {
  console.log("Server started at https://localhost:3000");
});

const studentSchema = mongoose.Schema({
  name: String,
  roll: Number,
  physicsMarks: Number,
  chemistryMarks: Number,
  mathsMarks: Number
});

const Student = mongoose.model("Student", studentSchema);

//console.log(studentMap);

app.route("/students")
  .get(function(req, res) {
    const roll = req.body.roll;
    redis.get(roll, function(err, foundRecord) {
      if (err) {
        res.send(err)
      } else if (foundRecord) {
        console.log("Sent from redis cache");
        res.send(JSON.parse(foundRecord))
      } else {
        Student.findOne({
          roll: roll
        }, function(err, foundStudent) {
          if (err) {
            res.send(err);
          } else {
            if (foundStudent) {
              // studentMap.set(roll,foundStudent);
              redis.set(roll, JSON.stringify(foundStudent));
              res.send(foundStudent);
            } else {
              res.send("No record found with the details. Kindly register first");
            }
          }
        });
      }
    })
  })
  .post(function(req, res) {
    const student = new Student({
      name: req.body.name,
      roll: req.body.roll,
      physicsMarks: req.body.physicsMarks,
      chemistryMarks: req.body.chemistryMarks,
      mathsMarks: req.body.mathsMarks
    });
    student.save(function(err) {
      if (err) {
        res.send(err);
      } else {
        res.send("Successfully saved the student details");
      }
    });
  })
  .patch(function(req, res) {
    redis.exists(req.body.roll, function(err, response) {
      if (err) {
        console.log(err);
      } else {
        if (response) {
          redis.del(req.body.roll);
        }
      }
    })
    const roll = req.body.roll
    Student.updateOne({
        roll: roll
      }, {
        $set: req.body
      },
      function(err) {
        if (err) {
          res.send(err);
        } else {

          res.send("Successfully updated the details");
        }
      }
    )
    Student.findOne({
      roll: req.body.roll
    }, function(err, foundStudent) {
      if (err) {
        console.log(er);
      } else {
        redis.set(roll, JSON.stringify(foundStudent));
      }
    })
  })
  .delete(function(req, res) {
    redis.exists(req.body.roll, function(err, response) {
      if (err) {
        console.log(err);
      } else {
        if (response) {
          redis.del(req.body.roll);
        }
      }
    });
    Student.deleteOne({
        roll: req.body.roll
      },
      function(err) {
        if (err) {
          res.send(err);
        } else {
          res.send("Successfully deleted the info");
        }
      })
  });

// the following end point is to retreive all the details in the database
app.get("/students/all", function(req, res) {
  Student.find(function(err, foundStudents) {
    if (err) {
      res.send(err);
    } else {
      res.send(foundStudents);
    }
  })
})
