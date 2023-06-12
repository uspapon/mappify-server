const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)


const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());
/******
 * axiosSecure or fetch ('url', {method: '', headers: {authorization: ''Barer token}})
 * sends authorization with the document header
 * the bellow function reads that header with line number #21
 * if authorization not found it do not let the route(url) to be hit
 * **/
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization; // check if reques has authorization in the header
    if (!authorization) {
        return res.status(401).send({ error: true, message: "Unauthorized Access" })
    }

    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "Unauthorized Access" })
        }

        req.decoded = decoded;
        // console.log("jwt found this: ", req.decoded);
        next();
    })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ohovvoi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db("mappifyMindDB").collection("users");
        const classCollection = client.db("mappifyMindDB").collection("classes");
        const bookingCollection = client.db("mappifyMindDB").collection("bookings");
        const paymentCollection = client.db("mappifyMindDB").collection("payments");

        // API to check authorization

        /****
         * work jointly with onAuthstatechange and set toke in .env file and always 
         * monitors if user came with a valid accesstoken that matches with the token
         * stored in .env file
         * or not. 
         * **/
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log("user", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token });
        })

        /****
         * prevents accessing this route from accessing the routes(url)
         * from those who are already system user but role wise forbidden
         * **/
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            // console.log("decoded=", req.decoded.email, "past=", req.decoded.email)
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role != 'admin') {
                return res.status(403).send({ error: true, message: 'Access Forbidden' })
            }
            next();


        }

        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'Access Forbidden' })
            }
            next();
        }

        /***
         * used for condetional rendering of content according 
         * to the user role
         * **/
        app.get('/user/role/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            // console.log(email, "=")

            if (req.decoded.email !== email) {
                return res.send({ role: null })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role === 'admin') return res.send({ role: 'admin' })
            else if (user?.role === 'instructor') return res.send({ role: 'instructor' })
            else if (user?.role === 'student') return res.send({ role: 'student' })
        })

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const query = { email: user.email }
            const isUserExists = await userCollection.findOne(query);
            // console.log("existing user", isUserExists);
            if (isUserExists) {
                return res.send({ message: "user already exists" })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params;
            console.log("found:", id)
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: { role: 'admin' }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            console.log(result);
            res.send(result);
        })

        app.patch('/users/instructor/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params;
            console.log(id)
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: { role: 'instructor' }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            console.log(result);
            res.send(result);
        })

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            console.log(result);
            res.send(result);
        })

        // ADMIN DASHBOARD
        // Class related APIs   
        app.get('/admin/allclasses/', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await classCollection.find().toArray();
            console.log(result);
            res.send(result);
        })

        app.patch('/admin/class/approve/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params;
            console.log(id)
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: { status: 'approved' }
            }
            const result = await classCollection.updateOne(filter, updatedDoc);
            console.log(result);
            res.send(result);
        })

        app.patch('/admin/class/deny/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params;
            console.log(id)
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: { status: 'denied' }
            }
            const result = await classCollection.updateOne(filter, updatedDoc);
            console.log(result);
            res.send(result);
        })

        app.patch('/admin/class/feedback/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params;
            const message = req.body;
            console.log(id)
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: { feedback: message.feedback }
            }
            const result = await classCollection.updateOne(filter, updatedDoc);
            console.log(result);
            res.send(result);
        })

        // INSTRUCTOR DASHBOARD
        // Class related APIs
        app.post('/class', verifyJWT, verifyInstructor, async (req, res) => {
            const newClass = req.body;
            console.log(newClass);
            const result = await classCollection.insertOne(newClass);
            console.log(result)
            res.send(result);
        })

        app.get('/instructor/myclasses/:email', verifyJWT, verifyInstructor, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await classCollection.find(query).toArray();
            console.log(result);
            res.send(result);

            // const pipeline = [

            //     {
            //       $lookup: {
            //         from: 'classes',
            //         localField: 'classId',
            //         foreignField: '_id',
            //         as: 'class'
            //       }
            //     },
            //     {
            //       $unwind: '$class'
            //     },
            //     // {
            //     //   $group: {
            //     //     _id: '$class._id',
            //     //     className: { $first: '$class.name' },
            //     //     studentCount: { $sum: 1 }
            //     //   }
            //     // }
            //   ];

            //   const result2 = await bookingCollection.aggregate(pipeline).toArray();
            //   console.log(result2);
            //   res.send(result2);


              // const pipeline = [
            //     {
            //         $lookup: {
            //             from: 'classes',
            //             localField: 'classId',
            //             foreignField: '_id',
            //             as: 'class'
            //         }
            //     },
            //     {
            //         $unwind: '$class'
            //     },
            //     {
            //         $group: {
            //             _id: '$class.email',
            //             classId: { $first: '$class._id' },
            //             className: { $first: '$class.name' },
            //             classSeats: { $first: '$class.seats' },
            //             studentCount: { $sum: 1 },
            //             classPrice: { $first: '$class.price' },
            //             classStatus: { $first: '$class.status' },
            //         }
            //     }
            // ];


        })


        app.get('/ourinstructors/classes', verifyJWT, verifyInstructor, async (req, res) => {

            const pipeline = [
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'email',
                        foreignField: 'email',
                        as: 'classData'
                    }
                },
                {
                    $unwind: '$classData'
                }
                ,
                {
                    $group: {
                        _id: {
                            // seats: '$classData.seats', 
                            name: '$classData.name',
                            // email: '$classData.email',
                            // price: '$classData.price',

                        },

                    }
                },
                {
                    $project: {
                        classData: '$_id',
                        _id: 0
                    }
                }
            ];

            const result = await userCollection.aggregate(pipeline).toArray()
            res.send(result)

        })

        //  apis related to student dashboard
        app.post('/select-class/', verifyJWT, async (req, res) => {
            const saveClass = req.body;
            const result = await bookingCollection.insertOne(saveClass);
            console.log("I am done", result)
            res.send(result);
        })

        app.get('/bookings/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email, status: 'pending' };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/bookings/:id', verifyJWT, async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(filter);
            console.log(result);
            res.send(result);       
        })

        app.get('/enrolled-classes/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email, status: 'paid' };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        // APIs related to payment

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            console.log(price)
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.post('/payments', verifyJWT, async (req, res) => {
            // store payment info
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            // update booking status from pending to paid
            const filter = { _id: new ObjectId(payment.bookingId) }
            const updatedDoc = {
                $set: { status: 'paid' }
            }
            const updateStatus = await bookingCollection.updateOne(filter, updatedDoc);

            // reduce number of seat from classes collection
            const query = { _id: new ObjectId(payment.classId) }
            const update = { $inc: { seats: -1 } };
            const updateSeat = await classCollection.updateOne(query, update);


            res.send({ insertResult, updateStatus, updateSeat });
        })

        app.get('/payment-history/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { eamil: email };
            const result = await paymentCollection.find(query).toArray();
            console.log("empty?", result);
            res.send(result);
        })

        /****************************************/
        // API Related to website
        app.get('/ourclasses', async (req, res) => {
            const query = { status: 'approved' };
            const result = await classCollection.find(query).toArray();
            console.log(result);
            res.send(result);
        })
        app.get('/ourinstructors', async (req, res) => {
            const query = { role: 'instructor' };
            // const email = await userCollection.find(query).toArray();
            const result = await userCollection.find(query).toArray();

            console.log(result);
            res.send(result);
        })








        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('mind is mapping')
})

app.listen(port, () => {
    console.log('mindMap server is runnin on port:', port)
})