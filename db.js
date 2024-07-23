const mysql = require('mysql2');

function db() {
    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: null,
        database: 'restaurant-app'
    });

    con.connect((err) => {
        if (err) {
            console.log(err);
        } else {
            con.query('SHOW TABLES LIKE "USERS"', (err, tables) => {
                if (err) {
                    console.log(err);
                } else {
                    if (tables.length === 0) {
                        console.log('Table BOOKINGS does not exist, creating...');
                        var query = "CREATE TABLE USERS(ID INTEGER PRIMARY KEY AUTO_INCREMENT,NAME VARCHAR(225),PASSWORD VARCHAR(255)); ";

                        con.query(query, (err) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('Table USERS created successfully');
                            }
                        });


                    } else {
                        console.log('Table USERS already exists');
                    }
                }
            });
            con.query('SHOW TABLES LIKE "RESTAURANTS"', (err, result) => {
                if (err) {
                    console.log(err);
                }
                else {
                    if (result.length === 0) {
                        let tblquery = "CREATE TABLE RESTAURANTS(ID INTEGER PRIMARY KEY AUTO_INCREMENT,NAME VARCHAR(255),EMAIL VARCHAR(255) UNIQUE,PASSWORD VARCHAR(225),IMAGEURL VARCHAR(900),ISOPEN VARCHAR(200),LOGOURL VARCHAR(900));"
                        con.query(tblquery, (err, result) => {
                            if (err) {
                                console.log(err);
                            }
                        })
                    }
                    else {
                        console.log("table alredy exist");
                    }
                }
            });
            con.query('SHOW TABLES LIKE "CATEGORIES"', (err, result) => {
                if (err) {
                    console.log(err);
                }
                else {
                    if (result.length === 0) {
                        tblcat = "CREATE TABLE CATEGORIES(ID INTEGER PRIMARY KEY AUTO_INCREMENT,CATEGORY VARCHAR(255),PRICE INTEGER,R_NAME VARCHAR(225),USERNAME VARCHAR(225));"
                        con.query(tblcat, (err, result) => {
                            if (err) {
                                console.log(err)
                            }
                            else {
                                console.log('table created successfully');
                            }
                        })
                    }

                }
            });
            con.query('SHOW TABLES LIKE "ITEMS"', (err, result) => {
                if (err) {
                    console.log(err);
                }
                else {
                    if (result.length === 0) {
                        tblcat = "CREATE TABLE ITEMS(ID INTEGER PRIMARY KEY AUTO_INCREMENT,ITEM_NAME VARCHAR(225),PRICE INTEGER,CATEGORY VARCHAR(255),R_NAME VARCHAR(225),USERNAME VARCHAR(225));"
                        con.query(tblcat, (err, result) => {
                            if (err) {
                                console.log(err)
                            }
                            else {
                                console.log('table created successfully');
                            }
                        })
                    }

                }
            });
        }
    });

    return con;
}

module.exports = db;
