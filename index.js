const express = require('express');
const multer = require('multer');
const db = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const { name } = require('ejs');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'uploads')));


const uploadDir = path.join(__dirname, 'uploads');

const sessionConfig = {
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

app.use(session(sessionConfig));

const con = db();

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.loggedIn) {
        return next();
    }
    res.redirect('/');
};

// Routes
app.get('/', (req, res) => res.render('login'));
app.get('/admin_login', (req, res) => res.render('admin_login'));
app.get('/admin_home', isLoggedIn, (req, res) => res.render('admin_home', { session: req.session }));
app.get('/signup', (req, res) => res.render('signup'));
app.get('/admin_signup', (req, res) => res.render('admin_signup'));

app.get('/home',(req,res)=>{
    if(!req.session.loggedIn){
        res.render('login');
    }
    else{
        var query='SELECT * FROM RESTAURANTS';
        con.query(query,async(err,data)=>{
            if(err){
                console.log(err);
            }else{
                // var list= await data[0];
                // var filepath=data[0].IMAGEURL;
                // var imagepath=path.basename(filepath);
                // console.log(imagepath);
                var list=await data
                res.render('home',{list:list,session:req.session});
            }
        })
    }
   
})

app.post('/admin_login', async (req, res) => {
    const { name, password } = req.body;

    const logQuery = 'SELECT * FROM RESTAURANTS WHERE EMAIL=?';
    con.query(logQuery, [name], async (err, result) => {
        if (err) return res.status(500).send("Server error");

        if (result.length > 0) {
            const admin = result[0];
            const passCheck = await bcrypt.compare(password, admin.PASSWORD);
            if (passCheck) {
                req.session.loggedIn = true;
                req.session.username = name;
                return res.redirect('/admin_home');
            }
            return res.send("Invalid credentials for admin");
        }
        return res.send("Admin not found");
    });
});

app.get('/add_category', (req, res) => {
    const uname = req.session.username;

    con.query('SELECT * FROM RESTAURANTS WHERE EMAIL=?', [uname], (err, result) => {
        if (err) return res.status(500).send("Server error");

        if (result.length > 0) {
            const r_name = result[0].NAME;

            // Fetch categories on page load
            con.query('SELECT * FROM CATEGORIES WHERE R_NAME=? AND USERNAME=?', [r_name, uname], (err, categories) => {
                if (err) return res.status(500).send("Server error");

                res.render('add_category', { data: categories, session: req.session });
            });
        } else {
            return res.status(404).send("Restaurant not found");
        }
    });
});


app.post('/add_category', (req, res) => {
    const cat_name = req.body.cat_name;
    const uname = req.session.username;

    con.query('SELECT * FROM RESTAURANTS WHERE EMAIL=?', [uname], (err, result) => {
        if (err) return res.status(500).send("Server error");

        if (result.length > 0) {
            const r_name = result[0].NAME;

            // Check for existing category
            con.query('SELECT * FROM CATEGORIES WHERE CATEGORY=? AND R_NAME=? AND USERNAME=?', [cat_name, r_name, uname], (err, existingCategories) => {
                if (err) return res.status(500).send("Server error");

                if (existingCategories.length > 0) {
                    // Category already exists
                    con.query('SELECT * FROM CATEGORIES WHERE R_NAME=? AND USERNAME=?', [r_name, uname], (err, categories) => {
                        if (err) return res.status(500).send("Server error");

                        return res.render('add_category', { data: categories, session: req.session, error: "Category already exists." });
                    });
                } else {
                    const insQuery = 'INSERT INTO CATEGORIES(CATEGORY, R_NAME, USERNAME) VALUES(?, ?, ?)';
                    con.query(insQuery, [cat_name, r_name, uname], (err) => {
                        if (err) return res.status(500).send("Server error");

                        // Fetch updated categories
                        con.query('SELECT * FROM CATEGORIES WHERE R_NAME=? AND USERNAME=?', [r_name, uname], (err, categories) => {
                            if (err) return res.status(500).send("Server error");

                            res.render('add_category', { data: categories, session: req.session });
                        });
                    });
                }
            });
        } else {
            return res.status(404).send("Restaurant not found");
        }
    });
});

app.get('/add_items/:name',(req,res)=>{
    if(!req.session.loggedIn){
        return res.redirect('/admin_login');
    }
    var cat_name=req.params.name;
    var uname= req.session.username;
    console.log(cat_name);
    let query=`SELECT * FROM RESTAURANTS WHERE EMAIL=?`;
    con.query(query,[uname,cat_name],(err,data)=>{
        if(err){
            console.log(err);
        }
        else{
            var r_name=data[0].NAME;
            item_query='SELECT * FROM ITEMS WHERE USERNAME=? AND CATEGORY=?';
            con.query(item_query,[uname,cat_name],(err,items)=>{
                if(err){
                    console.log(err);
                }
                else{
                    console.log(items);
                    res.render('add_items',{items:items,cat_name:cat_name, session:req.session});
                }
            })
        }
    })
    // res.render('add_items',{session:req.session});
});

app.post('/add_items', (req, res) => {
    const cat_name = req.body.cat_name;
    const uname = req.session.username;
    const item_name = req.body.name;
    const price = req.body.item_price;

    // Fetch the restaurant name first
    con.query(`SELECT * FROM RESTAURANTS WHERE EMAIL=?`, [uname], (err, data) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }

        if (data.length > 0) {
            const r_name = data[0].NAME;

            // Insert the new item into the database
            con.query(`INSERT INTO ITEMS(ITEM_NAME, CATEGORY, R_NAME, USERNAME, PRICE) VALUES(?, ?, ?, ?, ?)`, 
                [item_name, cat_name, r_name, uname, price], 
                (err) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send("Server error");
                    }

                    // Fetch the updated list of items
                    con.query(`SELECT * FROM ITEMS WHERE USERNAME=? AND CATEGORY=?`, [uname, cat_name], (err, items) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).send("Server error");
                        }

                        // Render the view with the updated list of items
                        res.render('add_items', { items: items, cat_name: cat_name, session: req.session });
                    });
                }
            );
        } else {
            return res.status(404).send("Restaurant not found");
        }
    });
});


app.get('/restaurant-menu/:name',(req,res)=>{
    if(!req.session.loggedIn){
        res.redirect('/home');
    }
    var r_name= req.params.name;
    var uname= req.session.username;
    console.log(r_name);
    var query=`SELECT * FROM ITEMS WHERE R_NAME='${r_name}'`;
    con.query(query,(err,result)=>{
        if(err){
            console.log(err);
        }
        else{
            console.log(result);
            res.render('restaurant-menu',{session:req.session,menu:result});
        }
    })
    ;
});

app.post('/restaurant-menu', (req, res) => {
    const selectedItems = req.body.items; // Array of selected item names
    const action = req.body.action; // "takeaway" or "delivery"

    if (!selectedItems) {
        return res.send("No items selected!");
    }

    // Create order details
    const orderDetails = {
        items: Array.isArray(selectedItems) ? selectedItems.map(item => JSON.parse(item)) : [JSON.parse(selectedItems)],
        action,
    };

    // Render order summary page with the order details
    res.render('order-summery', { orderDetails });
});

app.post('/order-details', (req, res) => {
    const { items, quantities } = req.body;

    if (!items || !Array.isArray(items) || !quantities) {
        return res.status(400).send("Invalid data");
    }

    const orderDetails = items.map((item, index) => {
        return {
            name: item.name,
            price: item.price,
            quantity: quantities[index] || 1, // Default to 1 if quantity not found
        };
    });

    res.render('order-details', { orderDetails });
});




app.post('/login', async (req, res) => {
    const { name, password } = req.body;

    const loginQuery = 'SELECT * FROM USERS WHERE NAME=?';
    con.query(loginQuery, [name], async (err, result) => {
        if (err) return res.status(500).send("Server error");

        if (result.length > 0) {
            const user = result[0];
            const passCheck = await bcrypt.compare(password, user.PASSWORD);
            if (passCheck) {
                req.session.loggedIn = true;
                req.session.username = user.NAME;
                return res.redirect('/home');
            }
            return res.send("Invalid credentials for user");
        }
        return res.send("User not found");
    });
});

app.post('/admin_signup', upload.fields([{ name: 'image' }, { name: 'logo' }]), async (req, res) => {
    const { email, password, r_name } = req.body;
    const imagepath = req.files['image'][0].originalname;
    const logopath = req.files['logo'][0].originalname;
    const hashPassword = await bcrypt.hash(password, 10);

    const query = 'SELECT * FROM RESTAURANTS WHERE EMAIL=?';
    con.query(query, [email], (err, result) => {
        if (err) return console.log(err);

        if (result.length === 0) {
            const insQuery = 'INSERT INTO RESTAURANTS(NAME, PASSWORD, EMAIL, IMAGEURL, LOGOURL) VALUES(?, ?, ?, ?, ?)';
            con.query(insQuery, [r_name, hashPassword, email, imagepath, logopath], (err) => {
                if (err) return console.log(err);
                res.render('admin_login');
            });
        } else {
            res.send("User already registered");
        }
    });
});

app.post('/signup', async (req, res) => {
    const { name, password } = req.body;
    const hashPassword = await bcrypt.hash(password, 10);

    const query = 'SELECT * FROM USERS WHERE NAME=?';
    con.query(query, [name], (err, result) => {
        if (err) return console.log(err);

        if (result.length === 0) {
            const insQuery = 'INSERT INTO USERS(NAME, PASSWORD) VALUES(?, ?)';
            con.query(insQuery, [name, hashPassword], (err) => {
                if (err) return console.log(err);
                res.render('login');
            });
        } else {
            res.send("User already registered");
        }
    });
});

app.get('/admin_logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.render(err);
        res.redirect('/admin_login');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.render(err);
        res.redirect('/');
    });
});

app.listen(2000, () => {
    console.log('Server is running on http://localhost:2000');
});
