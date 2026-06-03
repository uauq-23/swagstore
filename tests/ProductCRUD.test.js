'use strict';

const fs   = require('fs');
const path = require('path');

const productsFile = path.join(__dirname, '..', 'data', 'products.json');

// Backup & restore products.json between tests
let backup;
beforeAll(() => { backup = fs.readFileSync(productsFile, 'utf8'); });
afterAll(()  => { fs.writeFileSync(productsFile, backup); });
beforeEach(() => { fs.writeFileSync(productsFile, backup); });

const Product = require('../models/Product');

describe('Product.add', () => {
  test('adds a product and returns it with an id', () => {
    const p = Product.add({ name: 'Test Shirt', price: 19.99, category: 'apparel', type: 'shirt' });
    expect(p).toMatchObject({ name: 'Test Shirt', price: 19.99 });
    expect(typeof p.id).toBe('number');
  });

  test('persists to JSON file', () => {
    Product.add({ name: 'Persist', price: 5, category: 'gear', type: 'bag' });
    const all = Product.getAll();
    expect(all.some(p => p.name === 'Persist')).toBe(true);
  });

  test('throws when required fields missing', () => {
    expect(() => Product.add({ name: '', price: 10, category: 'c', type: 't' })).toThrow();
    expect(() => Product.add({ name: 'X', price: null, category: 'c', type: 't' })).toThrow();
  });

  test('auto-increments id', () => {
    const p1 = Product.add({ name: 'P1', price: 1, category: 'c', type: 't' });
    const p2 = Product.add({ name: 'P2', price: 2, category: 'c', type: 't' });
    expect(p2.id).toBeGreaterThan(p1.id);
  });
});

describe('Product.update', () => {
  test('updates product fields', () => {
    const added = Product.add({ name: 'Old', price: 10, category: 'c', type: 't' });
    const updated = Product.update(added.id, { name: 'New', price: 20 });
    expect(updated.name).toBe('New');
    expect(updated.price).toBe(20);
  });

  test('throws if product not found', () => {
    expect(() => Product.update(99999, { name: 'X' })).toThrow('Product not found.');
  });

  test('persists update to file', () => {
    const p = Product.add({ name: 'ToUpdate', price: 5, category: 'c', type: 't' });
    Product.update(p.id, { price: 99 });
    expect(Product.getById(p.id).price).toBe(99);
  });
});

describe('Product.delete', () => {
  test('removes product from list', () => {
    const p = Product.add({ name: 'ToDelete', price: 1, category: 'c', type: 't' });
    Product.delete(p.id);
    expect(Product.getById(p.id)).toBeUndefined();
  });

  test('throws if product not found', () => {
    expect(() => Product.delete(99999)).toThrow('Product not found.');
  });
});

describe('Product.getById', () => {
  test('returns correct product', () => {
    const p = Product.add({ name: 'Find Me', price: 3, category: 'c', type: 't' });
    expect(Product.getById(p.id).name).toBe('Find Me');
  });

  test('returns undefined for missing id', () => {
    expect(Product.getById(99999)).toBeUndefined();
  });
});
