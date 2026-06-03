'use strict';

const Product = require('../models/Product');
const Order   = require('../models/Order');
const Account = require('../models/Account');
const Cart    = require('../models/Cart');

function getCart(req) {
  return new Cart(req.session.cart || {});
}

// ── Product CRUD ──────────────────────────────────────────────
exports.showDashboard = (req, res) => {
  const products = Product.getAll();
  res.render('staff/dashboard', {
    products,
    cartCount: getCart(req).count,
  });
};

exports.showProductForm = (req, res) => {
  const productId = req.params.id;
  const product = productId ? Product.getById(productId) : null;
  res.render('staff/product-form', {
    product,
    categories: Product.getCategories(),
    types: Product.getTypes(),
    cartCount: getCart(req).count,
    editMode: !!product,
  });
};

exports.createProduct = (req, res) => {
  try {
    Product.add(req.body);
    res.redirect('/staff/dashboard?success=created');
  } catch (err) {
    res.render('staff/product-form', {
      error: err.message,
      form: req.body,
      categories: Product.getCategories(),
      types: Product.getTypes(),
      cartCount: getCart(req).count,
    });
  }
};

exports.updateProduct = (req, res) => {
  try {
    Product.update(req.params.id, req.body);
    res.redirect('/staff/dashboard?success=updated');
  } catch (err) {
    res.render('staff/product-form', {
      error: err.message,
      product: req.body,
      categories: Product.getCategories(),
      types: Product.getTypes(),
      cartCount: getCart(req).count,
      editMode: true,
    });
  }
};

exports.deleteProduct = (req, res) => {
  try {
    Product.delete(req.params.id);
    res.redirect('/staff/dashboard?success=deleted');
  } catch (err) {
    res.redirect('/staff/dashboard?error=' + encodeURIComponent(err.message));
  }
};

// ── Order for customer ────────────────────────────────────────
exports.showCustomerOrderForm = (req, res) => {
  const products = Product.getAll();
  const customers = Account.getAll().filter(a => a.role === 'customer');
  res.render('staff/customer-order', {
    products,
    customers,
    cartCount: getCart(req).count,
  });
};

exports.createCustomerOrder = (req, res) => {
  const { customerId, productId, quantity } = req.body;
  const customer = Account.findById(customerId);
  const product = Product.getById(productId);
  
  if (!customer || !product) {
    return res.render('staff/customer-order', {
      error: 'Invalid customer or product',
      products: Product.getAll(),
      customers: Account.getAll().filter(a => a.role === 'customer'),
      cartCount: getCart(req).count,
    });
  }

  const qty = Number(quantity) || 1;
  const subtotal = product.price * qty;
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const order = {
    id: 'ORD-' + Date.now(),
    userId: customer.id,
    email: customer.email,
    items: [{
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      total: subtotal,
    }],
    total,
    name: customer.name,
    address: customer.address,
    placedAt: new Date().toLocaleString('vi-VN'),
    createdBy: req.session.user.email,
  };

  Order.add(order);
  res.redirect('/staff/dashboard?success=order-created');
};
