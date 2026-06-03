'use strict';

const fs      = require('fs');
const path    = require('path');

const productsFile = path.join(__dirname, '..', 'data', 'products.json');
const ordersFile   = path.join(__dirname, '..', 'data', 'orders.json');
const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');

let backupProducts, backupOrders, backupAccounts;
beforeAll(() => {
  backupProducts = fs.readFileSync(productsFile, 'utf8');
  backupOrders   = fs.readFileSync(ordersFile, 'utf8');
  backupAccounts = fs.readFileSync(accountsFile, 'utf8');
});
afterAll(() => {
  fs.writeFileSync(productsFile, backupProducts);
  fs.writeFileSync(ordersFile,   backupOrders);
  fs.writeFileSync(accountsFile, backupAccounts);
});
beforeEach(() => {
  fs.writeFileSync(productsFile, backupProducts);
  fs.writeFileSync(ordersFile,   backupOrders);
  fs.writeFileSync(accountsFile, backupAccounts);
});

const staffCtrl = require('../controllers/staffController');
const Product   = require('../models/Product');
const Order     = require('../models/Order');
const Account   = require('../models/Account');

function mockRes() {
  const res = {};
  res.render    = jest.fn(() => res);
  res.redirect  = jest.fn(() => res);
  res.status    = jest.fn(() => res);
  res.send      = jest.fn(() => res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    session: { user: { id: 1, name: 'Staff', email: 'staff@test.com', role: 'staff' }, cart: {} },
    params: {},
    body: {},
    query: {},
    ...overrides,
  };
}

describe('staffCtrl.showDashboard', () => {
  test('renders staff/dashboard with products', () => {
    const req = mockReq();
    const res = mockRes();
    staffCtrl.showDashboard(req, res);
    expect(res.render).toHaveBeenCalledWith('staff/dashboard', expect.objectContaining({ products: expect.any(Array) }));
  });
});

describe('staffCtrl.createProduct', () => {
  test('creates product and redirects', () => {
    const req = mockReq({ body: { name: 'New Cap', price: '15', category: 'apparel', type: 'hat' } });
    const res = mockRes();
    staffCtrl.createProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/dashboard?success=created');
    expect(Product.getAll().some(p => p.name === 'New Cap')).toBe(true);
  });

  test('renders form with error on invalid data', () => {
    const req = mockReq({ body: { name: '', price: '', category: '', type: '' } });
    const res = mockRes();
    staffCtrl.createProduct(req, res);
    expect(res.render).toHaveBeenCalledWith('staff/product-form', expect.objectContaining({ error: expect.any(String) }));
  });
});

describe('staffCtrl.updateProduct', () => {
  test('updates product and redirects', () => {
    const p = Product.add({ name: 'Old', price: 10, category: 'c', type: 't' });
    const req = mockReq({ params: { id: String(p.id) }, body: { name: 'Updated', price: '25', category: 'c', type: 't' } });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/dashboard?success=updated');
    expect(Product.getById(p.id).name).toBe('Updated');
  });
});

describe('staffCtrl.deleteProduct', () => {
  test('deletes product and redirects', () => {
    const p = Product.add({ name: 'Bye', price: 5, category: 'c', type: 't' });
    const req = mockReq({ params: { id: String(p.id) } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/dashboard?success=deleted');
    expect(Product.getById(p.id)).toBeUndefined();
  });

  test('redirects with error if product not found', () => {
    const req = mockReq({ params: { id: '99999' } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/staff/dashboard?error='));
  });
});

describe('staffCtrl.createCustomerOrder', () => {
  test('creates order for existing customer and redirects', () => {
    const customer = Account.add({ name: 'John', email: 'john@test.com', password: 'pass123', address: '123 St' });
    const product  = Product.add({ name: 'Mug', price: 10, category: 'gear', type: 'mug' });
    const req = mockReq({ body: { customerId: String(customer.id), productId: String(product.id), quantity: '2' } });
    const res = mockRes();
    staffCtrl.createCustomerOrder(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/dashboard?success=order-created');
    const orders = Order.getByUserId(customer.id);
    expect(orders.length).toBeGreaterThan(0);
  });

  test('renders error if customer not found', () => {
    const product = Product.add({ name: 'Hat', price: 5, category: 'c', type: 't' });
    const req = mockReq({ body: { customerId: '99999', productId: String(product.id), quantity: '1' } });
    const res = mockRes();
    staffCtrl.createCustomerOrder(req, res);
    expect(res.render).toHaveBeenCalledWith('staff/customer-order', expect.objectContaining({ error: expect.any(String) }));
  });
});

describe('authCtrl.requireStaff', () => {
  const authCtrl = require('../controllers/authController');

  test('calls next() for staff user', () => {
    const req  = mockReq();
    const res  = mockRes();
    const next = jest.fn();
    authCtrl.requireStaff(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 403 for non-staff user', () => {
    const req  = mockReq({ session: { user: { role: 'customer' }, cart: {} } });
    const res  = mockRes();
    const next = jest.fn();
    authCtrl.requireStaff(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 403 for unauthenticated user', () => {
    const req  = mockReq({ session: { cart: {} } });
    const res  = mockRes();
    const next = jest.fn();
    authCtrl.requireStaff(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});
