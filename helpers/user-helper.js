var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
const { resolve, reject } = require('promise')
const Razorpay = require('razorpay');
const { log } = require('handlebars')

const instance = new Razorpay({
  key_id: 'YOUR_KEY_ID',
  key_secret: 'YOUR_SECRET',
});
module.exports = {


    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })

        })

    },


    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let adminEmail='admin12345@gmail.com'
            let adminPassword=await bcrypt.hash('12345',10)
            let response = {}
           // console.log("admin password",adminPassword);
            if(userData.Email==adminEmail){
                bcrypt.compare(userData.Password,adminPassword).then((status)=>{
                if(status){
                    response.admin=true
                    response.status=true
                    resolve(response)
                }
                else{
                    resolve({status:false})
                }
            })
            }
            else{
           
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("login success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        console.log("login failed")
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("login email failed")
                resolve({ status: false })
            }
        }
        })
    },


    addToCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist !== -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(userId), 'product.item': new ObjectId(proId) },
                            {
                                $inc: { 'product.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(userId) },
                            {
                                $push: { product: proObj }
                            }
                        ).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObj = {
                    user: new ObjectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },


    getCartProduct: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get()
                .collection(collection.CART_COLLECTION)
                .aggregate([
                    {
                        $match: { user: new ObjectId(userId) },
                    },
                    {
                        $unwind: '$product'
                    },
                    {
                        $project: {
                            item: '$product.item',
                            quantity: '$product.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    }
                ]).toArray();
            resolve(cartItems)
        });
    },


    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });

                if (cart) {
                    const count = cart.product.length;
                    resolve(count);
                } else {
                    // Cart not found for the user
                    resolve(0); // Return 0 if cart doesn't exist
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new ObjectId(details.cart) },
                        {
                            $pull: { product: { item: new ObjectId(details.product) } }
                        },
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new ObjectId(details.cart), 'product.item': new ObjectId(details.product) },
                        {
                            $inc: { 'product.$.quantity': details.count }
                        }
                    ).then(() => {
                        resolve({ status: true })
                    })
            }
        })
    },


    removeCartProduct: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: new ObjectId(details.cart) },
                    {
                        $pull: { product: { item: new ObjectId(details.product) } }
                    },
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
        })
    },


    getToatlAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get()
                .collection(collection.CART_COLLECTION)
                .aggregate([
                    {
                        $match: { user: new ObjectId(userId) },
                    },
                    {
                        $unwind: '$product'
                    },
                    {
                        $project: {
                            item: '$product.item',
                            quantity: '$product.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
                        }
                    }
                ]).toArray();
            //console.log(total[0].total);
            resolve(total[0].total)
    
              
        });
    },


    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                user: new ObjectId(order.userId),
                paymentMethod: order['payment-method'],
                product: products,
                totalAmount: total,
                status: status,
                date:new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:new ObjectId(order.userId)})
                
                const insertedId=orderObj.user.toString()
                console.log("user id : ",insertedId);
                resolve(insertedId)
                
            })
        })
    },


    getCartProuctList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            // console.log(cart.product);
            resolve(cart.product)
        })
    },


    getUserOrder:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let order=await db.get().collection(collection.ORDER_COLLECTION).find({user:new ObjectId(userId)}).toArray()
            console.log(order);
            resolve(order)
        })
    },


    getOrderProduct:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems = await db.get()
            .collection(collection.ORDER_COLLECTION)
            .aggregate([
                {
                    $match: { _id: new ObjectId(orderId) },
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray();
        resolve(orderItems)
        })
    },


    generateRAzorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
          
                var options = {
                    amount: total,
                    currency: "INR",
                    receipt: orderId
                
                };
                instance.orders.create(options,function(err,order){
                    if(err){
                        console.log(err); 
                    }else{
                    console.log("new order",order);
                    resolve(order)
                    }
                })
                
                
               
        })
    }
}