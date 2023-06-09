const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()


const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

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
        console.log("jwt found this: ", req.decoded);
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
        await client.connect();

        const userCollection = client.db("mappifyMindDB").collection("users");

        // API to check authorization
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log("user", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token });
        })

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
          
        const verifyInstructor = async(req, res, next) => {
            const email = req.decoded.email;
            const query = {email: email};
            const user = await userCollection.findOne(query);
            if(user?.role !== 'instructor'){
                return res.status(403).send({error: true, message: 'Access Forbidden'})
            }
            next();
        }

        // USER related APIs
        // app.get('/users/admin/:email', verifyJWT, async(req, res) => {
        //     const email = req.params.email;
            
        //     console.log('i am hit')
        //     console.log(email);

        //     if(req.decoded.email !== email){
        //         return res.send({admin: false})
        //     }

        //     const query = { email: email};
        //     const foundUser = await userCollection.findOne(query);
            
        //     console.log(foundUser);
        //     const result = { admin: foundUser?.role === 'admin' }
        //     res.send(result);
        // })



        app.get('/user/role/:email', verifyJWT, async(req, res) => {
            const email = req.params.email;

            console.log(email, "=" )

            if(req.decoded.email !== email){
                return res.send({role: null})
            }

            const query = {email: email};
            const user = await userCollection.findOne(query);
            if(user?.role === 'admin') return res.send({role: 'admin'})
            else if (user?.role === 'instructor') return res.send({role: 'instructor'})
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

        app.patch('/users/admin/:id', async (req, res) => {
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

        app.patch('/users/instructor/:id', async (req, res) => {
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

        app.delete('/users/:id', async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
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