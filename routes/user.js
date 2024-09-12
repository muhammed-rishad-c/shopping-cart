var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelper = require('../helpers/user-helper');
const session = require('express-session');
const { resolve } = require('promise');
const verifyLogin=(req,res,next)=>{
  if(req.session.userloggedIn){
    next()
  }
  else{
    res.redirect('/login')
  }
}


router.get('/',async function (req, res, next) {
  let user=req.session.user
  //console.log(user);
  let cartCount=null;
  if(req.session.user){
  cartCount=await userHelper.getCartCount(req.session.user._id)
  }
  productHelpers.getAllproducts().then((products) => {
    res.render('user/view-products', { products,user,cartCount})
  })
});


router.get('/login', (req, res) => {
  if(req.session.user){
    res.redirect('/')
  }else{
  res.render('user/login',{"loginErr":req.session.userloginErr})
  req.session.userloginErr=false
  }
})


router.get('/signup', (req, res) => {
  res.render("user/signup")
})


router.post('/signup', (req, res) => {
  userHelper.doSignup(req.body).then((response) => {
    //console.log(response)
    req.session.user=response
    req.session.userloggedIn=true

    res.redirect('/')
  })
})


router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if(response.admin){
      console.log(response.admin);
      res.render('admin/adminlogin',({response}))
      
    }

    else if(response.status){
      req.session.user=response.user
      req.session.userloggedIn=true

      res.redirect('/')
    }
    else{
      req.session.userloginErr="invalid email or password"
      res.redirect('/login')
    }
  })
})


router.get('/logout',(req,res)=>{
  req.session.user=null;
  req.session.userloggedIn=false
  res.redirect('/')
})


router.get('/cart',verifyLogin,async(req,res)=>{
  let products=0
  products=await userHelper.getCartProduct(req.session.user._id)
  if(products.length==0){
    res.redirect('/') 
  }
  else{
  let total=await userHelper.getToatlAmount(req.session.user._id)
  //console.log(products);
  res.render('user/cart',{products,'user':req.session.user._id,total})
  }
})


router.get('/add-to-cart/:id',(req,res)=>{
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
   })
})


router.post('/change-product-quantity',(req,res,next)=>{
  //console.log(req.body);
  userHelper.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelper.getToatlAmount(req.body.user)
    res.json(response)

  })
})


router.post('/remove-cart-product',(req,res,next)=>{
 // console.log(req.body)
  userHelper.removeCartProduct(req.body).then((response)=>{
    res.json(response)
  })
})


router.get('/place-order',verifyLogin,async(req,res)=>{
  let total=await userHelper.getToatlAmount(req.session.user._id)
    res.render('user/place-Order',{total,user:req.session.user})
})


router.post('/place-Order',async(req,res)=>{
  let product=await userHelper.getCartProuctList(req.body.userId)
  let totalPrice=0
  if(product.length>0){
    totalPrice=await userHelper.getToatlAmount(req.body.userId)
  }
  userHelper.placeOrder(req.body,product,totalPrice).then((orderId)=>{
      res.json({status:true})
    
  })
  console.log(req.body)
})


router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})


router.get('/orders',async(req,res)=>{ 
  let orders=await userHelper.getUserOrder(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})  


router.get('/view-order-product/:id',async(req,res)=>{
  let product=await userHelper.getOrderProduct(req.params.id)
  console.log(product);
  res.render('user/view-order-product',({user:req.session.user,product}))
})


router.get('/direct-order/:id',async(req,res)=>{
  let product=await userHelper.getOrderProduct(req.params.id)
  res.render('user/view-order-product',({user:req.session.user,product}))
})
 

router.get('/direct-order',async(req,res)=>{ 
  let orders=await userHelper.getUserOrder(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})  

module.exports = router; 
