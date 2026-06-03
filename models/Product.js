'use strict';

const fs = require('fs');
const path = require('path');
const Category = require('./Category');

const productsFile = path.join(__dirname, '..', 'data', 'products.json');
const typesFile    = path.join(__dirname, '..', 'data', 'types.json');

function readProducts() {
  try {
    const raw = fs.readFileSync(productsFile, 'utf8');
    return JSON.parse(raw) || [];
  } catch (_) { return []; }
}

function writeProducts(products) {
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

class Product {
  static getAll()    { return readProducts(); }
  static getById(id) { return readProducts().find(p => p.id === Number(id)); }
  static getCategories() { return Category.getAll(); }
  static getTypes() {
    try { return JSON.parse(fs.readFileSync(typesFile, 'utf8')); }
    catch (_) { return []; }
  }

  static add({ name, price, category, type, image, badge }) {
    if (!name || !price || !category || !type) throw new Error('name, price, category, type are required.');
    const products = readProducts();
    const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
    const product = {
      id:       maxId + 1,
      name:     String(name).trim(),
      price:    Number(price),
      category: String(category).trim(),
      type:     String(type).trim(),
      image:    image || 'placeholder.svg',
      badge:    badge || null,
    };
    products.push(product);
    writeProducts(products);
    return product;
  }

  static update(id, fields) {
    const products = readProducts();
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx === -1) throw new Error('Product not found.');
    if (fields.price !== undefined) fields.price = Number(fields.price);
    products[idx] = { ...products[idx], ...fields };
    writeProducts(products);
    return products[idx];
  }

  static delete(id) {
    const products = readProducts();
    const filtered = products.filter(p => p.id !== Number(id));
    if (filtered.length === products.length) throw new Error('Product not found.');
    writeProducts(filtered);
  }
}

module.exports = Product;
