const express = require('express');
const router = express.Router();
const { getAllPpeItems } = require('../controllers/ppeItem.controller');

router.get('/', getAllPpeItems);

module.exports = router;
