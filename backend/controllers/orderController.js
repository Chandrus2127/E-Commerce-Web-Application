const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

/* =========================
   CREATE ORDER
   ========================= */
const createOrder = async (req, res) => {
  try {
    // Accept both formats from frontend
    const items = req.body.items || req.body.orderItems;
    const { shippingAddress, paymentMethod, total, totalPrice } = req.body;
    const finalTotal = total || totalPrice;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    // Create order
    const order = new Order({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      total: finalTotal,
      status: "PLACED",
    });

    await order.save();

    // Reduce stock
    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.stock < item.qty) {
        return res.status(400).json({
          message: `${product.name} has only ${product.stock} in stock`,
        });
      }

      product.stock -= item.qty;
      await product.save();
    }

    // Remove ONLY ordered products from user's cart
    const user = await User.findById(req.user._id);

    const orderedIds = items.map((i) => i.product.toString());

    user.cartItems = user.cartItems.filter(
      (item) => !orderedIds.includes(item.product.toString())
    );

    await user.save();

    res.status(201).json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ message: "Order failed" });
  }
};

/* =========================
   GET MY ORDERS
   ========================= */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

/* =========================
   ADMIN — GET ALL ORDERS
   ========================= */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
};

/* =========================
   GET ORDER BY ID
   ========================= */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

/* =========================
   ADMIN — MARK AS PAID
   ========================= */
const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Failed to update payment status" });
  }
};

/* =========================
   ADMIN — UPDATE STATUS
   ========================= */
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = req.body.status || order.status;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Failed to update order status" });
  }
};

/* =========================
   ADMIN — DELETE ORDER
   ========================= */
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.deleteOne();
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete order" });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderToPaid,
  updateOrderStatus,
  deleteOrder,
};
