'use strict';

const fs   = require('fs');
const path = require('path');

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
  fs.writeFileSync(ordersFile, backupOrders);
  fs.writeFileSync(accountsFile, backupAccounts);
});
beforeEach(() => {
  fs.writeFileSync(productsFile, backupProducts);
  fs.writeFileSync(ordersFile, backupOrders);
  fs.writeFileSync(accountsFile, backupAccounts);
});

const shopCtrl  = require('../controllers/shopController');
const authCtrl  = require('../controllers/authController');
const staffCtrl = require('../controllers/staffController');
const Order     = require('../models/Order');
const Account   = require('../models/Account');

function mockRes() {
  const r = {};
  r.render   = jest.fn(() => r);
  r.redirect = jest.fn(() => r);
  r.status   = jest.fn(() => r);
  r.send     = jest.fn(() => r);
  return r;
}

function mockReq(overrides = {}) {
  return {
    session: { user: { id: 99, name: 'Test', email: 't@t.com', role: 'staff', address: '1 St' }, cart: {} },
    params: {}, body: {}, query: {}, headers: {},
    ...overrides,
  };
}

// ── 1. Search sản phẩm ────────────────────────────────────────
describe('Search & price filter', () => {
  test('search by name filters products', () => {
    const req = mockReq({ query: { search: 'Bolt' } });
    const res = mockRes();
    shopCtrl.showShop(req, res);
    const { products } = res.render.mock.calls[0][1];
    expect(products.every(p => p.name.toLowerCase().includes('bolt'))).toBe(true);
  });

  test('search with no match returns empty array', () => {
    const req = mockReq({ query: { search: 'xyznonexistent' } });
    const res = mockRes();
    shopCtrl.showShop(req, res);
    const { products } = res.render.mock.calls[0][1];
    expect(products).toHaveLength(0);
  });

  test('minPrice filters out cheaper products', () => {
    const req = mockReq({ query: { minPrice: '50' } });
    const res = mockRes();
    shopCtrl.showShop(req, res);
    const { products } = res.render.mock.calls[0][1];
    expect(products.every(p => p.price >= 50)).toBe(true);
  });

  test('maxPrice filters out expensive products', () => {
    const req = mockReq({ query: { maxPrice: '20' } });
    const res = mockRes();
    shopCtrl.showShop(req, res);
    const { products } = res.render.mock.calls[0][1];
    expect(products.every(p => p.price <= 20)).toBe(true);
  });

  test('combined minPrice and maxPrice', () => {
    const req = mockReq({ query: { minPrice: '10', maxPrice: '40' } });
    const res = mockRes();
    shopCtrl.showShop(req, res);
    const { products } = res.render.mock.calls[0][1];
    expect(products.every(p => p.price >= 10 && p.price <= 40)).toBe(true);
  });

  test('passes activeSearch to view', () => {
    const req = mockReq({ query: { search: 'shirt' } });
    const res = mockRes();
    shopCtrl.showShop(req, res);
    expect(res.render.mock.calls[0][1].activeSearch).toBe('shirt');
  });
});

// ── 2. Order Management ───────────────────────────────────────
describe('staffCtrl.showAllOrders', () => {
  test('renders staff/orders with all orders', () => {
    Order.add({ id: 'ORD-TEST1', userId: 1, email: 'a@b.com', items: [], total: 10, name: 'A', address: 'B', placedAt: '' });
    const req = mockReq({ query: {} });
    const res = mockRes();
    staffCtrl.showAllOrders(req, res);
    expect(res.render).toHaveBeenCalledWith('staff/orders', expect.objectContaining({ orders: expect.any(Array) }));
    const { orders } = res.render.mock.calls[0][1];
    expect(orders.length).toBeGreaterThan(0);
  });
});

describe('staffCtrl.updateOrderStatus', () => {
  test('updates order status and redirects', () => {
    Order.add({ id: 'ORD-STATUS1', userId: 1, email: 'x@x.com', items: [], total: 5, name: 'X', address: 'Y', placedAt: '' });
    const req = mockReq({ params: { id: 'ORD-STATUS1' }, body: { status: 'shipped' } });
    const res = mockRes();
    staffCtrl.updateOrderStatus(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/orders?success=1');
    expect(Order.getById('ORD-STATUS1').status).toBe('shipped');
  });

  test('redirects with error for invalid status', () => {
    const req = mockReq({ params: { id: 'ORD-X' }, body: { status: 'invalid' } });
    const res = mockRes();
    staffCtrl.updateOrderStatus(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/orders?error=invalid-status');
  });

  test('supports all 4 valid statuses', () => {
    ['pending', 'processing', 'shipped', 'delivered'].forEach((status, i) => {
      const id = `ORD-VALID${i}`;
      Order.add({ id, userId: 1, email: 'x@x.com', items: [], total: 1, name: 'X', address: 'Y', placedAt: '' });
      const req = mockReq({ params: { id }, body: { status } });
      const res = mockRes();
      staffCtrl.updateOrderStatus(req, res);
      expect(Order.getById(id).status).toBe(status);
    });
  });
});

// ── 3. Update Profile ─────────────────────────────────────────
describe('authCtrl.updateProfile', () => {
  let customer;
  beforeEach(() => {
    customer = Account.add({ name: 'Old Name', email: `u${Date.now()}@test.com`, password: 'pass123', address: 'Old Addr' });
  });

  function profileReq(body) {
    return mockReq({ session: { user: { id: customer.id, name: customer.name, email: customer.email, role: 'customer', address: customer.address }, cart: {} }, body });
  }

  test('updates name and address', () => {
    const req = profileReq({ name: 'New Name', address: 'New Addr' });
    const res = mockRes();
    authCtrl.updateProfile(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/profile?success=1');
    expect(Account.findById(customer.id).name).toBe('New Name');
  });

  test('updates password when provided', () => {
    const req = profileReq({ name: 'N', address: 'A', password: 'newpass', confirmPassword: 'newpass' });
    const res = mockRes();
    authCtrl.updateProfile(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/profile?success=1');
    const updated = Account.authenticate(customer.email, 'newpass');
    expect(updated).not.toBeNull();
  });

  test('returns error if passwords do not match', () => {
    const req = profileReq({ name: 'N', address: 'A', password: 'abc', confirmPassword: 'xyz' });
    const res = mockRes();
    authCtrl.updateProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('profile', expect.objectContaining({ error: expect.any(String) }));
  });

  test('returns error if name is empty', () => {
    const req = profileReq({ name: '', address: 'A' });
    const res = mockRes();
    authCtrl.updateProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('profile', expect.objectContaining({ error: expect.any(String) }));
  });

  test('updates session user after save', () => {
    const req = profileReq({ name: 'Updated', address: 'New Addr' });
    const res = mockRes();
    authCtrl.updateProfile(req, res);
    expect(req.session.user.name).toBe('Updated');
  });
});
