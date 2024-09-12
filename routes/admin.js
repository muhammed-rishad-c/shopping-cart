var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');
const productHelpers = require('../helpers/product-helpers');
/* GET users listing. */

router.get('/admin',(req,res,next)=>{
  productHelpers.getAllproducts().then((products) => {
    console.log(products)
    res.render('admin/view-product', { admin: true, products })
    req.session.adminLoggedin=true
  })
})

router.get("/", function (req, res, next) {
  productHelpers.getAllproducts().then((products) => {
    console.log(products)
    res.render('admin/view-product', { admin: true, products })
  })
});


router.get('/add-product', (req, res) => {
  res.render('admin/add-product')
})


router.post('/add-product', (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    let Image = req.files.image
    console.log(id)
    Image.mv('./public/product-images/' + id + '.jpg', (err) => {
      if (!err) {
        res.render('admin/add-product')
      }
      else {
        console.log(err)
      }
    })
    console.log(id)
  })
})


router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id
  console.log(proId)
  productHelper.deleteProduct(proId).then((response) => {
    res.redirect('/admin')
  })
})


router.get('/edit-product/:id',async(req,res)=>{
  let product=await productHelper.getAllproductDetails(req.params.id)
  console.log(product)
  res.render('admin/edit-product',{product})
})


router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id
  productHelper.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){
      let Image=req.files.image
      Image.mv('./public/product-images/' + id + '.jpg')
    }
  })
})

module.exports = router;
